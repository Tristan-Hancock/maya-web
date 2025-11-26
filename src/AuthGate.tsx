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
import SettingsModal from "./components/settings/settingsmodal";
function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
    </svg>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { route, user, doSignOut, loading, displayLabel, displayInitial } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false); // ✅ modal control
  const menuRef = useRef<HTMLDivElement>(null);
  const { boot, ready } = useApp();

  useEffect(() => {
    if (route === "app" && user) boot();
  }, [route, user, boot]);
  const {  activeThread, setActiveThread } = useApp();


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
      // ✅ Hard reset all local data to ensure no stale threads or tokens remain
      // console.log("[signout] clearing local + session storage…");
  
      try {
        // Remove all app-specific keys
        Object.keys(localStorage).forEach((k) => {
          if (k.includes("maya") || k.includes("thread") || k.includes("user")) {
            localStorage.removeItem(k);
          }
        });
  
        // Full wipe as safety
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn("[signout] local/session storage clear failed:", storageError);
      }
  
      // ✅ Amplify / Cognito sign-out
      await doSignOut();
  
      // console.log("[signout] complete — all caches cleared, user signed out.");
    } catch (e) {
      console.error("[signout] failed:", e);
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
          <div className="text-center text-[#1B2245]">Contacting Maya…</div>
        </AuthShell>
      );
    }

    
    return (
      <div className="w-full h-full relative">
        {/* Sidebar — desktop slide + mobile overlay */}
        {/* Desktop sidebar */}
        <div
          className={`hidden lg:block fixed inset-y-0 left-0 z-30 w-72 border-r bg-white transform transition-transform duration-200 ${
            leftOpen ? "translate-x-0" : "-translate-x-72"
          }`}
        >
          <Sidebar
            isOpen={leftOpen}
            currentThreadId={activeThread}
            onNewChat={() => {
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
        </div>
    
        {/* Mobile overlay sidebar */}
        {/* Mobile overlay sidebar with smooth slide + fade */}
<div
  className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
    leftOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
  }`}
>
  {/* backdrop */}
  <div
    className="absolute inset-0 bg-black/40 transition-opacity duration-300"
    onClick={() => setLeftOpen(false)}
    aria-hidden="true"
  />

  {/* sidebar panel */}
  <div
    className={`absolute inset-y-0 left-0 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
      leftOpen ? "translate-x-0" : "-translate-x-full"
    }`}
  >
    <Sidebar
      isOpen={leftOpen}
      currentThreadId={activeThread}
      onNewChat={() => {
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
  </div>
</div>

    
        {/* Fixed top bar */}
        <div
          className={`fixed top-0 right-0 z-30 h-14 bg-transparent  transition-[left] duration-200 ${
            leftOpen ? "lg:left-72 left-0" : "left-0"
          }`}
        >
          <div className="h-full max-w-6xl mx-auto flex items-center justify-between">
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
                      onClick={() => {
                        setMenuOpen(false);
                        setShowSettings(true);
                      }}
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
        <div className={leftOpen ? "h-14 lg:ml-72 transition-[margin]" : "h-14"} />
    
        {/* Content */}
        <div className={`min-h-screen transition-[margin] duration-200 ${leftOpen ? "lg:ml-72" : ""}`}>
          {children}
        </div>
    
        {/* Subscription Popup */}
        {showSubscription && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSubscription(false)}
          >
            <div
              className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowSubscription(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
                aria-label="Close subscription"
              >
                ✕
              </button>
              <SubscriptionPage onClose={() => setShowSubscription(false)} />
            </div>
          </div>
        )}
    
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onOpenSubscription={() => {
              setShowSettings(false);
              setShowSubscription(true);
            }}
          />
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
