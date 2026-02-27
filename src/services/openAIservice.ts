// src/services/openAIservice.ts
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchWithTimeout } from "../utils/network";
import { isAuthStatus, isLikelyAuthError, notifyAuthLost } from "../utils/authRecovery";

const API_BASE = import.meta.env.VITE_API_BASE_STAGING as string; // e.g. https://.../prod
const API_TIMEOUT_MS = 12000;

export type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

// -------- Auth helpers --------
async function getAuthHeaders(authOnly: boolean, forceRefresh = false) {
  try {
    const { tokens } = await fetchAuthSession(forceRefresh ? { forceRefresh: true } : undefined);
    const idToken = tokens?.idToken?.toString();
    if (!idToken) throw new Error("auth");
    if (authOnly) {
      return { Authorization: `Bearer ${idToken}` };
    }
    return { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" };
  } catch (e) {
    if (isLikelyAuthError(e)) {
      notifyAuthLost("openai_service_headers");
    }
    throw e;
  }
}

async function fetchAuthed(
  url: string,
  init: RequestInit,
  authOnly: boolean
): Promise<Response> {
  const withHeaders = async (forceRefresh: boolean) => {
    const merged = new Headers(init.headers ?? undefined);
    const authHeaders = await getAuthHeaders(authOnly, forceRefresh);
    Object.entries(authHeaders).forEach(([k, v]) => merged.set(k, v));
    return fetchWithTimeout(url, { ...init, headers: merged, cache: "no-store" }, API_TIMEOUT_MS);
  };

  let res = await withHeaders(false);
  if (isAuthStatus(res.status)) {
    res = await withHeaders(true);
  }
  return res;
}

function toApiError(data: any, status: number, fallback: string, source: string) {
  const err = new Error(data?.error || data?.reason || fallback) as any;
  err.status = status;
  err.reason = data?.reason || data?.kind || data?.error || null;
  err.kind = data?.kind || null;
  err.cap = data?.cap;
  err.used = data?.used;
  if (isLikelyAuthError(err)) {
    notifyAuthLost(source);
  }
  return err;
}

// ========================================
// Chat (text + docs)
// ========================================

/** Continue (or start) a chat with text */
export async function sendMessage(
  content: string,
  threadHandle?: string
): Promise<{ threadHandle: string; message: string }> {
  const res = await fetchAuthed(`${API_BASE}/test/api/chat`, {
    method: "POST",
    body: JSON.stringify({
      mode: "send", // ignored by backend, harmless
      content,
      ...(threadHandle ? { threadHandle } : {}),
    }),
  }, false);

  const data: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw toApiError(data, res.status, `http_${res.status}`, "send_message");
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
  threadHandle?: string,
  chatContext?: { role: "user" | "assistant" | "system"; content: string }[]
): Promise<{ threadHandle: string; message: string }> {
  const fd = new FormData();
  fd.append("file", file, file.name);
  
  if (userMessage?.trim()) {
    fd.append("userMessage", userMessage.trim());
  }
  
  if (threadHandle) {
    fd.append("threadHandle", threadHandle);
  }
  
  // 🔹 Send summarized context source
  if (chatContext && Array.isArray(chatContext)) {
    fd.append("chatContext", JSON.stringify(chatContext));
  }
  
  const res = await fetchAuthed(`${API_BASE}/test/api/chat`, {
    method: "POST",
    body: fd,
  }, true);

  const data: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw toApiError(data, res.status, `http_${res.status}`, "send_document");
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
  const res = await fetchAuthed(`${API_BASE}/threads/chat/prod`, {
    method: "POST",
    body: JSON.stringify({ mode: "history", threadHandle, limit }),
  }, false);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw toApiError(data, res.status, `http_${res.status}`, "thread_history");

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
  const res = await fetchAuthed(`${API_BASE}/test/realtime/session`, {
    method: "POST",
    body: "{}",
  }, false);
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw toApiError(data, res.status, `http_${res.status}`, "voice_session");
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
  const res = await fetchAuthed(`${API_BASE}/test/realtime/end`, {
    method: "POST",
    body: JSON.stringify({ elapsedSec: seconds }),
  }, false);
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw toApiError(data, res.status, `http_${res.status}`, "voice_end");
  }
  return { billed_seconds: data?.billed_seconds, total_minutes_used: data?.total_minutes_used };
}

export async function voicePreflight(): Promise<VoiceSession> {
  return createVoiceSession();
}
