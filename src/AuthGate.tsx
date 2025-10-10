//AuthGate.tsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./auth/AuthContext";
import AuthShell from "./auth/AuthShell";
import SignInForm from "./auth/SignInForm";
import SignUpForm from "./auth/SignUpForm";
import ConfirmSignUpForm from "./auth/ConfirmSignUpForm";
import ForgotPasswordForm from "./auth/ForgotPasswordForm";
import SubscriptionPage from "./components/subscriptions/Subscription"; // ✅ import popup component
import { useApp } from "./appContext";
import Sidebar from "./components/sidebar/sidebar";
function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
    </svg>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { route, user, doSignOut, loading, displayLabel, displayInitial } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false); // ✅ modal control
  const menuRef = useRef<HTMLDivElement>(null);
  const { boot, ready } = useApp();

  useEffect(() => {
    if (route === "app" && user) boot();
  }, [route, user, boot]);
  const { threads, activeThread, setActiveThread } = useApp();


  useEffect(() => {
    if (showSubscription) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [showSubscription]);
  
  useEffect(() => {
    setMenuOpen(false);
    setLeftOpen(false);
  }, [route, user]);

  // Click-away & ESC handling
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("maya:") && k.endsWith(":threadHandle")) localStorage.removeItem(k);
      });
      localStorage.clear();
      await doSignOut();
    } catch (e) {
      console.error("Sign out failed:", e);
    }
  };

  if (loading)
    return (
      <AuthShell>
        <div className="text-center text-[#1B2245]">Loading…</div>
      </AuthShell>
    );

  if (route === "app" && user ) {
    const username = displayLabel || "User";
    const initial = displayInitial || "U";

    if (route === "app" && user && !ready) {
      return (
        <AuthShell>
          <div className="text-center text-[#1B2245]">Preparing your workspace…</div>
        </AuthShell>
      );
    }
    return (
   
      <div className="w-full h-full relative">
        
        {/* Sidebar */}
        <Sidebar
  isOpen={leftOpen}
  currentThreadId={activeThread}
  onNewChat={() => {
    // clear any stored handle and reset active
    const subKey = (window as any)._mayaSubKey;
    if (subKey) localStorage.removeItem(`maya:${subKey}:threadHandle`);
    setActiveThread(null);
    setLeftOpen(false);
  }}
  onSelectThread={(h) => {
    setActiveThread(h);
    setLeftOpen(false);
  }}
  onClose={() => setLeftOpen(false)}
/>

        {/* Fixed top bar */}
        <div
          className={`fixed top-0 right-0 z-30 h-14 bg-white/95 backdrop-blur border-b border-gray-200 transition-[left] duration-200 ${
            leftOpen ? "left-72" : "left-0"
          }`}
        >
          <div className="h-full max-w-6xl mx-auto px-4 flex items-center justify-between">
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={() => setLeftOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <MenuIcon className="w-6 h-6 text-gray-700" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="User menu"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-9 w-9 rounded-full bg-[#1B2245] text-white flex items-center justify-center shadow hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M12 12c2.761 0 5-2.462 5-5.5S14.761 1 12 1 7 3.462 7 6.5 9.239 12 12 12zm0 2c-4.418 0-8 3.134-8 7v1h16v-1c0-3.866-3.582-7-8-7z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white shadow-xl p-6 flex flex-col items-center text-center">
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700">Hi {username}</div>
                  </div>

                  <div className="flex flex-col items-center gap-3 mb-5">
                    <div className="h-12 w-12 rounded-full bg-[#1B2245] text-white flex items-center justify-center text-lg font-semibold">
                      {initial}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    {/* ✅ Opens modal */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowSubscription(true);
                      }}
                      className="w-full text-sm px-3 py-2 rounded-xl hover:bg-gray-100 transition"
                    >
                      Subscription
                    </button>

                    <button
                      type="button"
                      className="w-full text-sm px-3 py-2 rounded-xl hover:bg-gray-100 transition"
                    >
                      Settings
                    </button>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-sm px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spacer under top bar */}
        <div className={leftOpen ? "ml-72 h-14 transition-[margin]" : "h-14"} />

        {/* Content */}
        <div
          className={`min-h-screen transition-[margin] duration-200 ${leftOpen ? "ml-72" : "ml-0"}`}
        >
          {children}
        </div>

        {/* ✅ Subscription Popup Modal */}
        {showSubscription && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    onClick={() => setShowSubscription(false)}  // close on backdrop click
  >
    <div
      className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 overflow-y-auto max-h-[90vh]"
      onClick={(e) => e.stopPropagation()}     // prevent closing when clicking inside
    >
      <button
        onClick={() => setShowSubscription(false)}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        aria-label="Close subscription"
      >
        ✕
      </button>

      {/* Pass onClose down so inner “Back to Chat”/close buttons can also dismiss */}
      <SubscriptionPage onClose={() => setShowSubscription(false)} />
    </div>
  </div>
)}

      </div>
    );
  }

  return (
    <AuthShell>
      {route === "signIn" && <SignInForm />}
      {route === "signUp" && <SignUpForm />}
      {route === "confirmSignUp" && <ConfirmSignUpForm />}
      {route === "forgotPassword" && <ForgotPasswordForm />}
    </AuthShell>
  );
}
