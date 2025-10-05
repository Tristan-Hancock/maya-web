// src/auth/SignUpForm.tsx
import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function SignUpForm() {
  const { doSignUp, setRoute, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (pwd !== confirm) return alert("Passwords do not match");
    setLoading(true);
    try {
      await doSignUp(email, pwd);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 relative">
      <h2 className="text-xl font-semibold text-[#1B2245]">Create your account</h2>

      {/* Email input */}
      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {/* Create Password */}
      <div className="relative">
        <input
          className="w-full border rounded-lg p-3 pr-10 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
          placeholder="Create a password"
          type={showPwd ? "text" : "password"}
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
        />
        {pwd.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-[#1B2245]"
            aria-label={showPwd ? "Hide password" : "Show password"}
          >
            {showPwd ? (
              // eye-off icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-10.75-7.5A10.05 10.05 0 015.11 7.14M9.88 9.88a3 3 0 104.24 4.24"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
              </svg>
            ) : (
              // eye icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Confirm Password */}
      <div className="relative">
        <input
          className="w-full border rounded-lg p-3 pr-10 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
          placeholder="Confirm password"
          type={showConfirm ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {confirm.length > 0 && (
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-[#1B2245]"
            aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirm ? (
              // eye-off icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-10.75-7.5A10.05 10.05 0 015.11 7.14M9.88 9.88a3 3 0 104.24 4.24"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
              </svg>
            ) : (
              // eye icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={loading}
        className="w-full rounded-lg p-3 bg-[#1B2245] text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Creating…" : "Sign up"}
      </button>

      <div className="text-sm text-center">
        <button
          type="button"
          onClick={() => setRoute("signIn")}
          className="underline text-[#1B2245]"
        >
          Back to sign in
        </button>
      </div>
    </form>
  );
}
