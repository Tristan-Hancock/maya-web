// src/services/openAIservice.ts
import { fetchAuthSession } from "aws-amplify/auth";

// Flip this to true only while debugging prod verification.
// Or set VITE_DEBUG_CHAT=true in your env and use that instead.
const DEBUG_CHAT = true; // <-- set to false when you're done debugging

export async function sendMessage(
  content: string,
  threadId?: string
): Promise<{ threadId: string; message: string }> {
  // 1) Get Cognito ID token
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (!idToken) throw new Error("Not authenticated");

  // 2) Call backend (optionally with ?debug=1)
  const endpoint = DEBUG_CHAT ? "/api/chat?debug=1" : "/api/chat";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content }],
      threadId,
    }),
  });

  // Read the body ONCE
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore JSON parse error; we'll fall back to status text
  }

  // If in debug mode, just log what the server returned and stop here
  if (DEBUG_CHAT) {
    console.log("DEBUG VERIFY (server response):", data);
    // Prevent the rest of the UI flow so you can read the debug payload
    throw new Error("Debug stop (toggle DEBUG_CHAT=false when done)");
  }

  // 3) Handle errors cleanly
  if (!res.ok) {
    const err =
      (data && (data.error || data.reason)) ||
      res.statusText ||
      "Request failed";
    throw new Error(err);
  }

  // 4) Map response to your app’s expected shape
  return {
    threadId: (data && data.threadId) ?? threadId ?? "",
    message: (data && (data.message ?? data.text)) ?? "",
  };
}
