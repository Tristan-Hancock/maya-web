import React, { useEffect, useRef, useState } from "react";
import { PlusIcon, MessageIcon, CloseIcon } from "../icons/sidebaricons";
import { useApp } from "../../appContext";
import { fetchAuthSession } from "aws-amplify/auth";

export interface SidebarProps {
  isOpen: boolean;
  currentThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadHandle: string) => void;
  onClose: () => void;
  onDeleteThread?: (threadHandle: string) => void; // optional callback
}

const API_BASE = import.meta.env.VITE_API_BASE_STAGING as string;
const DELETE_PATH = "/delete/stage/threads";

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  currentThreadId,
  onNewChat,
  onSelectThread,
  onClose,
  onDeleteThread,
}) => {
  const { threads, activeThread, setActiveThread, refreshThreads } = useApp();

  // track previous open state so we only refresh when opening
  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    // On mount if sidebar already open, refresh once
    if (isOpen && !wasOpenRef.current) {
      void refreshThreads();
      wasOpenRef.current = true;
      return;
    }
    // update ref when closed
    if (!isOpen) wasOpenRef.current = false;
  }, [isOpen, refreshThreads]);

  const handleSelect = (h: string) => {
    setActiveThread(h);
    onSelectThread(h);
  };

  // ---- API delete helper (Lambda) ----
  const apiDelete = async (threadHandle: string) => {
    console.log("[DELETE] initiating for threadHandle:", threadHandle);
    console.log("[DELETE] API_BASE:", API_BASE, "DELETE_PATH:", DELETE_PATH);

    if (!API_BASE) {
      console.error("[DELETE] missing API_BASE");
      throw new Error("missing_api_base");
    }

    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();

    console.log("[DELETE] auth session", {
      hasTokens: !!tokens,
      hasIdToken: !!idToken,
    });

    if (!idToken) {
      console.error("[DELETE] missing idToken");
      throw new Error("missing_token");
    }

    const url = `${API_BASE}${DELETE_PATH}`;
    const body = {
      threadHandle,
      pk: `thread#${threadHandle}`,
    };

    console.log("[DELETE] request", {
      url,
      method: "DELETE",
      body,
    });

    const resp = await fetch(url, {
      method: "DELETE", // Lambda/router is allowing POST
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    console.log("[DELETE] raw response", resp.status, text);

    if (!resp.ok) {
      throw new Error(`delete_failed_${resp.status}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  };

  // menu state for per-thread kebab menu
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (threadHandle: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu((cur) => (cur === threadHandle ? null : threadHandle));
  };

  const handleDelete = (threadHandle: string) => async (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!window.confirm("Delete this chat?")) {
      setOpenMenu(null);
      return;
    }

    try {
      await apiDelete(threadHandle);

      // optional parent callback
      if (onDeleteThread) {
        onDeleteThread(threadHandle);
      }

      // if the deleted one was active, clear it
      if (activeThread === threadHandle) {
        setActiveThread(null as any);
      }

      setOpenMenu(null);
      await refreshThreads();
    } catch (err) {
      console.error("[DELETE] error:", err);
      window.alert("Delete failed. Try again.");
      setOpenMenu(null);
    }
  };

  // close menu when clicking outside (global handler)
  useEffect(() => {
    function onDocClick() {
      setOpenMenu(null);
    }
    if (openMenu) {
      document.addEventListener("click", onDocClick);
      return () => document.removeEventListener("click", onDocClick);
    }
    return;
  }, [openMenu]);

  return (
    <>
      {/* Surface switched to light theme to match app */}
      <div
        role="complementary"
        aria-label="Chat history"
        className={`fixed top-0 left-0 h-full w-72 bg-white text-slate-800 z-40 border-r border-gray-200 shadow-sm transform transition-transform duration-300 ease-in-out flex flex-col min-h-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-slate-900">History</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 md:hidden"
            aria-label="Close sidebar"
          >
            <CloseIcon className="w-6 h-6 text-slate-700" />
          </button>
        </div>

        {/* New Chat */}
        <div className="p-4 border-b border-gray-200 shrink-0">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1B2245] text-white hover:opacity-90 transition"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="text-sm">New Chat</span>
          </button>
        </div>

        {/* Thread list */}
        <nav
          className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2 overscroll-contain"
          aria-label="Threads"
        >
          {threads.length === 0 && (
            <div className="text-sm text-slate-500">No threads yet.</div>
          )}

          {threads.map((t) => {
            const id = t.threadHandle;
            const isActive = (currentThreadId ?? activeThread) === id;
            const label = t.title || "Maya Chat";
            return (
              <div key={id} className="relative">
                <button
                  onClick={() => handleSelect(id)}
                  title={label}
                  className={[
                    "w-full px-3 py-2 rounded-xl text-left transition ring-1 ring-transparent flex items-center justify-between",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                      : "bg-white hover:bg-slate-50 text-slate-800 ring-slate-200/0",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageIcon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? "text-indigo-600" : "text-slate-500"
                      }`}
                    />
                    <span className="truncate text-sm">{label}</span>
                  </div>

                  {/* three dots kebab menu */}
                  <div className="ml-2 flex items-center">
                    <button
                      onClick={toggleMenu(id)}
                      aria-haspopup="true"
                      aria-expanded={openMenu === id}
                      aria-label="Thread options"
                      className="p-2 rounded-md hover:bg-slate-100 z-10 focus:outline-none"
                      type="button"
                    >
                      {/* visible filled 3-dot icon (uses currentColor) */}
                      <svg
                        className="w-5 h-5 text-slate-700"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <circle cx="5" cy="12" r="1.75" fill="currentColor" />
                        <circle cx="12" cy="12" r="1.75" fill="currentColor" />
                        <circle cx="19" cy="12" r="1.75" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                </button>

                {/* menu popover (very small) */}
                {openMenu === id && (
                  <div
                    className="absolute right-2 top-12 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-36 rounded-md shadow-lg bg-white ring-1 ring-black/5 overflow-hidden">
                      <button
                        onClick={handleDelete(id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        type="button"
                      >
                        Delete thread
                      </button>
                      {/* placeholder for future actions */}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}
    </>
  );
};

export default Sidebar;
