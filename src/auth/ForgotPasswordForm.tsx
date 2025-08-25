// src/auth/ForgotPasswordForm.tsx
import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function ForgotPasswordForm() {
  const { startResetPassword, finishResetPassword, setRoute, error, clearError } = useAuth();
  const [stage, setStage] = useState<"request"|"confirm">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function request(e: React.FormEvent) {
    e.preventDefault(); clearError(); setMsg(null);
    setLoading(true);
    if(loading)
    try {
      await startResetPassword(email);
      setStage("confirm");
      setMsg("Code sent to your email.");
    } finally { setLoading(false); }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault(); clearError(); setMsg(null);
    setLoading(true);
    try {
      await finishResetPassword(email, code, pwd);
      setMsg("Password reset! You can sign in now.");
      setRoute("signIn");
    } finally { setLoading(false); }
  }

  return stage === "request" ? (
    <form onSubmit={request} className="space-y-4">
      <h2 className="text-xl font-semibold text-[#1B2245]">Reset your password</h2>
      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <button className="w-full rounded-lg p-3 bg-[#1B2245] text-white hover:opacity-90">
        Send code
      </button>
      <div className="text-sm text-center">
        <button type="button" onClick={() => setRoute("signIn")} className="underline text-[#1B2245]">
          Back to sign in
        </button>
      </div>
    </form>
  ) : (
    <form onSubmit={confirm} className="space-y-4">
      <h2 className="text-xl font-semibold text-[#1B2245]">Enter the code</h2>
      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <input
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#BBBFFE]"
        placeholder="New password"
        type="password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <button className="w-full rounded-lg p-3 bg-[#1B2245] text-white hover:opacity-90">
        Confirm reset
      </button>
      <div className="text-sm text-center">
        <button type="button" onClick={() => setRoute("signIn")} className="underline text-[#1B2245]">
          Back to sign in
        </button>
      </div>
    </form>
  );
}
