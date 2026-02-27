//appContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type { Subscription, FeatureFlags, ThreadMeta } from "./types";
import { fetchAuthSession } from "aws-amplify/auth";
import { getThreadStorageKey } from "./utils/storage";

export type AppSection = "chat" | "insights" | "journal";

type AppState = {
  ready: boolean;
  sub: Subscription | null;
  flags: FeatureFlags | null;
  threads: ThreadMeta[];
  activeThread: string | null;
  setActiveThread: (h: string | null) => void;
  clearThreadHandle: () => void;
  resetAppState: () => void;
  refreshThreads: () => Promise<ThreadMeta[]>;
  boot: () => Promise<void>;
  activeSection: AppSection;
  setActiveSection: (s: AppSection) => void;
};

const C = createContext<AppState | null>(null);
export const useApp = () => useContext(C)!;

const API_BASE = import.meta.env.VITE_API_BASE_STAGING as string;
const API_BASE_PAYMENTS = import.meta.env.VITE_API_BILLING_STRIPE_STAGE as string;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, init: RequestInit, retries = 1): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, init);
      if (res.status >= 500 && attempt < retries) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      return res;
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }

  throw lastError ?? new Error("request_failed");
}

function flagsFrom(sub: Subscription | null): FeatureFlags {
  const lim = sub?.limits || {};
  return {
    canHistory: !!lim.keep_history,
    maxPrompts: lim.monthly_prompts ?? (sub?.status === "active" ? null : 5),
    maxImages: lim.image_uploads ?? 0,
    maxDocs: lim.doc_uploads ?? 0,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const [activeThread, _setActiveThread] = useState<string | null>(null);
  const [subKey, setSubKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AppSection>("chat");
  const booting = useRef(false);

  const resetAppState = useCallback(() => {
    setSub(null);
    setFlags(null);
    setThreads([]);
    _setActiveThread(null);
    setSubKey(null);
    setActiveSection("chat");
  }, []);

  const clearThreadHandle = useCallback(() => {
    if (!subKey) return;
    try {
      localStorage.removeItem(getThreadStorageKey(subKey));
    } catch {
      // ignore storage access errors
    }
  }, [subKey]);

  const setActiveThread = useCallback(
    (h: string | null) => {
      _setActiveThread(h);
      if (!subKey) return;

      try {
        const key = getThreadStorageKey(subKey);
        if (h) {
          localStorage.setItem(key, h);
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        // ignore storage access errors
      }
    },
    [subKey]
  );

  const authHeaders = useCallback(async () => {
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (!idToken) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${idToken}` };
  }, []);

  const fetchUserRow = useCallback(async (): Promise<Subscription> => {
    const h = await authHeaders();
    const url = `${API_BASE_PAYMENTS}/billing/status`;
    const res = await fetchWithRetry(url, { headers: h, cache: "no-store" }, 1);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `failed GET ${url}`);

    return {
      status: j.subscription_status ?? "none",
      plan_code: j.plan_code ?? "free",
      limits: j.limits ?? {},
      current_period_end: typeof j.current_period_end === "number" ? j.current_period_end : 0,
      cancel_at: typeof j.cancel_at === "number" ? j.cancel_at : 0,
      access_ends_at: j.access_ends_at ?? null,
      days_left: typeof j.days_left === "number" ? j.days_left : null,
    };
  }, [authHeaders]);

  const refreshThreads = useCallback(async (): Promise<ThreadMeta[]> => {
    const h = await authHeaders();
    const url = `${API_BASE}/threads/prod`;

    const res = await fetchWithRetry(url, { headers: h, cache: "no-store" }, 1);
    const txt = await res.text();

    let j: any = {};
    try {
      j = JSON.parse(txt);
    } catch (e) {
      console.error("[threads] JSON parse error:", e);
      throw new Error("Invalid JSON from /threads/prod");
    }
    if (!res.ok) throw new Error(j?.error || `failed /threads/prod (${res.status})`);

    const list: ThreadMeta[] = (j.threads || j.items || [])
      .map((it: any) => ({
        threadHandle: it.threadHandle || it.thread_handle || it.handle || it.pk?.replace?.(/^thread#/, "") || "",
        title: it.title || "",
        created_at: Number(it.created_at ?? 0),
        last_used_at: Number(it.last_used_at ?? 0),
        messages: Number(it.messages ?? it.message_count ?? it.counters_messages ?? 0),
      }))
      .filter((t: ThreadMeta) => t.threadHandle);

    setThreads(list);
    return list;
  }, [authHeaders]);

  const boot = useCallback(async () => {
    if (booting.current) return;
    booting.current = true;

    setReady(false);
    resetAppState();

    try {
      const { tokens } = await fetchAuthSession();
      const nextSubKey = (tokens?.idToken as any)?.payload?.sub as string | undefined;
      if (!nextSubKey) throw new Error("missing_sub");

      setSubKey(nextSubKey);

      const userRow = await fetchUserRow();
      setSub(userRow);
      setFlags(flagsFrom(userRow));

      const list = await refreshThreads();
      const saved = localStorage.getItem(getThreadStorageKey(nextSubKey));

      if (saved && list.some((t) => t.threadHandle === saved)) {
        _setActiveThread(saved);
      } else {
        if (saved) {
          try {
            localStorage.removeItem(getThreadStorageKey(nextSubKey));
          } catch {
            // ignore storage access errors
          }
        }
        if (list.length) _setActiveThread(list[0].threadHandle ?? null);
      }

      setReady(true);
    } catch {
      resetAppState();
      setReady(true);
    } finally {
      booting.current = false;
    }
  }, [fetchUserRow, refreshThreads, resetAppState]);

  const value: AppState = {
    ready,
    sub,
    flags,
    threads,
    activeThread,
    setActiveThread,
    clearThreadHandle,
    resetAppState,
    refreshThreads,
    boot,
    activeSection,
    setActiveSection,
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}
