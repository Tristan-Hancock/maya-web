import React from "react";
import { useAuth } from "./auth/AuthContext";
import AuthShell from "./auth/AuthShell";
import SignInForm from "./auth/SignInForm";
import SignUpForm from "./auth/SignUpForm";
import ConfirmSignUpForm from "./auth/ConfirmSignUpForm";
import ForgotPasswordForm from "./auth/ForgotPasswordForm";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { route, user, doSignOut, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      // Clear all threadHandle keys
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("maya:") && k.endsWith(":threadHandle")) {
          localStorage.removeItem(k);
        }
      });

      // Optionally nuke everything (if you prefer)
      localStorage.clear();

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
    return (
      <>
        <div className="absolute top-2 left-2 text-sm text-gray-700">
          Hello, {user.username}
        </div>
        <button
          onClick={handleSignOut}
          className="absolute top-2 right-2 px-3 py-1 bg-[#1B2245] text-white rounded"
        >
          Sign out
        </button>
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
