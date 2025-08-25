// src/auth/SignInForm.tsx
import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function SignInForm() {
  const { doSignIn, setRoute, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      await doSignIn(email, pwd);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-[#1B2245]">Welcome</h2>
      <p className="text-sm text-gray-600">Sign in to continue</p>

      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="Password"
        type="password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={loading}
        className="w-full rounded-lg p-3 bg-[#1B2245] text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <div className="flex justify-between text-sm text-[#1B2245]">
        <button type="button" onClick={() => setRoute("signUp")} className="underline">
          Create account
        </button>
        <button type="button" onClick={() => setRoute("forgotPassword")} className="underline">
          Forgot password?
        </button>
      </div>
    </form>
  );
}
