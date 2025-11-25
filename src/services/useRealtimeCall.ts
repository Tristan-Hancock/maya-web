import { createVoiceSession } from "../services/openAIservice";

export type StartOpts = {
  clientSecret?: string;
  sessionDeadlineMs?: number;
  sessionStartedMs?: number;
  onRemoteAudio?: (el: HTMLAudioElement, stream: MediaStream) => void;
  outputDeviceId?: string;
  model?: string;
  simulate?: boolean;
  perCallMs?: number; // optional explicit fallback in ms
  onAutoEnd?: (elapsedSec: number) => Promise<void> | void; // called when hook auto-ends due to deadline
};

export function useRealtimeCall() {
  let pc: RTCPeerConnection | null = null;
  let dc: RTCDataChannel | null = null;
  let localStream: MediaStream | null = null;
  let remoteAudioEl: HTMLAudioElement | null = null;
  let startedAt = 0;
  let statsTimer: number | null = null;
  let autoEndTimer: number | null = null;

  const getElapsedSec = (): number =>
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;

  function clearAutoEndTimer() {
    if (autoEndTimer !== null) {
      clearTimeout(autoEndTimer);
      autoEndTimer = null;
    }
  }

  function scheduleAutoEnd(opts: StartOpts) {
    clearAutoEndTimer();

    // compute ms until deadline
    const now = Date.now();
    const serverDeadline = typeof opts.sessionDeadlineMs === "number" ? Number(opts.sessionDeadlineMs) : 0;
    // prefer explicit perCall fallback if provided, else 2 minutes
    const fallbackPerCallMs = typeof opts.perCallMs === "number" ? Math.max(1000, opts.perCallMs) : 2 * 60 * 1000;

    let ms = 0;
    if (serverDeadline && serverDeadline > now) {
      ms = Math.max(0, serverDeadline - now + 50); // small buffer
    } else {
      ms = fallbackPerCallMs;
    }

    // schedule timer
    autoEndTimer = window.setTimeout(async () => {
      // auto tear down local resources
      try {
        const secs = getElapsedSec();
        try {
          await stop(); // stop tears down and returns elapsed secs (but here we ignore return)
        } catch (e) {
          // ignore
        }

        // call back into consumer so it can call /voice/end exactly once
        try {
          await opts.onAutoEnd?.(secs);
        } catch (e) {
          // swallow consumer errors
          // eslint-disable-next-line no-console
          console.warn("[voice] onAutoEnd handler error", e);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[voice] auto-end stop failed", e);
      } finally {
        clearAutoEndTimer();
      }
    }, ms);
  }

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
      // keep non-fatal
      // eslint-disable-next-line no-console
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
          // eslint-disable-next-line no-console
          console.log("[voice] inbound audio bytesΔ:", delta);
        } else {
          consecutiveSilent += 1;
          if (consecutiveSilent === 3) {
            // eslint-disable-next-line no-console
            console.log("[voice] silence detected, nudging response.create");
            speakOnce();
            ensurePlaybackUnlocked();
          }
        }
      } catch {
        // swallow stat errors
      }
      statsTimer = window.setTimeout(tick, 1000);
    };

    statsTimer = window.setTimeout(tick, 1000);
  }

  /**
   * Start a realtime call.
   * - If opts.clientSecret not supplied, this calls createVoiceSession()
   * - Uses opts.sessionStartedMs for accurate elapsed accounting when present and recent
   * - Supports simulation when opts.simulate === true OR VITE_SIMULATE_VOICE is "true"
   */
  async function start(opts: StartOpts = {}): Promise<void> {
    // Acquire ephemeral secret if not provided. If we call createVoiceSession()
    // internally we capture the session object and use its session_started_ms /
    // session_deadline_ms when available so timers align to server policy.
    let secret = opts.clientSecret;
    let internalSess: any = null;
    if (!secret) {
      internalSess = await createVoiceSession();
      if (internalSess && internalSess.client_secret) {
        secret =
          typeof internalSess.client_secret === "string"
            ? internalSess.client_secret
            : internalSess.client_secret?.value ?? undefined;
      }
      // If server gave us a start time or deadline, let them be used as defaults
      if (typeof internalSess?.session_started_ms === "number" && Math.abs(internalSess.session_started_ms - Date.now()) < 120_000) {
        startedAt = Number(internalSess.session_started_ms);
      } else {
        startedAt = Date.now();
      }
      // merge server deadline into opts for scheduleAutoEnd() fallback
      if (typeof internalSess?.session_deadline_ms === "number") {
        // mutate a local copy, not the caller's object
        opts = { ...opts, sessionDeadlineMs: Number(internalSess.session_deadline_ms) };
      }
      // also if server provided session_started_ms but it's slightly skewed, prefer it
      if (typeof internalSess?.session_started_ms === "number") {
        opts = { ...opts, sessionStartedMs: Number(internalSess.session_started_ms) };
      }
    } else {
      // Use server-provided start time if available and within a reasonable skew (2 minutes)
      const serverStart = opts.sessionStartedMs;
      if (typeof serverStart === "number" && Math.abs(serverStart - Date.now()) < 120_000) {
        startedAt = serverStart;
      } else {
        startedAt = Date.now();
      }
    }

    // Create PeerConnection
    pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      bundlePolicy: "max-bundle",
    });

    pc.oniceconnectionstatechange = () => {
      // eslint-disable-next-line no-console
      console.log("[voice] ice:", pc?.iceConnectionState);
    };
    pc.onconnectionstatechange = () => {
      // eslint-disable-next-line no-console
      console.log("[voice] pc:", pc?.connectionState);
      if (pc?.connectionState === "connected") {
        setTimeout(() => {
          speakOnce();
          ensurePlaybackUnlocked();
        }, 250);
      }
    };

    // Data channel before offer
    dc = pc.createDataChannel("oai-events");
    dc.onopen = () => {
      // eslint-disable-next-line no-console
      console.log("[voice] datachannel open");
      speakOnce();
    };
    dc.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev?.type) {
          // eslint-disable-next-line no-console
          console.debug("[oai]", ev.type);
        }
      } catch {
        // ignore
      }
    };
    dc.onerror = (e) => {
      // eslint-disable-next-line no-console
      console.warn("[voice] dc error", e);
    };
    dc.onclose = async () => {
      // eslint-disable-next-line no-console
      console.log("[voice] datachannel closed");

      // Clear any existing auto-end timer so we don't double-fire
      clearAutoEndTimer();

      // Attempt to stop local resources and then notify consumer via onAutoEnd
      try {
        const secs = getElapsedSec();
        // stop local resources (ignore errors)
        try { await stop(); } catch (e) { /* ignore */ }

        // Notify parent/hook that the session ended so it can call /voice/end
        try {
          await opts.onAutoEnd?.(secs);
        } catch (e) {
          // swallow consumer errors
          // eslint-disable-next-line no-console
          console.warn("[voice] onAutoEnd handler error from dc.onclose", e);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[voice] dc.onclose handling failed", e);
      } finally {
        clearAutoEndTimer();
      }
    };


    // Remote audio element
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
      } catch {
        // ignore
      }
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!remoteAudioEl) return;
      remoteAudioEl.srcObject = stream;
      ensurePlaybackUnlocked();
      opts.onRemoteAudio?.(remoteAudioEl as HTMLAudioElement, stream);
      // eslint-disable-next-line no-console
      console.log("[voice] remote track attached");
    };

    // Get mic
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    localStream = mic;

    // Add transceiver and replace track
    const tx = pc.addTransceiver("audio", { direction: "sendrecv" });
    await tx.sender.replaceTrack(mic.getAudioTracks()[0]);

    // Prefer Opus if available
    try {
      const caps = (RTCRtpSender as any).getCapabilities?.("audio");
      const opus = caps?.codecs?.find((c: any) => /opus/i.test(c.mimeType));
      if (opus) {
        const others = (caps?.codecs || []).filter((c: any) => c !== opus);
        tx.setCodecPreferences([opus, ...others]);
      }
    } catch {
      // ignore
    }

    // Offer -> wait for ICE
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

    const model = opts.model || (import.meta as any).env.VITE_OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview";
    const sdp = pc.localDescription?.sdp || offer.sdp || "";

    // Decide simulation: opts.simulate OR env var OR 'simulated' secret
    const simulateFlag = Boolean(opts.simulate) || String((import.meta as any).env.VITE_SIMULATE_VOICE).toLowerCase() === "true";
    const simulatedSecret = String(secret ?? "").startsWith("simulated");

    if (simulateFlag || simulatedSecret) {
      // Simulation path: do not POST SDP to OpenAI
      // eslint-disable-next-line no-console
      console.log("[voice] simulation mode - skipping realtime SDP POST");

      setTimeout(() => {
        try {
          speakOnce();
        } catch {
          // ignore
        }
        ensurePlaybackUnlocked();
      }, 250);

      // start stats and schedule auto-end callback so parent receives auto-end as well
      startStatsWatch();
      scheduleAutoEnd(opts);
      return;
    }

    // Normal path: POST SDP to OpenAI realtime endpoint
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
      // cleanup local resources
      try {
        await stop();
      } catch {}
      const details = await resp.text().catch(() => "");
      throw new Error(`realtime_sdp_error_${resp.status}: ${details}`);
    }

    const answer = await resp.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answer });
    // eslint-disable-next-line no-console
    console.log("[voice] remote description set; wait for connection and audio");

    // start stats watcher and schedule auto-end using the merged opts that may
    // include server-provided sessionDeadlineMs/sessionStartedMs (if the hook
    // called createVoiceSession internally).
    startStatsWatch();
    scheduleAutoEnd(opts);
  }

  /**
   * stop()
   * - cleans up local resources and returns the elapsed seconds
   * - caller is responsible for calling the backend /voice/end exactly once
   */
  async function stop(): Promise<number> {
    clearAutoEndTimer();

    if (statsTimer) {
      clearTimeout(statsTimer);
      statsTimer = null;
    }

    try {
      dc?.close();
    } catch {
      // ignore
    }
    dc = null;

    try {
      pc?.getSenders().forEach((s) => s.track?.stop());
    } catch {
      // ignore
    }
    try {
      localStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    try {
      pc?.close();
    } catch {
      // ignore
    }
    pc = null;

    if (remoteAudioEl) {
      try {
        remoteAudioEl.pause();
      } catch {
        // ignore
      }
      try {
        remoteAudioEl.srcObject = null;
      } catch {
        // ignore
      }
      try {
        remoteAudioEl.parentElement?.removeChild(remoteAudioEl);
      } catch {
        // ignore
      }
    }
    remoteAudioEl = null;

    const secs = getElapsedSec();
    startedAt = 0;

    // Mark localStream as used (satisfy TS linter if needed)
    if (localStream) {
      void localStream;
    }

    return secs;
  }

  return { start, stop, getElapsedSec };
}
