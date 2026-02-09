import React, { useEffect, useRef, useState } from "react";
import { JournalIcon , PlusIcon, MessageIcon, CloseIcon ,UserIcon , ChartBarIcon  } from "../icons/sidebaricons";
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
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition",
        active
          ? "bg-indigo-50 text-indigo-700 font-medium"
          : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      <Icon
        className={[
          "w-4 h-4 flex-shrink-0",
          active ? "text-indigo-600" : "text-slate-400",
        ].join(" ")}
      />
      <span className="text-sm">{label}</span>
    </button>
  );
}


  return (
  <>
    <div
      role="complementary"
      aria-label="Chat history"
      className={`fixed top-0 left-0 h-full w-72 bg-white text-slate-800 z-40
        border-r border-slate-200
        transform transition-transform duration-300 ease-in-out
        flex flex-col min-h-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Header */}
   <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
  <div className="flex items-center gap-3">
    <img
      src="/src/assets/ovelia.png"
      alt="Ovelia Health"
      className="h-7 w-7 object-contain"
    />

    <div className="leading-tight">
      <div className="text-[16px] font-semibold text-slate-900 tracking-tight">
        Ovelia Health
      </div>
     
    </div>
  </div>
  <button
    onClick={onClose}
    className="p-1.5 rounded-md hover:bg-slate-100 md:hidden"
    aria-label="Close sidebar"
  >
    <CloseIcon className="w-5 h-5 text-slate-600" />
  </button>
</div>


      {/* App  Sections */}
 <div className="px-3 py-4 space-y-1 border-b border-slate-200">
  <SidebarSectionButton
    label="Chat with Maya"
    icon={UserIcon}
    active={activeSection === "chat"}
    onClick={() => setActiveSection("chat")}
  />

  <SidebarSectionButton
    label="Health Insights"
    icon={ChartBarIcon}
    active={activeSection === "insights"}
    onClick={() => setActiveSection("insights")}
  />

  <SidebarSectionButton
    label="Health Journal"
    icon={JournalIcon}
    active={activeSection === "journal"}
    onClick={() => setActiveSection("journal")}
  />
</div>


      {/* Chat History Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
          CHAT HISTORY
        </span>

        <button
          onClick={() => {
            setActiveSection("chat");
            onNewChat();
          }}
          aria-label="New chat"
          className="
            h-7 w-7 rounded-full
            flex items-center justify-center
            bg-slate-100 hover:bg-slate-200
            ring-1 ring-slate-200
            transition
          "
        >
          <PlusIcon className="w-3.5 h-3.5 text-slate-600" />
        </button>
      </div>

      {/* Thread list */}
      <nav
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5 overscroll-contain"
        aria-label="Threads"
      >
        {threads.length === 0 && (
          <div className="text-sm text-slate-500 px-2 py-2">
            No conversations yet
          </div>
        )}

        {threads.map((t) => {
          const id = t.threadHandle;
          const isActive = (currentThreadId ?? activeThread) === id;
          const label = t.title || "Maya Chat";

          return (
            <div key={id} className="relative">
            <div
  role="button"
  tabIndex={0}
  title={label}
  onClick={() => handleSelect(id)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(id);
    }
  }}
  className={[
    "w-full px-3 py-2 rounded-xl text-left transition",
    "flex items-center justify-between",
    "ring-1",
    isActive
      ? "bg-indigo-50 text-indigo-700 ring-indigo-200 shadow-sm"
      : "bg-white text-slate-700 ring-transparent hover:ring-slate-200 hover:bg-slate-50",
  ].join(" ")}
>

                <div className="flex items-center gap-2 truncate">
                  <MessageIcon
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isActive ? "text-indigo-600" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate text-[13px] font-medium">
                    {label}
                  </span>
                </div>

                <button
                  onClick={toggleMenu(id)}
                  aria-haspopup="true"
                  aria-expanded={openMenu === id}
                  aria-label="Thread options"
                  className="p-1.5 rounded-md hover:bg-slate-100"
                  type="button"
                >
                  <svg
                    className="w-4 h-4 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="5" cy="12" r="1.6" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                    <circle cx="19" cy="12" r="1.6" fill="currentColor" />
                  </svg>
                </button>
              </div>

              {openMenu === id && (
                <div
                  className="absolute right-2 top-11 z-50"
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
{/* Bottom Upgrade CTA */}
<div className="shrink-0 border-t border-slate-200 px-4 py-4 bg-white/90 backdrop-blur">
  <div
    className="
      rounded-xl
      border border-indigo-100
      bg-indigo-50/50
      px-4 py-3
      flex items-start gap-3
    "
  >
    {/* Accent dot */}
    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500 flex-shrink-0" />

    <div className="flex-1">
      <div className="text-sm font-semibold text-slate-900">
        Upgrade to Premium
      </div>
      <div className="text-xs text-slate-600 mt-0.5">
        Unlock deeper insights, longer chats, and more support.
      </div>

      <button
        onClick={onUpgrade}
        className="
          mt-2 inline-flex items-center
          text-sm font-medium text-indigo-700
          hover:text-indigo-800
          transition
        "
      >
        View plans →
      </button>
    </div>
  </div>
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
