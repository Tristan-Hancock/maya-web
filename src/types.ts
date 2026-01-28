// src/types.ts
//for ai and user messages
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  attachmentName?: string | null; // ← add this

}


// src/types.ts
export type PlanCode = "free" | "tier1" | "tier2" | "tier3" ;//| "enterprise" ;
export type SubscriptionStatus = "none" | "active" | "past_due" | "cancel_at_period_end" | "canceled";

export interface Tier {
  name: string;                // display name
  planCode: PlanCode;          // "free" | "tier1" | "tier2" | "tier3"
  yearPrice: string;
  price: string;               // e.g. "$0", "$12.99"
  statement: string;           // sentence under price
  features: string[];          // bullet points
  ctaText: string;             // button text
  icon: string;                // path to icon asset
  popular?: boolean;           // highlights the card
}

export type Subscription = {
  status: SubscriptionStatus;
  plan_code: PlanCode | "free";
  limits: Record<string, any>;
  current_period_end?: number;     // epoch seconds
  cancel_at?: number;              // epoch seconds (if set by Stripe)
  access_ends_at?: number | null;  // epoch seconds (derived on backend)
  days_left?: number | null;       // integer, derived on backend
};

export interface Limits {
  monthly_prompts?: number; // null = unlimited
  keep_history?: boolean;
  image_uploads?: number;
  doc_uploads?: number;
}

export interface Usage {
  month_key: string;          // e.g. "period#2025-10"
  prompts_used: number;
  images_used: number;
  docs_used: number;
}

export interface UserEntitlements {
  user_id: string;
  plan_code: PlanCode;
  subscription_status: Subscription;
  limits: Limits;
  usage: Usage;
  current_period_end?: number; // epoch seconds
}

export interface CreateSubscriptionRequest {
  plan_code: Exclude<PlanCode, "free">; // "tier1" | "tier2" | "tier3"
}

//stores thread info
export type ThreadMeta = {
  threadHandle: string;
  title?: string;
  created_at: number;
  last_used_at: number;
  messages: number;
};
//feature flags from server
export type FeatureFlags = {
  canHistory: boolean;
  maxPrompts: number|null;
  maxImages: number;
  maxDocs: number;
};
export interface CreateSubscriptionResponse {
  subscription_id: string;
  status: "created" | "active" | string;
  plan_code: Exclude<PlanCode, "free">;
  key_id: string; // Razorpay public key for Checkout
}

// ---------- Client-side gating helpers ----------
export function canUsePrompt(ent: UserEntitlements): {
  allowed: boolean;
  remaining: number | "∞";
} {
  const cap = ent.limits.monthly_prompts ?? null;
  if (cap === null) return { allowed: true, remaining: "∞" };
  const remaining = Math.max(0, cap - ent.usage.prompts_used);
  return { allowed: remaining > 0, remaining };
}

export function featureEnabled(
  ent: UserEntitlements,
  feature: keyof Limits
): boolean {
  // boolean features (e.g., keep_history) -> default false
  if (typeof ent.limits[feature] === "boolean")
    return Boolean(ent.limits[feature]);
  // numeric features (uploads) -> enabled if > 0
  if (typeof ent.limits[feature] === "number")
    return (ent.limits[feature] as number) > 0;
  // missing => treat as disabled
  return false;
}

// export function isPaid(ent: UserEntitlements): boolean {
//   return ent.subscription_status === "active" && ent.plan_code !== "free";
// }
