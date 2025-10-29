//appContext.tsx
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
  refreshThreads: () => Promise<ThreadMeta[]>;
  boot: () => Promise<void>;
};

const C = createContext<AppState | null>(null);
export const useApp = () => useContext(C)!;

const API_BASE = import.meta.env.VITE_API_BASE as string;
const API_BASE_PAYMENTS = import.meta.env.VITE_API_BILLING as string;

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

  const authHeaders = useCallback(async () => {
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (!idToken) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${idToken}` };
  }, []);

  const fetchUserRow = useCallback(async (): Promise<Subscription> => {
    const h = await authHeaders();
    const res = await fetch(`${API_BASE_PAYMENTS}/billing/status`, { headers: h });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "failed /billing/status");
    return {
      status: j.subscription_status ?? "none",
      plan_code: j.plan_code ?? "free",
      limits: j.limits ?? {},
    };
  }, [authHeaders]);

  // appContext.tsx
const refreshThreads = useCallback(async (): Promise<ThreadMeta[]> => {
    const h = await authHeaders();
    const url = `${API_BASE}/threads/prod`;
    // console.log("[threads] fetch ->", url);
  
    const res = await fetch(url, { headers: h });
    const txt = await res.text();
    // console.log("[threads] status", res.status, "raw:", txt);
  
    let j: any = {};
    try { j = JSON.parse(txt); } catch (e) {
      console.error("[threads] JSON parse error:", e);
      throw new Error("Invalid JSON from /threads/prod");
    }
    if (!res.ok) throw new Error(j?.error || `failed /threads/prod (${res.status})`);
  
    const list: ThreadMeta[] = (j.threads || j.items || []).map((it:any)=>({
      threadHandle: it.threadHandle || it.thread_handle || it.handle || it.pk?.replace?.(/^thread#/, "") || "",
      title: it.title || "",
      created_at: Number(it.created_at ?? 0),
      last_used_at: Number(it.last_used_at ?? 0),
      messages: Number(it.messages ?? it.message_count ?? it.counters_messages ?? 0),
    })).filter((t:ThreadMeta)=>t.threadHandle);
  
    // console.log("[threads] parsed ->", list.length, list);
    setThreads(list);
    (window as any)._mayaDebugThreads = list; // quick inspect in console
    return list;
  }, [authHeaders]);
  
  const boot = useCallback(async () => {
    if (booting.current) { 
      // console.log("[boot] already running");
       return; }
    booting.current = true;
    // console.log("[boot] start");
    try {
      const { tokens } = await fetchAuthSession();
      const subId = (tokens?.idToken as any)?.payload?.sub;
      (window as any)._mayaSubKey = subId;
      // console.log("[boot] subId", subId);
  
      const userRow = await fetchUserRow();
      // console.log("[boot] userRow", userRow);
      setSub(userRow);
      setFlags(flagsFrom(userRow));
  
      const list = await refreshThreads();
  
      const saved = localStorage.getItem(`maya:${subId}:threadHandle`);
      // console.log("[boot] saved handle", saved, "list[0]?", list[0]?.threadHandle);
      if (saved) _setActiveThread(saved);
      else if (list.length) _setActiveThread(list[0].threadHandle ?? null);
  
      setReady(true);
      // console.log("[boot] ready");
    } catch (e) {
      // console.error("[boot] failed:", e);
      setReady(true);
    } finally {
      booting.current = false;
    }
  }, [fetchUserRow, refreshThreads]);
  
  // also log anytime threads change
  React.useEffect(() => {
    // console.log("[threads] state set ->", threads.length, threads);
  }, [threads]);
  
  const value: AppState = { ready, sub, flags, threads, activeThread, setActiveThread, refreshThreads, boot };
  return <C.Provider value={value}>{children}</C.Provider>;
}
