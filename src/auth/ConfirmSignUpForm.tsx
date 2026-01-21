import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export default function ConfirmSignUpForm() {
  const {
    doConfirmSignUp,
    doResendCode,
    setRoute,
    error,
    clearError,
    pendingEmail,
    setPendingEmail,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (pendingEmail) setEmail(pendingEmail);
  }, [pendingEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setMsg(null);
    setLoading(true);
    try {
      const emailArg = pendingEmail ? null : email;
      await doConfirmSignUp(emailArg, code);
      setMsg("Email confirmed. You can sign in now.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    clearError();
    setMsg(null);
    try {
      const emailArg = pendingEmail ? null : email;
      await doResendCode(emailArg);
      setMsg("Confirmation code sent.");
      if (!pendingEmail && email) setPendingEmail(email);
    } catch {}
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Instruction */}
      {pendingEmail && (
        <p className="text-[15px] leading-[24px] text-[#6B7280]">
          Enter the confirmation code sent to{" "}
          <span className="font-medium text-[#0F172A]">
            {pendingEmail}
          </span>
        </p>
      )}

      {/* Email (only if missing) */}
      {!pendingEmail && (
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="
            w-full
            h-[52px]
            px-4
            rounded-xl
            border
            text-sm
            text-[#0F172A]
            placeholder-gray-400
            outline-none
            focus:ring-2 focus:ring-[#BBBFFE]
          "
        />
      )}

      {/* Code */}
      <input
        type="text"
        placeholder="Confirmation code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="
          w-full
          h-[52px]
          px-4
          rounded-xl
          border
          text-sm
          text-[#0F172A]
          placeholder-gray-400
          outline-none
          focus:ring-2 focus:ring-[#BBBFFE]
        "
      />

      {/* Messages (fixed space) */}
      <div className="min-h-[16px]">
        {error && (
          <p className="text-xs text-red-600">
            {error}
          </p>
        )}
        {!error && msg && (
          <p className="text-xs text-green-600">
            {msg}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="
            flex-1
            h-[52px]
            rounded-xl
            bg-[#1B2245]
            text-white
            text-[16px]
            font-semibold
            leading-[30px]
            hover:opacity-90
            disabled:opacity-60
          "
          style={{ fontFamily: "Inter" }}
        >
          {loading ? "Confirming…" : "Confirm"}
        </button>

        <button
          type="button"
          onClick={resend}
          className="
            flex-1
            h-[52px]
            rounded-xl
            border
            text-sm
            text-[#1B2245]
            hover:bg-gray-50
          "
        >
          Resend
        </button>
      </div>

      {/* Footer link */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => setRoute("signIn")}
          className="text-sm underline text-[#1B2245]"
        >
          Back to sign in
        </button>
      </div>
    </form>
  );
}
