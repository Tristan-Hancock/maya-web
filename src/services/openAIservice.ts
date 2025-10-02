// src/services/openAIservice.ts
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://chlxllxu1m.execute-api.us-east-2.amazonaws.com/prod"; // fallback

export async function sendMessage(
  content: string,
  threadHandle?: string
): Promise<{ threadHandle: string; message: string; text?: string }> {
  // 1) Cognito ID token
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (!idToken) throw new Error("auth");

  // 2) Call API Gateway Lambda
  const res = await fetch(`${API_BASE}/api/chat`, { //remove api base later to route to local
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(
      threadHandle ? { content, threadHandle } : { content }
      // or use { messages:[{role:"user",content}], threadHandle } if you prefer
    ),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.reason ||
      `http_${res.status}`;
    if (res.status === 401) throw new Error("auth");
    if (res.status === 402) throw new Error("payment");
    if (res.status === 429) throw new Error("rate");
    throw new Error(msg);
  }

  return {
    threadHandle: data.threadHandle ?? threadHandle ?? "",
    message: data.message ?? data.text ?? "",
    text: data.text,
  };
}
