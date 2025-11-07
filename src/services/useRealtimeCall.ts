// src/services/useRealtimeCall.ts
import { createVoiceSession, endVoiceSession } from "../services/openAIservice";

type StartOpts = {
  clientSecret?: string;
  sessionDeadlineMs?: number;
  onRemoteAudio?: (el: HTMLAudioElement, stream: MediaStream) => void;
  outputDeviceId?: string; // optional audio sink
};

export function useRealtimeCall() {
  let pc: RTCPeerConnection | null = null;
  let dc: RTCDataChannel | null = null;
  let localStream: MediaStream | null = null;
  let remoteAudioEl: HTMLAudioElement | null = null;
  let startedAt = 0;
  let statsTimer: number | null = null;

  const getElapsedSec = () =>
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;

  function speakOnce() {
    if (!dc || dc.readyState !== "open") return;
    const msg = {
      type: "response.create",
      response: {
        conversation: "default",
        instructions: "Say a short hello, one sentence.",
      },
    };
    try {
      dc.send(JSON.stringify(msg));
    } catch (e) {
      console.warn("[voice] dc send error:", e);
    }
  }

  function ensurePlaybackUnlocked() {
    if (!remoteAudioEl) return;
    const p = remoteAudioEl.play();
    if (p && typeof (p as any).then === "function") {
      p.catch(() => {
        const resume = () => {
          remoteAudioEl?.play().catch(() => {});
          window.removeEventListener("click", resume);
        };
        window.addEventListener("click", resume, { once: true });
      });
    }
  }

  function startStatsWatch() {
    if (!pc) return;
    let lastBytes = 0;
    let consecutiveSilent = 0;

    const tick = async () => {
      if (!pc) return;
      const recv = pc.getReceivers().find((r) => r.track && r.track.kind === "audio");
      if (!recv) {
        statsTimer = window.setTimeout(tick, 1000);
        return;
      }

      try {
        const report = await recv.getStats();
        let bytesNow = 0;
        report.forEach((s) => {
          if (s.type === "inbound-rtp" && (s as any).kind === "audio") {
            bytesNow += Number((s as any).bytesReceived || 0);
          }
        });
        const delta = Math.max(0, bytesNow - lastBytes);
        lastBytes = bytesNow;

        if (delta > 0) {
          consecutiveSilent = 0;
          ensurePlaybackUnlocked();
          console.log("[voice] inbound audio bytesΔ:", delta);
        } else {
          consecutiveSilent += 1;
          if (consecutiveSilent === 3) {
            console.log("[voice] silence detected, nudging response.create");
            speakOnce();
            ensurePlaybackUnlocked();
          }
        }
      } catch {}
      statsTimer = window.setTimeout(tick, 1000);
    };

    statsTimer = window.setTimeout(tick, 1000);
  }

  async function start(opts: StartOpts = {}) {
    // 1) Ephemeral secret
    let secret = opts.clientSecret;
    if (!secret) {
      const s = await createVoiceSession();
      secret = s.client_secret;
    }
    startedAt = Date.now();

    // 2) PeerConnection
    pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      bundlePolicy: "max-bundle",
    });

    pc.oniceconnectionstatechange = () =>
      console.log("[voice] ice:", pc?.iceConnectionState);
    pc.onconnectionstatechange = () => {
      console.log("[voice] pc:", pc?.connectionState);
      if (pc?.connectionState === "connected") {
        setTimeout(() => {
          speakOnce();
          ensurePlaybackUnlocked();
        }, 250);
      }
    };

    // 3) DataChannel BEFORE offer
    dc = pc.createDataChannel("oai-events");
    dc.onopen = () => {
      console.log("[voice] datachannel open");
      speakOnce();
    };
    dc.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev?.type) console.debug("[oai]", ev.type);
      } catch {}
    };
    dc.onerror = (e) => console.warn("[voice] dc error", e);
    dc.onclose = () => console.log("[voice] datachannel closed");

    // 4) Remote audio element (append once)
    remoteAudioEl = new Audio();
    remoteAudioEl.autoplay = true;
    remoteAudioEl.muted = false;
    remoteAudioEl.preload = "auto";
    remoteAudioEl.setAttribute("playsinline", "true");
    const host = document.getElementById("voice-audio-root");
    (host ?? document.body).appendChild(remoteAudioEl);

    // Optional sink routing
    if (opts.outputDeviceId && (remoteAudioEl as any).setSinkId) {
      try {
        await (remoteAudioEl as any).setSinkId(opts.outputDeviceId);
      } catch {}
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!remoteAudioEl) return;
      remoteAudioEl.srcObject = stream;
      ensurePlaybackUnlocked();
      opts.onRemoteAudio?.(remoteAudioEl, stream);
      console.log("[voice] remote track attached");
    };

    // 5) Mic
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    localStream = mic;

    // 6) Single bidirectional audio m-line, bind mic
    const tx = pc.addTransceiver("audio", { direction: "sendrecv" });
    await tx.sender.replaceTrack(mic.getAudioTracks()[0]);

    // Prefer Opus if supported
    try {
      const caps = RTCRtpSender.getCapabilities("audio");
      const opus = caps?.codecs?.find((c) => /opus/i.test(c.mimeType));
      if (opus) {
        const others = (caps?.codecs || []).filter((c) => c !== opus);
        tx.setCodecPreferences([opus, ...others]);
      }
    } catch {}

    // 7) Offer → wait ICE → POST → set answer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await new Promise<void>((resolve) => {
      if (!pc) return resolve();
      if (pc.iceGatheringState === "complete") return resolve();
      const onchg = () => {
        if (pc && pc.iceGatheringState === "complete") {
          pc.removeEventListener("icegatheringstatechange", onchg);
          resolve();
        }
      };
      pc.addEventListener("icegatheringstatechange", onchg);
      setTimeout(resolve, 1500);
    });

    const model =
      (import.meta as any).env.VITE_OPENAI_REALTIME_MODEL ||
      "gpt-4o-realtime-preview";
    const sdp = pc.localDescription?.sdp || offer.sdp || "";

    const resp = await fetch(
      `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1",
        },
        body: sdp,
      }
    );

    if (!resp.ok) {
      await stop(true);
      const details = await resp.text().catch(() => "");
      throw new Error(`realtime_sdp_error_${resp.status}: ${details}`);
    }

    const answer = await resp.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answer });
    console.log("[voice] remote description set; wait for connection and audio");

    // 8) Stats watcher
    startStatsWatch();
  }

  async function stop(isError = false) {
    if (statsTimer) {
      clearTimeout(statsTimer);
      statsTimer = null;
    }

    try {
      dc?.close();
    } catch {}
    dc = null;

    try {
      pc?.getSenders().forEach((s) => s.track?.stop());
    } catch {}
    try {
      localStream?.getTracks().forEach((t) => t.stop());
    } catch {}
    try {
      pc?.close();
    } catch {}
    pc = null;

    if (remoteAudioEl) {
      try {
        remoteAudioEl.pause();
      } catch {}
      try {
        remoteAudioEl.srcObject = null;
      } catch {}
      try {
        remoteAudioEl.parentElement?.removeChild(remoteAudioEl);
      } catch {}
    }
    remoteAudioEl = null;

    const secs = getElapsedSec();
    startedAt = 0;

    if (!isError && secs > 0) {
      try {
        await endVoiceSession(secs);
      } catch {}
    }
  }

  return { start, stop, getElapsedSec };
}
