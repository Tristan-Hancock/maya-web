// src/services/openAIservice.ts
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = import.meta.env.VITE_API_BASE as string; // e.g. https://.../stage

export type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

// -------- Auth helpers --------
async function authHeaderJSON() {
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (!idToken) throw new Error("auth");
  return { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" };
}
async function authHeaderAuthOnly() {
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (!idToken) throw new Error("auth");
  return { Authorization: `Bearer ${idToken}` }; // let browser set multipart boundary
}

// ========================================
// Chat (text + docs)
// ========================================

/** Continue (or start) a chat with text */
export async function sendMessage(
  content: string,
  threadHandle?: string
): Promise<{ threadHandle: string; message: string }> {
  const headers = await authHeaderJSON();

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mode: "send", // ignored by backend, harmless
      content,
      ...(threadHandle ? { threadHandle } : {}),
    }),
  });

  const data: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data?.error || data?.reason || `http_${res.status}`) as any;
    err.status = res.status;
    err.reason = data?.reason || data?.kind || null;
    err.cap = data?.cap;
    err.used = data?.used;
    throw err;
  }

  return {
    threadHandle: data.threadHandle ?? threadHandle ?? "",
    message: data.message ?? data.text ?? "",
  };
}

/** Send a document + optional userMessage via multipart/form-data */
export async function sendDocument(
  file: File,
  userMessage: string,
  threadHandle?: string
): Promise<{ threadHandle: string; message: string }> {
  const headers = await authHeaderAuthOnly();

  const fd = new FormData();
  fd.append("file", file, file.name);
  if (userMessage?.trim()) fd.append("userMessage", userMessage.trim());
  if (threadHandle) fd.append("threadHandle", threadHandle);

  const res = await fetch(`${API_BASE}/test/api/chat`, {
    method: "POST",
    headers, // no manual Content-Type
    body: fd,
  });

  const data: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data?.error || data?.reason || `http_${res.status}`) as any;
    err.status = res.status;
    err.reason = data?.reason || data?.kind || null; // e.g., "doc_cap", "thread_limit_reached"
    err.cap = data?.cap;
    err.used = data?.used;
    throw err;
  }

  return {
    threadHandle: data.threadHandle ?? threadHandle ?? "",
    message: data.message ?? data.text ?? "",
  };
}

/** Load history for a thread */
export async function fetchThreadHistory(
  threadHandle: string,
  limit = 50
): Promise<ChatMsg[]> {
  const headers = await authHeaderJSON();
  const res = await fetch(`${API_BASE}/threads/chat/stage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ mode: "history", threadHandle, limit }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.reason || `http_${res.status}`);

  const arr = Array.isArray(data.messages) ? data.messages : [];
  return arr
    .map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      content: String(m.content ?? ""),
    }))
    .filter((m: ChatMsg) => !!m.content);
}

// ========================================
// Voice (Realtime) → /test/realtime/session, /test/realtime/end
// ========================================

export type VoiceSession = {
  client_secret: string;
  session_deadline_ms: number;
  session_started_ms?: number;
  cap_minutes?: number;
  per_call_cap_minutes?: number;
  wait_minutes?: number;
  used_minutes?: number;
  model?: string;
  vad?: string;
};

export async function createVoiceSession(): Promise<VoiceSession> {
  const headers = await authHeaderJSON();
  const res = await fetch(`${API_BASE}/test/realtime/session`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || data?.reason || `http_${res.status}`) as any;
    err.status = res.status;
    err.kind = data?.kind;
    err.reason = data?.reason;
    err.cap = data?.cap;
    err.used = data?.used;
    throw err;
  }
  return {
    client_secret: String(data.client_secret),
    session_deadline_ms: Number.isFinite(data.session_deadline_ms) ? Number(data.session_deadline_ms) : 0,
    session_started_ms: Number.isFinite(data.session_started_ms) ? Number(data.session_started_ms) : undefined,
    cap_minutes: Number(data.cap_minutes ?? 0),
    per_call_cap_minutes: Number(data.per_call_cap_minutes ?? 0),
    wait_minutes: Number(data.wait_minutes ?? 0),
    used_minutes: Number(data.used_minutes ?? 0),
    model: data.model,
    vad: data.vad,
  };
}

export async function endVoiceSession(seconds: number): Promise<{ billed_seconds?: number; total_minutes_used?: number }> {
  const headers = await authHeaderJSON();
  const res = await fetch(`${API_BASE}/test/realtime/end`, {
    method: "POST",
    headers,
    body: JSON.stringify({ elapsedSec: seconds }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || data?.reason || `http_${res.status}`) as any;
    err.status = res.status;
    err.kind = data?.kind;
    throw err;
  }
  return { billed_seconds: data?.billed_seconds, total_minutes_used: data?.total_minutes_used };
}

export async function voicePreflight(): Promise<VoiceSession> {
  return createVoiceSession();
}