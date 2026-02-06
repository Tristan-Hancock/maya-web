import React, { useEffect, useRef, useState } from "react";
import { PlusIcon, MessageIcon, CloseIcon } from "../icons/sidebaricons";
import { useApp } from "../../appContext";

export interface SidebarProps {
  isOpen: boolean;
  currentThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadHandle: string) => void;
  onClose: () => void;
  onDeleteThread?: (threadHandle: string) => void; // ⇐ used to trigger modal
    onUpgrade?: () => void;

}


const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  currentThreadId,
  onNewChat,
  onSelectThread,
  onClose,
  onDeleteThread,
  onUpgrade
}) => {
  const { threads, activeThread, setActiveThread, refreshThreads ,  activeSection,setActiveSection, } = useApp();

  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      void refreshThreads();
      wasOpenRef.current = true;
      return;
    }
    if (!isOpen) wasOpenRef.current = false;
  }, [isOpen, refreshThreads]);

const handleSelect = (h: string) => {
  setActiveSection("chat");
  setActiveThread(h);
  onSelectThread(h);
};


  // menu state for per-thread kebab menu
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (threadHandle: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu((cur) => (cur === threadHandle ? null : threadHandle));
  };

  // just request delete: AuthGate will show modal & call API
  const handleDeleteRequest = (threadHandle: string) => (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenMenu(null);
    if (onDeleteThread) {
      onDeleteThread(threadHandle);
    } else {
      console.warn("[Sidebar] onDeleteThread not provided, cannot delete", threadHandle);
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


  //calling diff sections from this 
function SidebarSectionButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full px-4 py-2 rounded-xl text-left text-sm transition",
        active
          ? "bg-indigo-50 text-indigo-700 font-medium"
          : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

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
          <h2 className="text-base font-semibold text-slate-900">Ovelia Health</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 md:hidden"
            aria-label="Close sidebar"
          >
            <CloseIcon className="w-6 h-6 text-slate-700" />
          </button>
        </div>

{/* App Sections */}
<div className="px-3 py-4 space-y-1 border-b border-gray-200">
  <SidebarSectionButton
    label="Chat with Maya"
    active={activeSection === "chat"}
    onClick={() => setActiveSection("chat")}
  />
  <SidebarSectionButton
    label="Health Insights"
    active={activeSection === "insights"}
    onClick={() => setActiveSection("insights")}
  />
  <SidebarSectionButton
    label="Health Journal"
    active={activeSection === "journal"}
    onClick={() => setActiveSection("journal")}
  />
</div>




        {/* New Chat */}
        {/* <div className="p-4 border-b border-gray-200 shrink-0">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1B2245] text-white hover:opacity-90 transition"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="text-sm">New Chat</span>
          </button>
        </div> */}

{/* Chat History Header */}
<div className="flex items-center justify-between px-4 pt-4 pb-2">
  <span className="text-xs font-semibold tracking-wide text-slate-400">
    CHAT HISTORY
  </span>

  <button
    onClick={() => {
      setActiveSection("chat");
      onNewChat();
    }}
    aria-label="New chat"
    className="h-8 w-8 rounded-full flex items-center justify-center
               bg-slate-100 hover:bg-slate-200 transition"
  >
    <PlusIcon className="w-4 h-4 text-slate-700" />
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

                {/* small menu popover */}
                {openMenu === id && (
                  <div
                    className="absolute right-2 top-12 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-36 rounded-md shadow-lg bg-white ring-1 ring-black/5 overflow-hidden">
                      <button
                        onClick={handleDeleteRequest(id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        type="button"
                      >
                        Delete thread
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        {/* Bottom Upgrade CTA */}
<div className="shrink-0 border-t border-gray-200 px-4 py-4">
<button
  onClick={onUpgrade}
  className="w-full flex items-center gap-2 text-sm font-medium
             text-indigo-600 hover:text-indigo-700 transition"
>
  <span className="h-2 w-2 rounded-full bg-indigo-500" />
  Get Premium
</button>

</div>
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
