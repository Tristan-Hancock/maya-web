// src/AuthGate.tsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./auth/AuthContext";
import AuthShell from "./auth/AuthShell";
import SignInForm from "./auth/SignInForm";
import SignUpForm from "./auth/SignUpForm";
import ConfirmSignUpForm from "./auth/ConfirmSignUpForm";
import ForgotPasswordForm from "./auth/ForgotPasswordForm";

// If you already have a MenuIcon component, import it.
// Otherwise this inline icon works the same.
function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
    </svg>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { route, user, doSignOut, loading, displayLabel, displayInitial } = useAuth();

  // Right account menu (existing)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Left sidebar (NEW)
  const [leftOpen, setLeftOpen] = useState(false);

  // Close menus on route/user change
  useEffect(() => {
    setMenuOpen(false);
    setLeftOpen(false);
  }, [route, user]);

  // Click-away + Esc for account menu
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

  // Esc closes left sidebar
  useEffect(() => {
    if (!leftOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLeftOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [leftOpen]);

  const handleSignOut = async () => {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("maya:") && k.endsWith(":threadHandle")) {
          localStorage.removeItem(k);
        }
      });
      localStorage.clear(); // optional
      await doSignOut();
    } catch (e) {
      console.error("Sign out failed:", e);
    }
  };

  if (loading) {
    return (
      <AuthShell>
        <div className="text-center text-[#1B2245]">Loading…</div>
      </AuthShell>
    );
  }

  if (route === "app" && user) {
    const username = displayLabel || "User";
    const initial = displayInitial || "U";

    return (
      <div className="w-full h-full">
        {/* Layout: fixed sidebar + content that shifts with margin */}
        <aside
          className={[
            "fixed left-0 top-0 h-full w-72 bg-white border-r border-gray-200 shadow-lg z-40",
            "transition-transform duration-200 ease-out",
            leftOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b">
            <div className="font-semibold text-[#1B2245]">Threads</div>
            <button
              onClick={() => setLeftOpen(false)}
              className="text-sm px-2 py-1 rounded hover:bg-gray-100"
            >
              Close
            </button>
          </div>

          {/* TODO: Replace with actual thread list */}
          <div className="p-3 space-y-2">
            <button
              className="w-full text-left px-3 py-2 rounded-lg bg-[#6B66FF] text-white hover:bg-[#5853e6] transition"
              onClick={() => {
                // Signal app to start a new thread: remove any stored handle(s)
                Object.keys(localStorage).forEach((k) => {
                  if (k.startsWith("maya:") && k.endsWith(":threadHandle")) {
                    localStorage.removeItem(k);
                  }
                });
                setLeftOpen(false);
              }}
            >
              + New Thread
            </button>

            <div className="text-xs text-gray-500">
              (Thread list placeholder)
            </div>
          </div>
        </aside>

        {/* Content wrapper that shifts right when sidebar opens */}
        <div
          className={[
            "min-h-screen transition-[margin] duration-200 ease-out",
            leftOpen ? "ml-72" : "ml-0",
          ].join(" ")}
        >
          {/* Top bar: left menu button + right account menu */}
          <div className="relative top-0 z-30 w-full bg-gradient-to-b from-white/90 to-white/0">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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
                    <path d="M12 12c2.761 0 5-2.462 5-5.5S14.761 1 12 1 7 3.462 7 6.5 9.239 12 12 12zm0 2c-4.418 0-8 3.134-8 7v1h16v-1c0-3.866-3.582-7-8-7z"/>
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
                      <button type="button" className="w-full text-sm px-3 py-2 rounded-xl hover:bg-gray-100 transition">
                        Subscription
                      </button>
                      <button type="button" className="w-full text-sm px-3 py-2 rounded-xl hover:bg-gray-100 transition">
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

          {/* App content */}
          {children}
        </div>
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
