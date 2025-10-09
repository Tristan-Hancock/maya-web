// src/components/Sidebar.tsx
import React, { useEffect, useMemo, useState } from "react";
import { PlusIcon, MessageIcon, CloseIcon } from "../icons/sidebaricons";
import { fetchAuthSession } from "aws-amplify/auth";

interface SidebarProps {
  isOpen: boolean;
  currentThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadHandle: string) => void;
  onClose: () => void;
}

type ThreadItem = {
  threadHandle: string;
  title?: string;
  created_at?: number;
  last_used_at?: number;
  message_count?: number;
};

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  currentThreadId,
  onNewChat,
  onSelectThread,
  onClose,
}) => {
  const base = useMemo(() => {
    let b = (import.meta as any).env?.VITE_API_BASE_STAGING as string | undefined;
    if (!b) {
      console.warn("VITE_API_BASE_STAGING not set");
      b = ""; // allow relative in dev via proxy
    }
    // trim trailing slash
    return b.endsWith("/") ? b.slice(0, -1) : b;
  }, []);

  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Fetch threads whenever the panel opens
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { tokens } = await fetchAuthSession();
        const idToken = tokens?.idToken?.toString();
        if (!idToken) throw new Error("Not authenticated");

        const url = `${base}/threads/stage`; // e.g. https://.../stage/threads
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setThreads(Array.isArray(data.items) ? data.items : []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load threads");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, base]);

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white w-64 p-4 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">History</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-700 md:hidden">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-4 rounded-md bg-indigo-500 hover:bg-indigo-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Chat</span>
        </button>

        <nav className="flex-1 overflow-y-auto">
          {loading && <div className="text-sm text-gray-300">Loading…</div>}
          {err && <div className="text-sm text-red-300">{err}</div>}
          {!loading && !err && threads.length === 0 && (
            <div className="text-sm text-gray-300">No threads yet.</div>
          )}
          <ul className="space-y-1 mt-2">
            {threads.map((t) => {
              const active = currentThreadId === t.threadHandle;
              return (
                <li key={t.threadHandle}>
                  <button
                    onClick={() => onSelectThread(t.threadHandle)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover:bg-gray-700 transition ${
                      active ? "bg-gray-700" : ""
                    }`}
                    title={t.title || "Untitled Chat"}
                  >
                    <MessageIcon className="w-4 h-4 text-gray-200 flex-shrink-0" />
                    <span className="truncate">{t.title || "Untitled Chat"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" />
      )}
    </>
  );
};

export default Sidebar;
