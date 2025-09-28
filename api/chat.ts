// // api/chat.ts
// import { Ratelimit } from "@upstash/ratelimit";
// import { Redis } from "@upstash/redis";
// import OpenAI from "openai";
// import * as jose from "jose";

// export const config = { runtime: "edge" }; // Edge = fast & cheap

// // --- ENV ---
// const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
// const ASSISTANT_ID = process.env.ASSISTANT_ID!;
// const COGNITO_REGION = process.env.COGNITO_REGION!;
// const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
// const JWKS_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

// // --- Clients ---
// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL!,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
// });

// // ⛔️ LEAVING YOUR RATE LIMIT CODE UNCHANGED
// const ratelimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(
//     Number(process.env.RATE_LIMIT_REQUESTS) || 5,
//     `${Number(process.env.RATE_LIMIT_WINDOW) || 60} s`
//   ),
//   analytics: true,
// });

// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// // JWKS for Cognito (Edge-safe)
// const jwks = jose.createRemoteJWKSet(
//   new URL(
//     `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`
//   )
// );
// async function cognitoKeyFunction(header: jose.JWSHeaderParameters): Promise<jose.JWK> {
//   const res = await fetch(JWKS_URL, { cache: "no-store" }); // avoid sticky caches while debugging
//   if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
//   const { keys } = (await res.json()) as { keys: jose.JWK[] };
//   const jwk = keys.find((k) => k.kid === header.kid);
//   if (!jwk) throw new Error("No matching JWK (kid) in Cognito JWKS");
//   // Optional strictness: ensure RSA & RS256
//   if (jwk.kty !== "RSA") throw new Error(`Unexpected kty: ${jwk.kty}`);
//   // alg may be absent in Cognito keys; it's fine if missing
//   return jwk;
// }
// export default async function handler(req: Request) {
//   // 0) Block non-POST quickly (helps if a redirect turns your POST into GET)
//   if (req.method !== "POST") {
//     return json({ error: "Method not allowed", method: req.method }, 405);
//   }

//   try {
//     // 1) Verify Cognito JWT (require auth)
//     const auth = req.headers.get("authorization") || "";
//     const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
//     if (!token) return json({ error: "Missing bearer token" }, 401);

// // --- Debugging: only when ?debug=1 ---
// const url = new URL(req.url);
// const debug = url.searchParams.get("debug") === "1";
// if (debug) {
//   const decoded: any = (() => { try { return jose.decodeJwt(token); } catch { return null; } })();
//   const expectedIssuer = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
//   // Try a real verify, but do NOT continue; just report the result
//   try {
//     await jose.jwtVerify(token, jwks, {
//       algorithms: ["RS256"],
//       issuer: expectedIssuer,
//       // audience: process.env.COGNITO_APP_CLIENT_ID, // uncomment to assert aud if needed
//     });
//     return json({
//       debug: true,
//       verify: "ok",
//       expectedIssuer,
//       tokenIssuer: decoded?.iss,
//       tokenUse: decoded?.token_use,
//       // aud: decoded?.aud,
//     });
//   } catch (e: any) {
//     return json({
//       debug: true,
//       verify: "fail",
//       reason: e?.message || String(e),
//       expectedIssuer,
//       tokenIssuer: decoded?.iss,
//       tokenUse: decoded?.token_use,
//       // aud: decoded?.aud,
//     }, 401);
//   }
// }
// // --- end debug gate ---


// let userId = "anon";
// try {
//   const { payload } = await jose.jwtVerify(token, cognitoKeyFunction, {
//     algorithms: ["RS256"],
//     issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
//     clockTolerance: 5, // small skew tolerance helps in prod
//     // audience: process.env.COGNITO_APP_CLIENT_ID, // uncomment if you want to enforce aud
//   });
//   userId = String(payload.sub || "anon");
// } catch (e: any) {
//   return json({ error: "Invalid token", reason: e?.message || "verify failed" }, 401);
// }

//     // 2) Robust body parsing (handles empty body & invalid JSON)
//     const raw = await req.text();
//     if (!raw) return json({ error: "Empty body" }, 400);

//     let bodyUnknown: any;
//     try {
//       bodyUnknown = JSON.parse(raw);
//     } catch {
//       return json({ error: "Invalid JSON" }, 400);
//     }

//     // support { content, threadId } OR { messages:[...], threadId }
//     type BodyWithContent = { threadId?: string; content: string };
//     type BodyWithMessages = { threadId?: string; messages: Array<{ role: string; content: string }> };
//     const hasMessages = (b: any): b is BodyWithMessages => b && Array.isArray(b.messages);
//     const hasContent  = (b: any): b is BodyWithContent  => b && typeof b.content === "string";

//     let content = "";
//     let threadId: string | undefined;

//     if (hasMessages(bodyUnknown)) {
//       content = bodyUnknown.messages.find((m) => m.role === "user")?.content?.trim() || "";
//       threadId = bodyUnknown.threadId;
//     } else if (hasContent(bodyUnknown)) {
//       content = bodyUnknown.content.trim();
//       threadId = bodyUnknown.threadId;
//     } else {
//       return json({ error: "Invalid body. Expect {content,threadId?} or {messages[],threadId?}." }, 400);
//     }

//     // 3) Validate length
//     if (content.length === 0 || content.length > 900) {
//       return json({ error: "Invalid message length (1–900 chars)." }, 400);
//     }

//     // 4) Rate limiting (unchanged; non-fatal if Upstash fails)
//     const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
//     try {
//       const { success } = await ratelimit.limit(`chat:${ip}`);
//       if (!success) return json({ error: "Too many requests, slow down." }, 429);
//     } catch (e: any) {
//       console.warn("Rate limit skipped (Upstash error):", e?.message || e);
//     }

//     // 5) Ensure a thread
//     let tid = threadId;
//     if (!tid) {
//       const thread = await openai.beta.threads.create();
//       tid = thread.id;
//     }

//     // 6) Add the user message
//     await openai.beta.threads.messages.create(tid, { role: "user", content });

//     // 7) Run the assistant
//     const run = await openai.beta.threads.runs.create(tid, {
//       assistant_id: ASSISTANT_ID,
//       metadata: { userId },
//     });

//     // 8) Poll for completion
//     let status = run.status;
//     const started = Date.now();
//     while (status === "queued" || status === "in_progress") {
//       if (Date.now() - started > 30_000) return json({ error: "Run timeout" }, 504);
//       await wait(800);
//       const r2 = await openai.beta.threads.runs.retrieve(run.id, { thread_id: tid });
//       status = r2.status;
//       if (status === "failed" || status === "expired" || status === "cancelled") {
//         return json({ error: `Run ${status}` }, 500);
//       }
//     }

//     // 9) Grab the assistant message
//     const list = await openai.beta.threads.messages.list(tid, { order: "desc", limit: 5 });
//     const assistantMsg = list.data.find((m) => m.role === "assistant");
//     const text =
//       assistantMsg?.content?.map((c) => (("text" in c && (c as any).text?.value) ? (c as any).text.value : "")).join("\n") ?? "";

//     return json({ threadId: tid, message: text, text }); // include both keys for client compatibility
//   } catch (err: any) {
//     console.error(err);
//     return json({ error: err.message || "Unknown error" }, 500);
//   }
// }




// // --- helpers ---
// function json(data: any, status = 200) {
//   return new Response(JSON.stringify(data), {
//     status,
//     headers: { "Content-Type": "application/json" },
//   });
// }
// function wait(ms: number) {
//   return new Promise(r => setTimeout(r, ms));
// }
