// src/voice/useRealtimeCall.ts
import { createVoiceSession, endVoiceSession } from "../services/openAIservice";

type StartOpts = { onRemoteAudio?: (el: HTMLAudioElement) => void };

export function useRealtimeCall() {
  let pc: RTCPeerConnection | null = null;
  let localStream: MediaStream | null = null;
  let remoteAudioEl: HTMLAudioElement | null = null;
  let startedAt = 0;

  const getElapsedSec = () =>
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;

  async function start(opts: StartOpts = {}) {
    // 1) Mint ephemeral client secret from your backend (also enforces limits)
    const { client_secret } = await createVoiceSession(); // throws 402 with reason if blocked
    startedAt = Date.now();

    // 2) Build WebRTC peer connection
    pc = new RTCPeerConnection();

    // 3) Remote audio sink
    remoteAudioEl = new Audio();
    remoteAudioEl.autoplay = true;
    pc.ontrack = (event) => {
      if (!remoteAudioEl) return;
      const [stream] = event.streams;
      remoteAudioEl.srcObject = stream;
      opts.onRemoteAudio?.(remoteAudioEl);
    };

    // 4) Local mic
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    localStream.getTracks().forEach((t) => pc!.addTrack(t, localStream!));

    // 5) We both send and receive audio
    pc.addTransceiver("audio", { direction: "sendrecv" });

    // 6) Create offer -> send to OpenAI Realtime -> set answer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const model = import.meta.env.VITE_OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview";
    const resp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${client_secret}`,
        "Content-Type": "application/sdp",
        "OpenAI-Beta": "realtime=v1",
      },
      body: offer.sdp,
    });

    if (!resp.ok) {
      await stop(true);
      const details = await resp.text().catch(() => "");
      throw new Error(`realtime_sdp_error_${resp.status}: ${details}`);
    }

    const answer = await resp.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answer });
  }

  async function stop(isError = false) {
    // Close PC + mic
    try { pc?.getSenders().forEach(s => s.track?.stop()); } catch {}
    try { localStream?.getTracks().forEach(t => t.stop()); } catch {}
    try { pc?.close(); } catch {}
    pc = null;

    const secs = getElapsedSec();
    startedAt = 0;

    // Tell backend to settle minutes (unless we errored before starting)
    if (!isError && secs > 0) {
      try { await endVoiceSession(secs); } catch {}
    }
  }

  return { start, stop, getElapsedSec };
}
