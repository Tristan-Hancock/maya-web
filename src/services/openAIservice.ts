// src/services/openAIservice.ts
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE =
  import.meta.env.VITE_API_BASE_STAGING ??//change to VITE_API_BASE_STAGING for staging endpoint and VITE_API_BASE for prod
  "https://chlxllxu1m.execute-api.us-east-2.amazonaws.com/prod";

export async function sendMessage(
  content: string,
  threadHandle?: string

): Promise<{ threadHandle: string; message: string; quota?: { remaining: number; reset_at: number } }> {
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (!idToken) throw new Error("auth");

  const res = await fetch(`${API_BASE}/test/api/chat`, { //change to /test/api/chat for staging endpoint and /api/chat for prod
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(

      threadHandle ? { messages: [{ role: "user", content }], threadHandle }
                   : { messages: [{ role: "user", content }] }
    ),
  });

  let data: any = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    if (res.status === 401) throw new Error("auth");
    if (res.status === 402) throw new Error("payment");
    if (res.status === 429 && data?.reset_at)
      throw new Error(`rate:${data.reset_at}`); // caller can parse and show ETA
    throw new Error(data?.error || data?.reason || `http_${res.status}`);
  }

  return {
    threadHandle: data.threadHandle ?? threadHandle ?? "",
    message: data.message ?? data.text ?? "",
    quota: data.quota ?? undefined,
  };
}
