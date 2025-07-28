// api/chat.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import OpenAI from "openai";

export const config = { runtime: "edge" }; // optional, faster/cheaper

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    Number(process.env.RATE_LIMIT_REQUESTS) || 5,
    `${Number(process.env.RATE_LIMIT_WINDOW) || 60} s`
  ),
  analytics: true,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const ASSISTANT_ID = process.env.ASSISTANT_ID!;

export default async function handler(req: Request) {
  try {
    const { threadId, content } = await req.json() as { threadId?: string; content: string };

    //checking content lenth , reduce tokens required based on lentgth
    if (typeof content !== "string" || content.length === 0 || content.length > 900) {
      return new Response(
        JSON.stringify({ error: "Invalid message length (1–2000 chars)." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
//adding rate limiting here
const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const { success } = await ratelimit.limit(`chat:${ip}`);


if (!success) {
  return new Response(
    JSON.stringify({ error: "Too many requests, slow down." }),
    { status: 429, headers: { "Content-Type": "application/json" } }
  );    }


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
