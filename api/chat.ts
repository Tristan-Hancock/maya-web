// api/chat.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import OpenAI from "openai";
import * as jose from "jose";

export const config = { runtime: "edge" }; // Edge = fast & cheap

// --- ENV ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ASSISTANT_ID = process.env.ASSISTANT_ID!;
const COGNITO_REGION = process.env.COGNITO_REGION!;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

// --- Clients ---
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ⛔️ LEAVING YOUR RATE LIMIT CODE UNCHANGED
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    Number(process.env.RATE_LIMIT_REQUESTS) || 5,
    `${Number(process.env.RATE_LIMIT_WINDOW) || 60} s`
  ),
  analytics: true,
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// JWKS for Cognito (Edge-safe)
const jwks = jose.createRemoteJWKSet(
  new URL(
    `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`
  )
);

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // 1) Verify Cognito JWT (require auth)
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return json({ error: "Missing bearer token" }, 401);

    let userId = "anon";
    try {
      const { payload } = await jose.jwtVerify(token, jwks, {
        algorithms: ["RS256"],
        issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
      });
      userId = String(payload.sub || "anon");
    } catch {
      return json({ error: "Invalid token" }, 401);
    }

    // 2) Parse body safely with type guards
    type BodyWithContent = { threadId?: string; content: string };
    type BodyWithMessages = {
      threadId?: string;
      messages: Array<{ role: string; content: string }>;
    };

    function hasMessages(b: any): b is BodyWithMessages {
      return b && Array.isArray(b.messages);
    }
    function hasContent(b: any): b is BodyWithContent {
      return b && typeof b.content === "string";
    }

    const bodyUnknown = await req.json();
    let content = "";
    let threadId: string | undefined;

    if (hasMessages(bodyUnknown)) {
      content =
        bodyUnknown.messages.find((m) => m.role === "user")?.content?.trim() || "";
      threadId = bodyUnknown.threadId;
    } else if (hasContent(bodyUnknown)) {
      content = bodyUnknown.content.trim();
      threadId = bodyUnknown.threadId;
    } else {
      return json(
        { error: "Invalid body. Expect {content,threadId?} or {messages[],threadId?}." },
        400
      );
    }

    // 3) Validate length
    if (typeof content !== "string" || content.length === 0 || content.length > 900) {
      return json({ error: "Invalid message length (1–900 chars)." }, 400);
    }

    // 4) Rate limiting (unchanged)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const { success } = await ratelimit.limit(`chat:${ip}`);
    if (!success) {
      return json({ error: "Too many requests, slow down." }, 429);
    }

    // 5) Ensure a thread
    let tid = threadId;
    if (!tid) {
      const thread = await openai.beta.threads.create();
      tid = thread.id;
    }

    // 6) Add the user message
    await openai.beta.threads.messages.create(tid, {
      role: "user",
      content,
    });

    // 7) Run the assistant
    const run = await openai.beta.threads.runs.create(tid, {
      assistant_id: ASSISTANT_ID,
      metadata: { userId },
    });

    // 8) Poll for completion
    let status = run.status;
    const started = Date.now();
    while (status === "queued" || status === "in_progress") {
      if (Date.now() - started > 30_000) {
        return json({ error: "Run timeout" }, 504);
      }
      await wait(800);
      const r2 = await openai.beta.threads.runs.retrieve(run.id, { thread_id: tid });
      status = r2.status;
      if (status === "requires_action") {
        // handle tool-calls if you enable tools
      }
      if (status === "failed" || status === "expired" || status === "cancelled") {
        return json({ error: `Run ${status}` }, 500);
      }
    }

    // 9) Grab the assistant message
    const list = await openai.beta.threads.messages.list(tid, {
      order: "desc",
      limit: 5,
    });
    const assistantMsg = list.data.find((m) => m.role === "assistant");
    const text =
      assistantMsg?.content
        ?.map((c) => (("text" in c && (c as any).text?.value) ? (c as any).text.value : ""))
        .join("\n") ?? "";

    return json({ threadId: tid, message: text });
  } catch (err: any) {
    console.error(err);
    return json({ error: err.message || "Unknown error" }, 500);
  }
}


// --- helpers ---
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function wait(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
