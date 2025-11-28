// src/auth/ConfirmSignUpForm.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export default function ConfirmSignUpForm() {
  const { doConfirmSignUp, doResendCode, setRoute, error, clearError , pendingEmail, setPendingEmail} = useAuth();
  const [email, setEmail] = useState("");
  // store the email used for signup (so confirm step doesn't need re-entry)

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // keep local email in sync if pendingEmail changes
    if (pendingEmail) setEmail(pendingEmail);
  }, [pendingEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError(); setMsg(null);
    setLoading(true);
    try {
      // If pendingEmail exists, pass null so AuthContext uses it; otherwise pass the typed email
      const emailArg = pendingEmail ? null : email;
      await doConfirmSignUp(emailArg, code);
      setMsg("Email confirmed! You can sign in now.");
      // after successful confirm, AuthContext routes to signIn and keeps pendingEmail for prefill
    } catch (err) {
      // error handled via context.error
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    clearError(); setMsg(null);
    try {
      const emailArg = pendingEmail ? null : email;
      await doResendCode(emailArg);
      setMsg("Code sent.");
      // ensure the pendingEmail is stored if user typed it
      if (!pendingEmail && email) setPendingEmail(email);
    } catch (err) {
      // error shown via context.error
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-[#1B2245]">Confirm your email</h2>

      {pendingEmail ? (
        <div className="text-sm text-gray-700">
          Enter the confirmation code sent to <span className="font-medium">{pendingEmail}</span>
        </div>
      ) : (
        <input
          className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
          placeholder="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      )}

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