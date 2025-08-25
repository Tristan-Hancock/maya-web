// src/auth/ConfirmSignUpForm.tsx
import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function ConfirmSignUpForm() {
  const { doConfirmSignUp, doResendCode, setRoute, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError(); setMsg(null);
    setLoading(true);
    try {
      await doConfirmSignUp(email, code);
      setMsg("Email confirmed! You can sign in now.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    clearError(); setMsg(null);
    await doResendCode(email);
    setMsg("Code sent.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-[#1B2245]">Confirm your email</h2>

      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="Confirmation code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}

      <div className="flex gap-2">
        <button
          disabled={loading}
          className="flex-1 rounded-lg p-3 bg-[#1B2245] text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Confirming…" : "Confirm"}
        </button>
        <button type="button" onClick={resend} className="flex-1 rounded-lg p-3 border">
          Resend
        </button>
      </div>

      <div className="text-sm text-center">
        <button type="button" onClick={() => setRoute("signIn")} className="underline text-[#1B2245]">
          Back to sign in
        </button>
      </div>
    </form>
  );
}
