//sidebar.tsx
import React, { useEffect } from "react";
import { PlusIcon, MessageIcon, CloseIcon } from "../icons/sidebaricons";
import { useApp } from "../../appContext";

export interface SidebarProps {
  isOpen: boolean;
  currentThreadId: string | null;           // keep prop to match your signature
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

  // Load once when opened (only if we don't already have threads)
  useEffect(() => {
    if (!isOpen) return;
    if (threads.length === 0) void refreshThreads();
  }, []);

  const handleSelect = (h: string) => {
    setActiveThread(h);
    onSelectThread(h);
  };
  console.log("[sidebar] threads ->", threads.length, threads);

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
          {threads.length === 0 && (
            <div className="text-sm text-gray-300">No threads yet.</div>
          )}
{threads.length > 0 && (
  <div className="text-xs text-gray-400 mb-2">Loaded {threads.length} threads</div>
)}
<ul className="space-y-1 mt-2">
  {threads.map((t) => {
    const id = t.threadHandle;
    const isActive = (currentThreadId ?? activeThread) === id;
    const label = t.title || "Untitled Chat";
    return (
      <li key={id}>
        <button
          onClick={() => handleSelect(id)}
          className={`w-full flex flex-col gap-0 px-3 py-2 rounded-md text-left hover:bg-gray-700 transition ${isActive ? "bg-gray-700" : ""}`}
          title={label}
        >
          <div className="flex items-center gap-2">
            <MessageIcon className="w-4 h-4 text-gray-200 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </div>
          <span className="text-[11px] text-gray-300 truncate">{id}</span>
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
