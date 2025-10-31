// src/services/openAIservice.ts
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = import.meta.env.VITE_API_BASE_STAGING as string; // e.g. https://.../stage

export type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

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
