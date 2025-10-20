import React, { useEffect } from "react";
import { PlusIcon, MessageIcon, CloseIcon } from "../icons/sidebaricons";
import { useApp } from "../../appContext";

export interface SidebarProps {
  isOpen: boolean;
  currentThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadHandle: string) => void;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  currentThreadId,
  onNewChat,
  onSelectThread,
  onClose,
}) => {
  const { threads, activeThread, setActiveThread, refreshThreads } = useApp();

  useEffect(() => {
    if (!isOpen) return;
    if (threads.length === 0) void refreshThreads();
  }, [isOpen]);

  const handleSelect = (h: string) => {
    setActiveThread(h);
    onSelectThread(h);
  };

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
              <button
                key={id}
                onClick={() => handleSelect(id)}
                title={label}
                className={[
                  "w-full px-3 py-2 rounded-xl text-left transition ring-1 ring-transparent",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                    : "bg-white hover:bg-slate-50 text-slate-800 ring-slate-200/0",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <MessageIcon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? "text-indigo-600" : "text-slate-500"
                    }`}
                  />
                  <span className="truncate text-sm">{label}</span>
                </div>
              </button>
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
