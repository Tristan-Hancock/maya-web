// src/auth/SignUpForm.tsx
import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function SignUpForm() {
  const { doSignUp, setRoute, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
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
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-[#1B2245]">Create your account</h2>

      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="Create a password"
        type="password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
      />
      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="Confirm password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={loading}
        className="w-full rounded-lg p-3 bg-[#1B2245] text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Creating…" : "Sign up"}
      </button>

      <div className="text-sm text-center">
        <button type="button" onClick={() => setRoute("signIn")} className="underline text-[#1B2245]">
          Back to sign in
        </button>
      </div>
    </form>
  );
}
