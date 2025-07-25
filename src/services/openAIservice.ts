// // src/services/openAIservice.ts
// import OpenAI from "openai";
// import type { ChatMessage } from "../types";

// if (!process.env.OPENAI_API_KEY) {
//   throw new Error("OPENAI_API_KEY environment variable is not set.");
// }

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const systemMessage: ChatMessage = {
//   role: "system",
//   content: "You are Maya, a friendly and helpful AI assistant from Ovelia. Keep your responses concise and conversational.",
// };

// export const sendMessage = async (message: string) => {
//   try {
//     const stream = await openai.chat.completions.create({
//       model: "gpt-4o-mini", // or your preferred model
//       messages: [
//         systemMessage,
//         { role: "user", content: message },
//       ] as ChatMessage[],
//       stream: true,
//     });

//     return stream;  // async iterable of { choices: [ { delta: { content?: string } } ] }
//   } catch (error) {
//     console.error("Error sending message to OpenAI:", error);
//     throw new Error("Failed to get response from AI. Please check your connection or API key.");
//   }
// };
export async function sendMessage(content: string, threadId?: string) {
    const res = await fetch("/api/chat.ts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, threadId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ threadId: string; message: string }>;
  }
  