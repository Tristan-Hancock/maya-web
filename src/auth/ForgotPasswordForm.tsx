import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function ForgotPasswordForm() {
  const {
    startResetPassword,
    finishResetPassword,
    setRoute,
    error,
    clearError,
  } = useAuth();

  const [stage, setStage] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setMsg(null);
    setLoading(true);
    try {
      await startResetPassword(email);
      setStage("confirm");
      setMsg("Confirmation code sent to your email.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setMsg(null);
    setLoading(true);
    try {
      await finishResetPassword(email, code, pwd);
      setMsg("Password reset. You can sign in now.");
      setRoute("signIn");
    } finally {
      setLoading(false);
    }
  }

  return stage === "request" ? (
    <form onSubmit={request} className="space-y-5">
      {/* Instruction */}
      <p
        className="text-[15px] leading-[30px] text-[#6B7280]"
        style={{ fontFamily: "Inter" }}
      >
        Enter your email to receive a reset code.
      </p>

      {/* Email */}
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

      {/* Message space */}
      <div className="min-h-[16px]">
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        {!error && msg && (
          <p className="text-xs text-green-600">{msg}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full
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
        {loading ? "Sending…" : "Send code"}
      </button>

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
  ) : (
    <form onSubmit={confirm} className="space-y-5">
      {/* Instruction */}
      <p
        className="text-[15px] leading-[30px] text-[#6B7280]"
        style={{ fontFamily: "Inter" }}
      >
        Enter the code sent to your email and choose a new password.
      </p>

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

      {/* New password */}
      <div className="relative">
        <input
          type={showPwd ? "text" : "password"}
          placeholder="New password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          className="
            w-full
            h-[52px]
            pl-4
            pr-14
            rounded-xl
            border
            text-sm
            text-[#0F172A]
            placeholder-gray-400
            outline-none
            focus:ring-2 focus:ring-[#BBBFFE]
          "
        />
        <button
          type="button"
          onClick={() => setShowPwd((v) => !v)}
          className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-[#1B2245] hover:opacity-80"
          aria-label={showPwd ? "Hide password" : "Show password"}
        >
          {showPwd ? "Hide" : "Show"}
        </button>
      </div>

      {/* Message space */}
      <div className="min-h-[16px]">
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        {!error && msg && (
          <p className="text-xs text-green-600">{msg}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full
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
        {loading ? "Resetting…" : "Confirm reset"}
      </button>

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
