//appContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { Subscription, FeatureFlags, ThreadMeta } from "./types";
import { fetchAuthSession } from "aws-amplify/auth";
import { getThreadStorageKey } from "./utils/storage";
import { fetchWithTimeout } from "./utils/network";
import { isAuthStatus, isLikelyAuthError, notifyAuthLost } from "./utils/authRecovery";

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
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_TIMEOUT_MS = 8000;
const BACKGROUND_RETRY_MAX_ATTEMPTS = 3;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 1,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);
      if (RETRYABLE_STATUS.has(res.status) && attempt < retries) {
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
  const bootVersion = useRef(0);
  const backgroundRetryTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (backgroundRetryTimer.current !== null) {
        clearTimeout(backgroundRetryTimer.current);
      }
    };
  }, []);

  const resetAppState = useCallback(() => {
    bootVersion.current += 1;
    if (backgroundRetryTimer.current !== null) {
      clearTimeout(backgroundRetryTimer.current);
      backgroundRetryTimer.current = null;
    }
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

  const authHeaders = useCallback(async (forceRefresh = false) => {
    try {
      const { tokens } = await fetchAuthSession(forceRefresh ? { forceRefresh: true } : undefined);
      const idToken = tokens?.idToken?.toString();
      if (!idToken) throw new Error("Not authenticated");
      return { Authorization: `Bearer ${idToken}` };
    } catch (e) {
      if (isLikelyAuthError(e)) {
        notifyAuthLost("auth_headers");
      }
      throw e;
    }
  }, []);

  const fetchWithAuthRefresh = useCallback(
    async (
      url: string,
      init: RequestInit,
      retries = 1,
      timeoutMs = DEFAULT_TIMEOUT_MS
    ) => {
      const baseHeaders = (init.headers ?? {}) as Record<string, string>;
      let res = await fetchWithRetry(
        url,
        { ...init, headers: { ...baseHeaders, ...(await authHeaders(false)) } },
        retries,
        timeoutMs
      );

      if (isAuthStatus(res.status)) {
        res = await fetchWithRetry(
          url,
          { ...init, headers: { ...baseHeaders, ...(await authHeaders(true)) } },
          0,
          timeoutMs
        );
      }

      return res;
    },
    [authHeaders]
  );

  const fetchUserRow = useCallback(async (): Promise<Subscription> => {
    const url = `${API_BASE_PAYMENTS}/billing/status`;
    const res = await fetchWithAuthRefresh(url, { cache: "no-store" }, 1);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(j?.error || j?.reason || `failed GET ${url}`) as any;
      err.status = res.status;
      err.reason = j?.reason || j?.kind || j?.error;
      throw err;
    }

    return {
      status: j.subscription_status ?? "none",
      plan_code: j.plan_code ?? "free",
      limits: j.limits ?? {},
      current_period_end: typeof j.current_period_end === "number" ? j.current_period_end : 0,
      cancel_at: typeof j.cancel_at === "number" ? j.cancel_at : 0,
      access_ends_at: j.access_ends_at ?? null,
      days_left: typeof j.days_left === "number" ? j.days_left : null,
    };
  }, [fetchWithAuthRefresh]);

  const refreshThreads = useCallback(async (): Promise<ThreadMeta[]> => {
    const url = `${API_BASE}/threads/prod`;

    const res = await fetchWithAuthRefresh(url, { cache: "no-store" }, 1);
    const txt = await res.text();

    let j: any = {};
    try {
      j = JSON.parse(txt);
    } catch (e) {
      console.error("[threads] JSON parse error:", e);
      throw new Error("Invalid JSON from /threads/prod");
    }
    if (!res.ok) {
      const err = new Error(j?.error || j?.reason || `failed /threads/prod (${res.status})`) as any;
      err.status = res.status;
      err.reason = j?.reason || j?.kind || j?.error;
      throw err;
    }

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
  }, [fetchWithAuthRefresh]);

  const reconcileThreadSelection = useCallback((targetSubKey: string, list: ThreadMeta[]) => {
    const storageKey = getThreadStorageKey(targetSubKey);
    const saved = localStorage.getItem(storageKey);

    let fallback: string | null = null;
    if (saved && list.some((t) => t.threadHandle === saved)) {
      fallback = saved;
    } else {
      if (saved) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore storage access errors
        }
      }
      fallback = list[0]?.threadHandle ?? null;
    }

    _setActiveThread((current) => {
      if (current && list.some((t) => t.threadHandle === current)) return current;
      return fallback;
    });
  }, []);

  const scheduleBackgroundRevalidate = useCallback(
    (targetSubKey: string, version: number, attempt = 1) => {
      if (bootVersion.current !== version) return;
      if (attempt > BACKGROUND_RETRY_MAX_ATTEMPTS) return;

      if (backgroundRetryTimer.current !== null) {
        clearTimeout(backgroundRetryTimer.current);
      }

      const delayMs = Math.min(12000, 2000 * attempt);
      backgroundRetryTimer.current = window.setTimeout(async () => {
        if (bootVersion.current !== version) return;

        let shouldRetry = false;

        try {
          const userRow = await fetchUserRow();
          if (bootVersion.current !== version) return;
          setSub(userRow);
          setFlags(flagsFrom(userRow));
        } catch (e) {
          if (isLikelyAuthError(e)) {
            notifyAuthLost("background_revalidate_user");
            backgroundRetryTimer.current = null;
            return;
          }
          shouldRetry = true;
        }

        try {
          const list = await refreshThreads();
          if (bootVersion.current !== version) return;
          reconcileThreadSelection(targetSubKey, list);
        } catch (e) {
          if (isLikelyAuthError(e)) {
            notifyAuthLost("background_revalidate_threads");
            backgroundRetryTimer.current = null;
            return;
          }
          shouldRetry = true;
        }

        if (shouldRetry) {
          scheduleBackgroundRevalidate(targetSubKey, version, attempt + 1);
          return;
        }

        backgroundRetryTimer.current = null;
      }, delayMs);
    },
    [fetchUserRow, reconcileThreadSelection, refreshThreads]
  );

  const boot = useCallback(async () => {
    if (booting.current) return;
    booting.current = true;

    setReady(false);
    resetAppState();
    const version = bootVersion.current;

    try {
      const { tokens } = await fetchAuthSession();
      let nextSubKey = (tokens?.idToken as any)?.payload?.sub as string | undefined;
      if (!nextSubKey) {
        const refreshed = await fetchAuthSession({ forceRefresh: true });
        nextSubKey = (refreshed.tokens?.idToken as any)?.payload?.sub as string | undefined;
      }
      if (!nextSubKey) throw new Error("missing_sub");

      setSubKey(nextSubKey);

      let shouldBackgroundRetry = false;
      const [userResult, threadsResult] = await Promise.allSettled([fetchUserRow(), refreshThreads()]);
      const userAuthFailure = userResult.status === "rejected" && isLikelyAuthError(userResult.reason);
      const threadAuthFailure = threadsResult.status === "rejected" && isLikelyAuthError(threadsResult.reason);

      if (userAuthFailure && userResult.status === "rejected") throw userResult.reason;
      if (threadAuthFailure && threadsResult.status === "rejected") throw threadsResult.reason;

      if (userResult.status === "fulfilled") {
        setSub(userResult.value);
        setFlags(flagsFrom(userResult.value));
      } else {
        shouldBackgroundRetry = true;
      }

      if (threadsResult.status === "fulfilled") {
        reconcileThreadSelection(nextSubKey, threadsResult.value);
      } else {
        shouldBackgroundRetry = true;
      }

      setReady(true);

      if (shouldBackgroundRetry) {
        scheduleBackgroundRevalidate(nextSubKey, version);
      }
    } catch (e) {
      if (isLikelyAuthError(e)) {
        notifyAuthLost("boot");
      }
      resetAppState();
      setReady(true);
    } finally {
      booting.current = false;
    }
  }, [fetchUserRow, reconcileThreadSelection, refreshThreads, resetAppState, scheduleBackgroundRevalidate]);

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
