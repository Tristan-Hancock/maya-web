// src/services/openAIservice.ts
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = import.meta.env.VITE_API_BASE as string; // e.g. https://.../stage

export type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

async function authHeader() {
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (!idToken) throw new Error("auth");
  return { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" };
}

/** Continue (or start) a chat */
export async function sendMessage(
  content: string,
  threadHandle?: string
): Promise<{ threadHandle: string; message: string }> {
  const headers = await authHeader();

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mode: "send",
      content,
      ...(threadHandle ? { threadHandle } : {}),
    }),
  });

  const data: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data?.error || data?.reason || `http_${res.status}`) as any;
    err.status = res.status;
    err.reason = data?.reason || data?.kind || null; // "thread_limit_reached" | "prompt_cap"
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
  const headers = await authHeader();
  const res = await fetch(`${API_BASE}/threads/chat/stage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ mode: "history", threadHandle, limit }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.reason || `http_${res.status}`);

  // Normalize to ChatMsg[]
  const arr = Array.isArray(data.messages) ? data.messages : [];
  return arr
    .map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      content: String(m.content ?? ""),
    }))
    .filter((m: ChatMsg) => !!m.content);
}
