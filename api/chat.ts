// api/chat.ts
import OpenAI from "openai";

export const config = { runtime: "edge" }; // optional, faster/cheaper

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const ASSISTANT_ID = process.env.ASSISTANT_ID!;

export default async function handler(req: Request) {
  try {
    const { threadId, content } = await req.json() as { threadId?: string; content: string };

    // 1. Ensure a thread
    let tid = threadId;
    if (!tid) {
      const thread = await openai.beta.threads.create();
      tid = thread.id;
    }

    // 2. Add the user message
    await openai.beta.threads.messages.create(tid, {
      role: "user",
      content,
    });

    // 3. Run the assistant
    const run = await openai.beta.threads.runs.create(tid, {
      assistant_id: ASSISTANT_ID,
    });

    // 4. Poll for completion (simple, no streaming)
    let status = run.status;
    while (status === "queued" || status === "in_progress") {
      await new Promise(r => setTimeout(r, 800));
      const r2 = await openai.beta.threads.runs.retrieve(run.id, { thread_id: tid });
      status = r2.status;
      if (status === "requires_action") {
        // handle tool-calls here if you enabled tools
      }
      if (status === "failed" || status === "expired" || status === "cancelled") {
        return new Response(JSON.stringify({ error: `Run ${status}` }), { status: 500 });
      }
    }

    // 5. Grab the latest assistant message
    const list = await openai.beta.threads.messages.list(tid, { order: "desc", limit: 5 });
    const assistantMsg = list.data.find(m => m.role === "assistant");
    const text =
      assistantMsg?.content
        ?.map(c => ("text" in c ? c.text.value : ""))
        .join("\n") ?? "";

    return new Response(JSON.stringify({ threadId: tid, message: text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), { status: 500 });
  }
}
