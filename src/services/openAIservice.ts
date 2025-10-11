// src/services/openAIservice.ts
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = import.meta.env.VITE_API_BASE_STAGING as string; // e.g. https://.../stage

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
  const res = await fetch(`${API_BASE}/test/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mode: "send",
      content,
      ...(threadHandle ? { threadHandle } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.reason || `http_${res.status}`);

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
