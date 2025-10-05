// src/AuthGate.tsx
import React, { useState } from "react";
import { useAuth } from "./auth/AuthContext";
import AuthShell from "./auth/AuthShell";
import SignInForm from "./auth/SignInForm";
import SignUpForm from "./auth/SignUpForm";
import ConfirmSignUpForm from "./auth/ConfirmSignUpForm";
import ForgotPasswordForm from "./auth/ForgotPasswordForm";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { route, user, doSignOut, loading, displayLabel, displayInitial } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

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
      <>
        <div className="absolute top-2 right-2">
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
                <button
                  type="button"
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
                  onClick={doSignOut}
                  className="w-full text-sm px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        {children}
      </>
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
