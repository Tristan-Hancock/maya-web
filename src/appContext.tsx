//appcontext.tsx using this file for global state and fetch all data to then store locally 


import React, {createContext, useContext, useState, useCallback, useRef} from "react";
import type {Subscription, FeatureFlags, ThreadMeta} from "./types";
import { fetchAuthSession } from "aws-amplify/auth";

type AppState = {
  ready: boolean;
  sub: Subscription | null;
  flags: FeatureFlags | null;
  threads: ThreadMeta[];
  activeThread: string | null;
  setActiveThread: (h: string|null) => void;
  refreshThreads: () => Promise<void>;
  boot: () => Promise<void>;
};

const C = createContext<AppState | null>(null);
export const useApp = () => useContext(C)!;

const API_BASE = import.meta.env.VITE_API_BASE_STAGING as string; // e.g. https://.../stage
const API_BASE_PAYMENTS = import.meta.env.VITE_API_BILLING_STAGING as string; // e.g. https://.../stage
function flagsFrom(sub: Subscription | null): FeatureFlags {
  const lim = sub?.limits || {};
  return {
    canHistory: !!lim.keep_history,
    maxPrompts: lim.monthly_prompts ?? (sub?.status==="active" ? null : 5),
    maxImages: lim.image_uploads ?? 0,
    maxDocs: lim.doc_uploads ?? 0,
  };
}

export function AppProvider({children}:{children:React.ReactNode}) {
  const [ready, setReady] = useState(false);
  const [sub, setSub] = useState<Subscription|null>(null);
  const [flags, setFlags] = useState<FeatureFlags|null>(null);
  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const [activeThread, _setActiveThread] = useState<string|null>(null);
  const booting = useRef(false);

  const setActiveThread = (h:string|null) => {
    _setActiveThread(h);
    const subKey = (window as any)._mayaSubKey as string | undefined;
    if (subKey && h) localStorage.setItem(`maya:${subKey}:threadHandle`, h);
  };

  const authHeaders = async () => {
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (!idToken) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${idToken}` };
  };

  const fetchUserRow = useCallback(async (): Promise<Subscription> => {
    // create a tiny staging endpoint /me (or reuse chat lambda with ?whoami=1) that returns users row
    const h = await authHeaders();
    const res = await fetch(`${API_BASE_PAYMENTS}/billing/status`, { headers: h });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "failed /me");
    return {
      status: j.subscription_status ?? "none",
      plan_code: j.plan_code ?? "free",
      limits: j.limits ?? {},
    };
  }, []);

  const refreshThreads = useCallback(async () => {
    const h = await authHeaders();
    const res = await fetch(`${API_BASE}/threads/stage`, { headers: h });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "failed /threads");
    setThreads(j.threads || []);
  }, []);

  const boot = useCallback(async () => {
    if (booting.current) return;
    booting.current = true;
    try {
      // cache sub for per-user storage key
      const { tokens } = await fetchAuthSession();
      const sub = (tokens?.idToken as any)?.payload?.sub;
      (window as any)._mayaSubKey = sub;

      const userRow = await fetchUserRow();
      setSub(userRow);
      setFlags(flagsFrom(userRow));

      await refreshThreads();

      // restore active thread
      const saved = localStorage.getItem(`maya:${sub}:threadHandle`);
      if (saved) _setActiveThread(saved);
      else if ((j => j && j.length)(threads)) _setActiveThread(threads[0]?.threadHandle ?? null);

      setReady(true);
    } catch (e) {
      console.error("boot failed:", e);
      setReady(true); // don’t block UI forever
    } finally {
      booting.current = false;
    }
  }, [fetchUserRow, refreshThreads, threads]);

  const value: AppState = { ready, sub, flags, threads, activeThread, setActiveThread, refreshThreads, boot };
  return <C.Provider value={value}>{children}</C.Provider>;
}
