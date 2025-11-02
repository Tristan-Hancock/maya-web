// src/services/openAIservice.ts
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = import.meta.env.VITE_API_BASE_STAGING as string; // e.g. https://.../stage

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

  const res = await fetch(`${API_BASE}/test/api/chat`, {
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
// Voice (Realtime) — new
// ========================================

export type VoiceSession = {
  client_secret: string;
  session_deadline_ms: number;
  max_minutes: number;
};

/** Start a voice session (mint OpenAI Realtime client_secret) */
export async function createVoiceSession(): Promise<VoiceSession> {
  const headers = await authHeaderJSON();
  const res = await fetch(`${API_BASE}/test/realtime/session`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const data: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 402 payloads include { error:"payment_required", kind:"voice_cap", reason:"..." , ... }
    const err = new Error(data?.error || data?.reason || `http_${res.status}`) as any;
    err.status = res.status;
    err.kind = data?.kind;
    err.reason = data?.reason;
    err.cap = data?.cap;
    err.used = data?.used;
    err.wait_ms = data?.wait_ms;
    throw err;
  }

  return {
    client_secret: data.client_secret,
    session_deadline_ms: data.session_deadline_ms,
    max_minutes: data.max_minutes,
  };
}

/** End a voice session and settle minutes (ceil to minute, capped by session max) */
export async function endVoiceSession(seconds: number): Promise<{ credited_minutes?: number }> {
  const headers = await authHeaderJSON();
  const res = await fetch(`${API_BASE}/test/realtime/end`, {
    method: "POST",
    headers,
    body: JSON.stringify({ seconds }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || data?.reason || `http_${res.status}`) as any;
    err.status = res.status;
    err.kind = data?.kind;
    throw err;
  }
  return { credited_minutes: data?.credited_minutes };
}
