// index.mjs — Chat + Threads + Voice (no Stripe), HTTP API v2, ESM, Node 20+
//
// Routes:
//   POST /chat
//   POST /threads/delete
//   POST /voice/preflight
//   POST /voice/end
//   GET  /voice/status
//   GET  /diag/ping
//   GET  /diag/env
//   GET  /diag/secrets
//
// Deps: jose, openai, busboy, @aws-sdk/client-dynamodb, @aws-sdk/client-secrets-manager

import * as jose from "jose";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import Busboy from "busboy";
import crypto from "crypto";

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";

/* ----------------------------- ENV & CONSTANTS ----------------------------- */

const {
  AWS_REGION = "us-east-2",
  COGNITO_REGION = "us-east-2",
  COGNITO_USER_POOL_ID,
  INSTRUCTION_PROMPT,
  USERS_TABLE,
  THREAD_STORE_TABLE,
  USER_USAGE_MONTHLY_TABLE, // optional: omit to disable thread cap
  OPENAI_REALTIME_VOICE,
  SECRET_SALT_ARN,
  THREAD_SEAL_KEY_ARN,

  OPENAI_API_KEY,
  ASSISTANT_ID,

  ALLOW_ORIGINS,
} = process.env;

if (!COGNITO_USER_POOL_ID) throw new Error("COGNITO_USER_POOL_ID required");
if (!USERS_TABLE) throw new Error("USERS_TABLE required");
if (!THREAD_STORE_TABLE) throw new Error("THREAD_STORE_TABLE required");
if (!SECRET_SALT_ARN) throw new Error("SECRET_SALT_ARN required");
if (!THREAD_SEAL_KEY_ARN) throw new Error("THREAD_SEAL_KEY_ARN required");
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY required");
if (!ASSISTANT_ID) throw new Error("ASSISTANT_ID required");

// Free tier caps (used when subscription_status !== "active")
const FREE_USER_PROMPTS = 5;
const FREE_USER_THREADS = 3;
const FREE_USER_DOCS = 1;

// Doc upload limits
const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
//
const FREE_TOTAL_MINS = 10;
const FREE_WAITTIME_MINS= 1;
const FREE_CALL_TIME= 2;

/* --------------------------------- CLIENTS -------------------------------- */

const ddb = new DynamoDBClient({ region: AWS_REGION });
const sm  = new SecretsManagerClient({ region: AWS_REGION });
// A single OpenAI client usable by chat and voice routes
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/* --------------------------------- HELPERS -------------------------------- */

const nowSec = () => Math.floor(Date.now() / 1000);
const nowMs  = () => Date.now();
const curMonthKey = () => {
  const d = new Date();
  return `period#${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
};

const ok = (body, status = 200, extraHeaders = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...extraHeaders },
  body: JSON.stringify(body),
});

const corsHeaders = (origin) => {
  if (!ALLOW_ORIGINS) return {};
  const list = ALLOW_ORIGINS.split(",").map(s => s.trim()).filter(Boolean);
  const allowed = list.includes(origin) ? origin : (list[0] || "*");
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "content-type,authorization,stripe-signature",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
};

/* ------------------------------ AUTH/JWT SETUP ----------------------------- */

const ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
const jwksRemote = jose.createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

/* ----------------------------- SECRETS HELPERS ----------------------------- */

let secretSaltBuf; // Buffer
async function getSecretSalt() {
  if (secretSaltBuf) return secretSaltBuf;
  const r = await sm.send(new GetSecretValueCommand({ SecretId: SECRET_SALT_ARN }));
  const raw = r.SecretString ?? Buffer.from(r.SecretBinary || [], "base64").toString("utf8");
  let v = raw;
  try { const j = JSON.parse(raw); v = j.SECRET_SALT || j.SALT || raw; } catch {}
  secretSaltBuf = Buffer.from(String(v), "utf8");
  return secretSaltBuf;
}

let sealKeyBuf; // 32 bytes
async function getSealKey() {
  if (sealKeyBuf) return sealKeyBuf;
  const r = await sm.send(new GetSecretValueCommand({ SecretId: THREAD_SEAL_KEY_ARN }));
  const raw = r.SecretString ?? Buffer.from(r.SecretBinary || [], "base64").toString("utf8");
  const parsed = (() => { try { return JSON.parse(raw); } catch { return { THREAD_SEAL_KEY: raw }; } })();
  const key = parsed.THREAD_SEAL_KEY;
  const buf = Buffer.from(key, /[^A-Za-z0-9+/=]/.test(key) ? "utf8" : "base64");
  if (buf.length !== 32) throw new Error("THREAD_SEAL_KEY must be 32 bytes (base64 or raw)");
  sealKeyBuf = buf;
  return sealKeyBuf;
}

/* -------------------------- ID / HANDLE COMPUTATION ------------------------ */

function anonFromSub(sub, saltBuf) {
  return "v1:" + crypto.createHmac("sha256", saltBuf).update(String(sub)).digest("hex");
}
const b64u = {
  enc: (buf) => Buffer.from(buf).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""),
  dec: (s) => Buffer.from(String(s).replace(/-/g,"+").replace(/_/g,"/"), "base64"),
};
async function sealThreadId(threadId, anonUser) {
  const key = await getSealKey();
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(anonUser, "utf8"));
  const ct = Buffer.concat([c.update(threadId, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return `v1.${b64u.enc(iv)}.${b64u.enc(ct)}.${b64u.enc(tag)}`;
}
async function unsealThreadHandle(handle, anonUser) {
  const [v, ivS, ctS, tagS] = String(handle).split(".");
  if (v !== "v1") throw new Error("bad_handle");
  const key = await getSealKey();
  const iv = b64u.dec(ivS), ct = b64u.dec(ctS), tag = b64u.dec(tagS);
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAAD(Buffer.from(anonUser, "utf8"));
  d.setAuthTag(tag);
  const pt = Buffer.concat([d.update(ct), d.final()]);
  return pt.toString("utf8");
}

/* ----------------------------- DDB USER HELPERS ---------------------------- */

async function lazyCreateUser(userId) {
  const now = nowSec();
  const FOURTEEN_DAYS = 14 * 24 * 60 * 60;

  const init = {
    month_key: curMonthKey(),
    prompts_used: 0,
    images_used: 0,
    docs_used: 0,
    voice_session_started_ms: 0,
    voice_seconds_used: 0,
    voice_minutes_used: 0,
    voice_in_progress: false,
    voice_session_deadline_ms: 0,
    voice_last_call_end_ms: 0,
    free_reset_at: now + FOURTEEN_DAYS,

  };
  await ddb.send(new UpdateItemCommand({
    TableName: USERS_TABLE,
    Key: { user_id: { S: userId } },
    UpdateExpression: "SET #ss=:ss, #pc=:pc, #lim=:lim, #use=:use, #ca=:ca, #ua=:ua",
    ConditionExpression: "attribute_not_exists(user_id)",
    ExpressionAttributeNames: {
      "#ss":"subscription_status", "#pc":"plan_code", "#lim":"limits",
      "#use":"usage", "#ca":"created_at", "#ua":"updated_at"
    },
    ExpressionAttributeValues: {
      ":ss": { S: "none" },
      ":pc": { S: "" },
      ":lim": { S: JSON.stringify({}) },
      ":use": { S: JSON.stringify(init) },
      ":ca": { N: String(now) },
      ":ua": { N: String(now) }
    }
  })).catch(e => { if (e.name !== "ConditionalCheckFailedException") throw e; });
}

function normalizeUsage(u = {}) {
  const base = {
    month_key: curMonthKey(),
    prompts_used: 0,
    images_used: 0,
    docs_used: 0,
    voice_session_started_ms: 0,
    voice_seconds_used: 0,
    voice_minutes_used: 0,
    voice_in_progress: false,
    voice_session_deadline_ms: 0,
    voice_last_call_end_ms: 0,
    free_reset_at: 0,

  };
  const merged = { ...base, ...u };
  if (!u.voice_seconds_used && u.voice_minutes_used) {
    merged.voice_seconds_used = Math.floor(Number(u.voice_minutes_used) * 60);
  }
  merged.voice_minutes_used = Math.ceil(merged.voice_seconds_used / 60);
  return merged;
}

async function getUser(userId) {
  const r = await ddb.send(new GetItemCommand({
    TableName: USERS_TABLE,
    Key: { user_id: { S: userId } }
  }));
  if (!r.Item) return null;
  const it = r.Item;
  const rawUsage = it.usage?.S ? JSON.parse(it.usage.S) : {};
  return {
    subscription_status: it.subscription_status?.S || "none",
    plan_code: it.plan_code?.S || "",
    limits: it.limits?.S ? JSON.parse(it.limits.S) : {},
    usage: normalizeUsage(rawUsage)
  };
}

async function rolloverIfNeeded(userId, usage, user) {
  const u = normalizeUsage(usage);

  // 🔒 Paid users NEVER reset here
  if (user.subscription_status === "active") {
    return u;
  }

  const now = nowSec();

  // No reset scheduled yet (legacy users)
  if (!u.free_reset_at || u.free_reset_at === 0) {
    const next = {
      ...u,
      free_reset_at: now + 14 * 24 * 60 * 60,
    };

    await saveUsage(userId, next);
    return next;
  }

  // Not time yet
  if (now < u.free_reset_at) {
    return u;
  }

  // ✅ Free reset
  const fresh = {
    month_key: curMonthKey(),

    prompts_used: 0,
    images_used: 0,
    docs_used: 0,

    // voice_seconds_used: 0,
    // voice_minutes_used: 0,
    // voice_in_progress: false,
    // voice_session_started_ms: 0,
    // voice_session_deadline_ms: 0,
    // voice_last_call_end_ms: 0,

    free_reset_at: now + 14 * 24 * 60 * 60,
  };

  await saveUsage(userId, fresh);
  return fresh;
}


function canSendNow(user, usage) {
  const active = user.subscription_status === "active";
  const cap = active ? (user.limits?.monthly_prompts ?? null) : FREE_USER_PROMPTS;
  if (cap === null) return { allow: true };
  return usage.prompts_used < cap ? { allow: true } : { allow: false, cap, used: usage.prompts_used };
}

async function markPromptUsed(userId, usage) {
  const next = { ...usage, prompts_used: (usage.prompts_used || 0) + 1 };
  await ddb.send(new UpdateItemCommand({
    TableName: USERS_TABLE,
    Key: { user_id: { S: userId } },
    UpdateExpression: "SET #use=:use, #ua=:ua",
    ExpressionAttributeNames: { "#use":"usage", "#ua":"updated_at" },
    ExpressionAttributeValues: { ":use": { S: JSON.stringify(next) }, ":ua": { N: String(nowSec()) } }
  }));
}

async function markDocUsed(userId, usage) {
  const next = { ...usage, docs_used: (usage.docs_used || 0) + 1 };
  await ddb.send(new UpdateItemCommand({
    TableName: USERS_TABLE,
    Key: { user_id: { S: userId } },
    UpdateExpression: "SET #use=:use, #ua=:ua",
    ExpressionAttributeNames: { "#use":"usage", "#ua":"updated_at" },
    ExpressionAttributeValues: { ":use": { S: JSON.stringify(next) }, ":ua": { N: String(nowSec()) } }
  }));
}

/* ----------------------- THREAD STORE / MONTHLY TABLE ---------------------- */

async function ensureThreadItem(anonUser, threadHandle, createdAt, rawTitle) {
  const item = {
    pk: { S: `thread#${threadHandle}` },
    anon_user: { S: anonUser },
    created_at: { N: String(createdAt) },
    last_used_at: { N: String(createdAt) },
    gsi1_pk: { S: `user#${anonUser}` },
    gsi1_sk: { N: String(createdAt) }
  };
  const title = String(rawTitle || "").trim();
  if (title) item.title = { S: title.slice(0, 80) };

  try {
    await ddb.send(new PutItemCommand({
      TableName: THREAD_STORE_TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(pk)"
    }));
  } catch (e) {
    if (e && e.name === "ConditionalCheckFailedException") return;
    throw e;
  }
}

async function touchThread(anonUser, threadHandle, ts) {
  await ddb.send(new UpdateItemCommand({
    TableName: THREAD_STORE_TABLE,
    Key: { pk: { S: `thread#${threadHandle}` } },
    UpdateExpression: "SET last_used_at = :ts, gsi1_pk = :g1, gsi1_sk = :ts ADD counters_messages :one",
    ExpressionAttributeValues: {
      ":ts": { N: String(ts) },
      ":g1": { S: `user#${anonUser}` },
      ":one": { N: "1" }
    }
  }));
}

async function getThreadCount(anonUser) {
  if (!USER_USAGE_MONTHLY_TABLE) return 0;
  const sk = curMonthKey();
  const r = await ddb.send(new GetItemCommand({
    TableName: USER_USAGE_MONTHLY_TABLE,
    Key: { pk: { S: `user#${anonUser}` }, sk: { S: sk } }
  }));
  const n = r.Item?.thread_count?.N;
  return n ? Number(n) : 0;
}

async function reserveThreadSlot(anonUser, cap) {
  if (!USER_USAGE_MONTHLY_TABLE) return true;
  const sk = curMonthKey();
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: USER_USAGE_MONTHLY_TABLE,
      Key: { pk: { S: `user#${anonUser}` }, sk: { S: sk } },
      UpdateExpression: "ADD thread_count :one SET updated_at=:u",
      ConditionExpression: "attribute_not_exists(thread_count) OR thread_count < :cap",
      ExpressionAttributeValues: {
        ":one": { N: "1" },
        ":cap": { N: String(cap) },
        ":u":   { N: String(nowSec()) }
      }
    }));
    return true;
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") return false;
    throw e;
  }
}
async function releaseThreadSlot(anonUser) {
  if (!USER_USAGE_MONTHLY_TABLE) return;
  const sk = curMonthKey();
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: USER_USAGE_MONTHLY_TABLE,
      Key: { pk: { S: `user#${anonUser}` }, sk: { S: sk } },
      UpdateExpression: "ADD thread_count :neg SET updated_at=:u",
      ConditionExpression: "attribute_exists(thread_count) AND thread_count > :zero",
      ExpressionAttributeValues: {
        ":neg":  { N: "-1" },
        ":zero": { N: "0" },
        ":u":    { N: String(nowSec()) }
      }
    }));
  } catch {}
}

/* -------------------------------- CHAT ROUTE ------------------------------- */

async function routeChat(event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  if (event.requestContext?.http?.method === "OPTIONS")
    return ok({}, 204, corsHeaders(origin));

  // Auth
  const auth = (event.headers?.authorization || event.headers?.Authorization || "").trim();
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return ok({ error: "Missing bearer token" }, 401, corsHeaders(origin));

  // Debug verify (optional)
  const debug = (event.rawQueryString || "").includes("debug=1");
  if (debug) {
    try { await jose.jwtVerify(token, jwksRemote, { algorithms: ["RS256"], issuer: ISSUER }); }
    catch (e) { return ok({ debug: true, verify: "fail", reason: String(e?.message || e) }, 401, corsHeaders(origin)); }
    const dec = jose.decodeJwt(token);
    return ok({ debug: true, verify: "ok", tokenUse: dec?.token_use || null }, 200, corsHeaders(origin));
  }

  // Verify JWT
  let userId = "anon";
  try {
    const { payload } = await jose.jwtVerify(token, jwksRemote, {
      algorithms: ["RS256"], issuer: ISSUER, clockTolerance: 5
    });
    userId = String(payload.sub || "anon");
  } catch (e) {
    return ok({ error: "Invalid token", reason: String(e?.message || "verify failed") }, 401, corsHeaders(origin));
  }

  // De-id
  const salt = await getSecretSalt();
  const anonUser = anonFromSub(userId, salt);

  // Body parsing
  if (!event.body) return ok({ error: "Empty body" }, 400, corsHeaders(origin));

  const ctHeader =
    event.headers?.["content-type"] ??
    event.headers?.["Content-Type"] ?? "";
  const ctLower = String(ctHeader).toLowerCase();
  const isMultipart = ctLower.startsWith("multipart/form-data");

  let content = "";
  let threadHandle = null;
  let userMessage = "";
  let filePart = null;

  if (isMultipart) {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64") : Buffer.from(event.body);
    const bb = Busboy({ headers: { "content-type": ctHeader }, limits: { fileSize: MAX_DOC_BYTES, parts: 10, files: 1, fields: 20 } });

    const fields = {};
    let fileBufs = [];
    let fileMime = "";
    let fileName = "";

    const done = new Promise((resolve, reject) => {
      bb.on("file", (_name, stream, info) => {
        fileName = info.filename || "upload";
        fileMime = info.mimeType || info.mime || "";
        stream.on("data", (chunk) => { fileBufs.push(chunk); });
        stream.on("limit", () => reject(new Error("too_large")));
        stream.on("end", () => {});
      });
      bb.on("field", (n, v) => { fields[n] = v; });
      bb.on("error", reject);
      bb.on("finish", resolve);
    });

    bb.end(raw);
    try { await done; } catch (e) {
      if (String(e.message) === "too_large") return ok({ error: "too_large", cap_mb: 10 }, 413, corsHeaders(origin));
      return ok({ error: "multipart_parse_error" }, 400, corsHeaders(origin));
    }

    threadHandle = fields.threadHandle ? String(fields.threadHandle) : null;
    userMessage = fields.userMessage ? String(fields.userMessage).trim() : "";
    if (!fileBufs.length) return ok({ error: "file_required" }, 400, corsHeaders(origin));
    if (!ALLOWED_DOC_MIME.has(fileMime)) return ok({ error: "unsupported_type" }, 415, corsHeaders(origin));
    filePart = { filename: fileName, mime: fileMime, buffer: Buffer.concat(fileBufs) };
  } else {
    let body;
    try { body = JSON.parse(event.body); } catch { return ok({ error: "Invalid JSON" }, 400, corsHeaders(origin)); }
    threadHandle = body.threadHandle || null;
    if (Array.isArray(body.messages)) {
      const u = body.messages.find(m => m?.role === "user" && typeof m.content === "string");
      content = (u?.content || "").trim();
    } else if (typeof body.content === "string") {
      content = body.content.trim();
    } else {
      return ok({ error: "Invalid body. Expect {content,threadHandle?} or {messages[],threadHandle?}." }, 400, corsHeaders(origin));
    }
  }

  // Validate length
  const hasFile = !!filePart;
  if (!hasFile) {
    if (content.length === 0 || content.length > 900) return ok({ error: "Invalid message length (1–900 chars)." }, 400, corsHeaders(origin));
  } else {
    if (userMessage.length > 900) return ok({ error: "Invalid message length (1–900 chars)." }, 400, corsHeaders(origin));
  }

  // Usage / gating
  await lazyCreateUser(userId);
  const userRow = (await getUser(userId)) || { subscription_status:"none", limits:{}, usage:{ month_key:curMonthKey(), prompts_used:0, images_used:0, docs_used:0 } };
  const usage = await rolloverIfNeeded(userId, userRow.usage, userRow);

  // Thread cap only when creating a new thread
  const computedThreadCap = (userRow.subscription_status === "active")
    ? (userRow.limits?.threads ?? null)
    : FREE_USER_THREADS;

  let reserved = false;
  if (!threadHandle && computedThreadCap !== null) {
    const okRes = await reserveThreadSlot(anonUser, computedThreadCap);
    if (!okRes) {
      return ok({
        error: "payment_required",
        kind: "thread_cap",
        reason: "thread_limit_reached",
        cap: computedThreadCap,
        plan: userRow.plan_code || "free"
      }, 402, corsHeaders(origin));
    }
    reserved = true;
  }

  // Prompt cap
  const gate = canSendNow(userRow, usage);
  if (!gate.allow) {
    if (reserved) await releaseThreadSlot(anonUser);
    const err = userRow.subscription_status === "active" ? "limit_reached" : "payment_required";
    return ok({ error: err, kind: "prompt_cap", plan: userRow.plan_code || "free", used: gate.used ?? usage.prompts_used, cap: gate.cap ?? null }, 402, corsHeaders(origin));
  }

  // Doc cap when uploading
  if (hasFile) {
    const docCap = (userRow.subscription_status === "active")
      ? (typeof userRow.limits?.doc_uploads === "number" ? userRow.limits.doc_uploads : 0)
      : FREE_USER_DOCS;
    const usedDocs = usage.docs_used || 0;
    if (docCap !== null && usedDocs >= docCap) {
      if (reserved) await releaseThreadSlot(anonUser);
      return ok({ error: "payment_required", kind: "doc_cap", cap: docCap, used: usedDocs }, 402, corsHeaders(origin));
    }
  }

  // OpenAI (threads/messages/runs)
  let tid;
  try {
    if (threadHandle) {
      tid = await unsealThreadHandle(threadHandle, anonUser);
    } else {
      const created = await openai.beta.threads.create();
      tid = created.id;
      threadHandle = await sealThreadId(tid, anonUser);
    }
  } catch (e) {
    if (reserved) await releaseThreadSlot(anonUser);
    return ok({ error: "invalid_thread_handle" }, 400, corsHeaders(origin));
  }

  // Send message
  try {
    if (!hasFile) {
      await openai.beta.threads.messages.create(tid, { role: "user", content: [{ type: "text", text: content }] });
    } else {
      const fileForOpenAI = await toFile(
        filePart.buffer,
        filePart.filename || "upload",
        { type: filePart.mime || "application/octet-stream" }
      );
      const uploaded = await openai.files.create({ file: fileForOpenAI, purpose: "assistants" });
      await openai.beta.threads.messages.create(tid, {
        role: "user",
        content: [{ type: "text", text: userMessage || "Please review the attached document." }],
        attachments: [{ file_id: uploaded.id, tools: [{ type: "file_search" }] }],
      });
    }
  } catch (e) {
    if (reserved) await releaseThreadSlot(anonUser);
    return ok({ error: "message_create_failed", reason: String(e?.message || e) }, 500, corsHeaders(origin));
  }

  // Run + polling (SDK-stable signature)
  let text = "";
  try {
    const run = await openai.beta.threads.runs.create(tid, {
      assistant_id: ASSISTANT_ID,
      metadata: { userAnon: anonUser },
    });

    let status = run.status;
    const start = Date.now();
    while (status === "queued" || status === "in_progress") {
      const limitMs = hasFile ? 60000 : 45000;
      if (Date.now() - start > limitMs) {
        if (reserved) await releaseThreadSlot(anonUser);
        return ok({ error: "Run timeout" }, 504, corsHeaders(origin));
      }
      await new Promise(r => setTimeout(r, 800));
      const r2 = await openai.beta.threads.runs.retrieve(run.id, { thread_id: tid });
      status = r2.status;
      if (status === "failed" || status === "expired" || status === "cancelled") {
        if (reserved) await releaseThreadSlot(anonUser);
        return ok({
          error: `Run ${status}`,
          last_error: r2.last_error || null,
          required_action: r2.required_action || null,
          incomplete_details: r2.incomplete_details || null
        }, 500, corsHeaders(origin));
      }
    }

    // Get the latest assistant message
    const list = await openai.beta.threads.messages.list(tid, { order: "desc", limit: 5 });
    const msg = list.data.find(m => m.role === "assistant");
    text = msg ? (msg.content || [])
      .map(c => (c.type === "text" ? (c.text?.value || "") : ""))
      .join("\n") : "";

  } catch (e) {
    if (reserved) await releaseThreadSlot(anonUser);
    return ok({ error: "run_create_failed", reason: String(e?.message || e) }, 500, corsHeaders(origin));
  }

  // Usage increments after success
  await markPromptUsed(userId, usage);
  if (hasFile) await markDocUsed(userId, usage);

  // Thread store & monthly rollup
  const ts = nowMs();
  await ensureThreadItem(anonUser, threadHandle, ts, hasFile ? (userMessage || filePart?.filename || "") : content);
  await touchThread(anonUser, threadHandle, ts);

  if (reserved) {
    // We consumed a reserved slot (new thread was created). Keep it consumed.
  }

  return ok({ threadHandle, message: text, text }, 200, corsHeaders(origin));
}

/* --------------------------- THREADS: DELETE ROUTE ------------------------- */

async function routeDeleteThread(event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  if (event.requestContext?.http?.method === "OPTIONS")
    return ok({}, 204, corsHeaders(origin));

  // Auth
  const auth = (event.headers?.authorization || event.headers?.Authorization || "").trim();
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return ok({ error: "missing_token" }, 401, corsHeaders(origin));

  let sub = "";
  try {
    const { payload } = await jose.jwtVerify(token, jwksRemote, {
      algorithms: ["RS256"], issuer: ISSUER, clockTolerance: 5,
    });
    sub = String(payload.sub || "");
    if (!sub) throw new Error("sub missing");
  } catch (e) {
    return ok({ error: "invalid_token", reason: String(e?.message || e) }, 401, corsHeaders(origin));
  }

  // Body (robust)
  let rawBody = event.body || "";
  if (event.isBase64Encoded) {
    try { rawBody = Buffer.from(rawBody, "base64").toString("utf8"); } catch {}
  }
  let body;
  try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { body = {}; }

  // Accept aliases
  let threadHandle = "";
  const pkIn = (body.pk || body.PK || body.key || "").toString();
  const aliases = [
    body.threadHandle, body.thread_handle, body.handle, body.thread_id, body.threadId, body.id
  ].map(v => (v ?? "").toString().trim()).filter(Boolean);
  if (aliases.length) threadHandle = aliases[0];
  if (!threadHandle && pkIn) threadHandle = pkIn.startsWith("thread#") ? pkIn.slice(7) : pkIn;

  const startCooldown = !!body.startCooldown;
  if (!threadHandle) return ok({ error: "missing_threadHandle" }, 400, corsHeaders(origin));

  // Load thread item (NO owner check as requested)
  const r = await ddb.send(new GetItemCommand({
    TableName: THREAD_STORE_TABLE,
    Key: { pk: { S: `thread#${threadHandle}` } },
    ConsistentRead: true,
  }));
  const item = r.Item || null;
  const msgCount = Number(item?.counters_messages?.N || "0");

  // Delete row
  await ddb.send(new DeleteItemCommand({
    TableName: THREAD_STORE_TABLE,
    Key: { pk: { S: `thread#${threadHandle}` } },
    ConditionExpression: "attribute_exists(pk)",
  })).catch(e => {
    if (e.name !== "ConditionalCheckFailedException") throw e;
  });

  // Decrement prompts for current month (best-effort)
  const userKey = { user_id: { S: sub } };
  const ur = await ddb.send(new GetItemCommand({ TableName: USERS_TABLE, Key: userKey }));
  const usage = ur.Item?.usage?.S ? normalizeUsage(JSON.parse(ur.Item.usage.S)) : normalizeUsage({ month_key: curMonthKey() });
  const before = usage.prompts_used || 0;
  const after  = Math.max(0, before - msgCount);
  usage.prompts_used = after;

  await ddb.send(new UpdateItemCommand({
    TableName: USERS_TABLE,
    Key: userKey,
    UpdateExpression: "SET #use = :u, #ua = :ua",
    ExpressionAttributeNames: { "#use": "usage", "#ua": "updated_at" },
    ExpressionAttributeValues: { ":u": { S: JSON.stringify(usage) }, ":ua": { N: String(nowSec()) } }
  }));

  // Optional cooldown (7 days)
  if (startCooldown) {
    const until = nowSec() + 7*24*60*60;
    await ddb.send(new UpdateItemCommand({
      TableName: USERS_TABLE,
      Key: userKey,
      UpdateExpression: "SET cooldown_until = :cu, updated_at = :ua",
      ExpressionAttributeValues: { ":cu": { N: String(until) }, ":ua": { N: String(nowSec()) } }
    }));
  }

  return ok({ ok: true, threadHandle, deleted_messages: msgCount, prompts_after: after }, 200, corsHeaders(origin));
}

/* -------------------------------- VOICE ROUTES ----------------------------- */
// Helper: create Realtime session via REST (works regardless of SDK version)
async function createRealtimeSessionREST({
  model = "gpt-4o-realtime-preview",
  voice = OPENAI_REALTIME_VOICE,
  instructions,
  requestedPerCallMs = null, // new optional param (absolute ms)
} = {}) {
  // SIMULATION SHORT-CIRCUIT
  if (String(process.env.SIMULATE_VOICE).toLowerCase() === "true") {
    const now = Date.now();
    // If caller provided a requestedPerCallMs use it; otherwise fall back to 5min
    const expiresMs = now + (Number.isFinite(requestedPerCallMs) && requestedPerCallMs > 0
      ? Number(requestedPerCallMs)
      : (5 * 60 * 1000));
    return {
      client_secret: {
        value: "simulated-client-secret",
        expires_at: new Date(expiresMs).toISOString()
      },
      // include other fields the code may expect
      model,
      voice,
      instructions,
      simulated: true
    };
  }

  const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      voice,
      instructions,                 // keep your INSTRUCTION_PROMPT here
      turn_detection: { type: "server_vad" } // ← critical
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Realtime session HTTP ${res.status}: ${text}`);
  }
  return await res.json();
}

/* Auth helper reused for voice routes */
async function verifyAndGetUserId(event, originHeaders) {
  const auth = (event.headers?.authorization || event.headers?.Authorization || "").trim();
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw ok({ error: "Missing bearer token" }, 401, originHeaders);

  try {
    const { payload } = await jose.jwtVerify(token, jwksRemote, {
      algorithms: ["RS256"], issuer: ISSUER, clockTolerance: 5
    });
    const sub = String(payload.sub || "");
    if (!sub) throw new Error("sub missing");
    return sub;
  } catch (e) {
    throw ok({ error: "Invalid token", reason: String(e?.message || "verify failed") }, 401, originHeaders);
  }
}

async function saveUsage(userId, usage) {
  await ddb.send(new UpdateItemCommand({
    TableName: USERS_TABLE,
    Key: { user_id: { S: userId } },
    UpdateExpression: "SET #use = :use, #ua = :ua",
    ExpressionAttributeNames: {
      "#use": "usage",
      "#ua": "updated_at",
    },
    ExpressionAttributeValues: {
      ":use": { S: JSON.stringify(usage) },
      ":ua":  { N: String(nowSec()) },
    },
  }));
}


// 🔁 REPLACE the existing getVoiceCapMinutes() with this:
// Replace existing getVoicePolicy with this:
// Robust voice policy resolver — copy/paste to replace existing getVoicePolicy
function getVoicePolicy(userRow) {
  try {
    const lim = (userRow && userRow.limits) || {};

    // Free defaults (minutes)
    const FREE_TOTAL_MINUTES = typeof FREE_TOTAL_MINS === "number" ? FREE_TOTAL_MINS : 10;
    const FREE_PER_CALL_MIN = typeof FREE_CALL_TIME === "number" ? FREE_CALL_TIME : 2;
    const FREE_WAIT_MIN = typeof FREE_WAITTIME_MINS === "number" ? FREE_WAITTIME_MINS : 1;

    // Normalize a few historical / possible key variants
    const voiceEnabled = lim.voice_enabled === true;
    const voiceMinutes =
      Number(lim.voice_minutes ?? lim.voice_minutes_per_month ?? lim.voice_monthly_minutes ?? 0) || 0;
    const perCallRaw =
      Number(
        lim.voice_session_max_minutes ??
        lim.voice_max_call_minutes ??
        lim.voice_session_max ??
        lim.voice_session_max_min ??
        0
      ) || 0;
    const cooldownRaw =
      Number(lim.voice_cooldown_minutes ?? lim.voice_wait_minutes ?? lim.voice_cooldown_min ?? 0) || 0;

    // Decide whether user has paid/explicit voice allowance
    const hasPaidVoice = voiceEnabled || voiceMinutes > 0 || perCallRaw > 0;

    if (hasPaidVoice) {
      const capMin = Math.max(0, Math.floor(voiceMinutes)); // monthly total minutes
      const perCallMin = Math.max(1, Math.floor(perCallRaw || FREE_PER_CALL_MIN)); // per-call cap in minutes
      const waitMin = Math.max(0, Math.floor(cooldownRaw || FREE_WAIT_MIN));
      return { plan: "paid", capMin, perCallMin, waitMin };
    }

    // Free-policy fallback
    return {
      plan: "free",
      capMin: Math.max(0, Math.floor(FREE_TOTAL_MINUTES)),
      perCallMin: Math.max(1, Math.floor(FREE_PER_CALL_MIN)),
      waitMin: Math.max(0, Math.floor(FREE_WAIT_MIN)),
    };
  } catch (err) {
    // On any unexpected runtime error, return safe free policy (avoid throwing)
    console.warn("[voice] getVoicePolicy failed, falling back to free policy:", err);
    return {
      plan: "free",
      capMin: 10,
      perCallMin: 2,
      waitMin: 1,
    };
  }
}





// POST /voice/preflight
// 🔁 REPLACE the whole routeVoicePreflight with this:
// POST /voice/preflight
async function routeVoicePreflight(event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  if (event.requestContext?.http?.method === "OPTIONS")
    return ok({}, 204, corsHeaders(origin));
  const headers = corsHeaders(origin);

  let userId;
  try { userId = await verifyAndGetUserId(event, headers); }
  catch (resp) { return resp; }

  await lazyCreateUser(userId);
  const user = (await getUser(userId)) || { limits:{}, usage: normalizeUsage({}) };

  const policy = getVoicePolicy(user);
  const usedMin = Math.ceil((user.usage.voice_seconds_used || 0) / 60);

  // compute per-call ms now (so we can pass it into session creation)
  const perCallMin = Number.isFinite(policy.perCallMin) ? Math.max(1, Math.floor(policy.perCallMin)) : 2;
  const perCallMs = perCallMin * 60_000;

  if (usedMin >= (Number.isFinite(policy.capMin) ? policy.capMin : 0)) {
    const kind = policy.plan === "free" ? "voice_free_exhausted" : "voice_minutes";
    return ok({ error: "limit_reached", kind, cap: policy.capMin, used: usedMin }, 402, headers);
  }

  const lastEnd = Number(user.usage.voice_last_call_end_ms || 0);
  const now = Date.now();
  const cooldownMs = Math.max(0, Math.floor(Number(policy.waitMin || 0))) * 60_000;
  const readyAt = lastEnd + cooldownMs;
  if (lastEnd > 0 && now < readyAt) {
    return ok({
      error: "cooldown_active",
      kind: "voice_cooldown",
      wait_minutes: policy.waitMin,
      remaining_ms: Math.max(0, readyAt - now),
      next_allowed_at_ms: readyAt
    }, 429, headers);
  } 

  // Create provider session, pass requested per-call ms so simulator can mirror it
  let session;
  try {
    session = await createRealtimeSessionREST({
      model: "gpt-4o-realtime-preview",
      voice: OPENAI_REALTIME_VOICE,
      instructions: INSTRUCTION_PROMPT,
      requestedPerCallMs: perCallMs
    });
  } catch (e) {
    console.error("[voice] createRealtimeSessionREST failed:", e);
    return ok({ error: "realtime_session_create_failed", reason: String(e?.message || e) }, 500, headers);
  }

  const secretVal = session?.client_secret?.value || null;
  const expiresAtStr = session?.client_secret?.expires_at || null;
  const parsedExpiry = expiresAtStr ? Date.parse(expiresAtStr) : NaN;
  const providerExpiryMs = Number.isFinite(parsedExpiry) ? parsedExpiry : (now + 60_000);

  console.log(`[voice] provider expiry ms: ${providerExpiryMs} (now:${now}), perCallMs:${perCallMs}, policyPerCallMin:${policy.perCallMin}`);

  if (!secretVal) return ok({ error: "no_client_secret" }, 500, headers);

  // Guaranteed finite deadline (server won't promise more than provider secret expiry)
  const serverDeadline = Math.min(providerExpiryMs, now + perCallMs);

  const usage = user.usage;
  usage.voice_in_progress = true;
  usage.voice_session_started_ms = now;
  usage.voice_session_deadline_ms = serverDeadline;
  await saveUsage(userId, usage);

  return ok({
    client_secret: secretVal,
    session_deadline_ms: serverDeadline,
    session_started_ms: now,
    cap_minutes: policy.capMin,
    per_call_cap_minutes: perCallMin,
    wait_minutes: policy.waitMin,
    used_minutes: usedMin,
    model: "gpt-4o-realtime-preview",
    turn_detection: { type: "none" },
    provider_expires_at: (expiresAtStr || null),
    provider_expires_ms: providerExpiryMs
  }, 200, headers);
}


// POST /voice/end
// 🔁 REPLACE the whole routeVoiceEnd with this:
async function routeVoiceEnd(event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  if (event.requestContext?.http?.method === "OPTIONS")
    return ok({}, 204, corsHeaders(origin));
  const headers = corsHeaders(origin);

  let userId;
  try { userId = await verifyAndGetUserId(event, headers); }
  catch (resp) { return resp; }

  // parse body
  let body = {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : (event.body || "");
    body = raw ? JSON.parse(raw) : {};
  } catch {}
  const elapsedSecReported = Math.max(0, Math.floor(Number(body.elapsedSec || 0)));

  await lazyCreateUser(userId);
  const user = (await getUser(userId)) || { usage: normalizeUsage({}) };
  const policy = getVoicePolicy(user);
  const u = user.usage;

  const now = nowMs();
  let billableSec = 0;

  if (u.voice_in_progress) {
    const start = Number(u.voice_session_started_ms || 0);
    const deadline = Number(u.voice_session_deadline_ms || 0);

    // Allowed window (server)
    let maxWindowSec = 0;
    if (start > 0) {
      const endCap = (deadline > 0 ? Math.min(now, deadline) : now);
      maxWindowSec = Math.max(0, Math.floor((endCap - start) / 1000));
    }

    // Hard clamp to per-call cap as a second safeguard
    const perCallMax = policy.perCallMin * 60;

    billableSec = Math.min(
      perCallMax,
      Math.min(elapsedSecReported || maxWindowSec, maxWindowSec || elapsedSecReported)
    );
  }

  u.voice_seconds_used = Math.max(0, Math.floor(Number(u.voice_seconds_used || 0) + billableSec));
  u.voice_minutes_used = Math.ceil(u.voice_seconds_used / 60);
  u.voice_in_progress = false;
  u.voice_last_call_end_ms = now; // for cooldown checks
  u.voice_session_started_ms = 0;
  u.voice_session_deadline_ms = 0;

  await saveUsage(userId, u);

  return ok({
    ok: true,
    billed_seconds: billableSec,
    total_seconds_used: u.voice_seconds_used,
    total_minutes_used: u.voice_minutes_used
  }, 200, headers);
}


// GET /voice/status
// 🔁 REPLACE the whole routeVoiceStatus with this:
async function routeVoiceStatus(event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  if (event.requestContext?.http?.method === "OPTIONS")
    return ok({}, 204, corsHeaders(origin));
  const headers = corsHeaders(origin);

  let userId;
  try { userId = await verifyAndGetUserId(event, headers); }
  catch (resp) { return resp; }

  await lazyCreateUser(userId);
  const user = (await getUser(userId)) || { limits:{}, usage: normalizeUsage({}) };

  const policy = getVoicePolicy(user);
  const usedMin = Math.ceil((user.usage.voice_seconds_used || 0) / 60);

  const lastEnd = Number(user.usage.voice_last_call_end_ms || 0);
  const cooldownMs = policy.waitMin * 60_000;
  const now = nowMs();
  const readyAt = lastEnd + cooldownMs;
  const cooldownRemaining = lastEnd > 0 && now < readyAt ? (readyAt - now) : 0;

  return ok({
    voice: {
      plan: policy.plan,                // "free" | "paid"
      in_progress: !!user.usage.voice_in_progress,
      started_ms: user.usage.voice_session_started_ms || 0,
      deadline_ms: user.usage.voice_session_deadline_ms || 0,
      used_seconds: user.usage.voice_seconds_used || 0,
      used_minutes: usedMin,
      cap_minutes: policy.capMin,
      per_call_cap_minutes: policy.perCallMin,
      wait_minutes: policy.waitMin,
      remaining_minutes: Math.max(0, policy.capMin - usedMin),
      cooldown_remaining_ms: cooldownRemaining,
      next_allowed_at_ms: cooldownRemaining ? readyAt : 0,
    }
  }, 200, headers);
}


/* --------------------------------- DIAG ----------------------------------- */

async function routeDiag(event) {
  const path = event.rawPath || "";
  if (path.endsWith("/diag/ping")) return ok({ ok: true, now: Date.now() });
  if (path.endsWith("/diag/env")) {
    return ok({
      OPENAI_API_KEY: !!OPENAI_API_KEY,
      ASSISTANT_ID: !!ASSISTANT_ID,
      COGNITO_REGION: !!COGNITO_REGION,
      COGNITO_USER_POOL_ID: !!COGNITO_USER_POOL_ID,
      USERS_TABLE,
      THREAD_STORE_TABLE,
      USER_USAGE_MONTHLY_TABLE,
      THREAD_SEAL_KEY_ARN: !!THREAD_SEAL_KEY_ARN,
      SECRET_SALT_ARN: !!SECRET_SALT_ARN,
      AWS_REGION
    });
  }
  if (path.endsWith("/diag/secrets")) {
    try {
      const salt = await getSecretSalt();
      const key  = await getSealKey();
      return ok({ secret_salt_len: salt.length, seal_key_len: key.length });
    } catch (e) {
      return ok({ error: "secrets_fail", reason: String(e) }, 500);
    }
  }
  return ok({ error: "Not found" }, 404);
}


/* -------------------------------- ROUTER ---------------------------------- */

export const handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || "GET";
    const path   = event.rawPath || "";
    const origin = event.headers?.origin || event.headers?.Origin || "";

    if (method === "OPTIONS") {
      return ok({}, 204, corsHeaders(origin));
    }

    // Chat
    if (path.endsWith("/chat")) {
      if (method !== "POST") return ok({ error: "Method not allowed" }, 405, corsHeaders(origin));
      return await routeChat(event);
    }

    // Threads
    if (path.endsWith("/threads/delete")) {
      if (method !== "POST") return ok({ error: "Method not allowed" }, 405, corsHeaders(origin));
      return await routeDeleteThread(event);
    }

    // Voice
     // Voice (support both /voice/* and your /test/realtime/* aliases)
     if (
      path.endsWith("/voice/preflight") ||
      path.endsWith("/test/realtime/session") ||  // e.g. /test/realtime/session
      path.endsWith("/realtime/preflight")
    ) {
      if (method !== "POST") return ok({ error: "Method not allowed" }, 405, corsHeaders(origin));
      return await routeVoicePreflight(event);
    }

    if (
      path.endsWith("/voice/end") ||
      path.endsWith("/test/realtime/end") // e.g. /test/realtime/end
    ) {
      if (method !== "POST") return ok({ error: "Method not allowed" }, 405, corsHeaders(origin));
      return await routeVoiceEnd(event);
    }

    if (
      path.endsWith("/voice/status") ||
      path.endsWith("/test/realtime/status") // optional: create this route in API GW if you want
    ) {
      if (method !== "GET") return ok({ error: "Method not allowed" }, 405, corsHeaders(origin));
      return await routeVoiceStatus(event);
    }


    // Diagnostics
    if (path.startsWith("/diag/")) {
      return await routeDiag(event);
    }

    return ok({ error: "Not found", path, method }, 404, corsHeaders(origin));
  } catch (e) {
    console.error("[handler] error", e);
    return ok({ error: String(e?.message || e) }, 500);
  }
};
