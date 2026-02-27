import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function SignUpForm() {
  const {
    doSignUp,
    setRoute,
    error,
    clearError,
    setPendingEmail,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await doSignUp(normalizedEmail, pwd);
      setPendingEmail(normalizedEmail);
      // AuthContext will route to confirmSignUp
    } catch {
      // AuthContext already sets and exposes user-facing error text.
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Instruction */}
      <p
        className="text-[15px] leading-[30px] text-[#6B7280]"
        style={{ fontFamily: "Inter" }}
      >
        Create an account to continue.
      </p>

      {/* Email */}
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
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

      {/* Password */}
      <div className="relative">
        <input
          type={showPwd ? "text" : "password"}
          placeholder="Password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          autoComplete="new-password"
          required
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

      {/* Error space (fixed height) */}
      <div className="min-h-[16px]">
        {error && (
          <p className="text-xs text-red-600">
            {error}
          </p>
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
        {loading ? "Creating account…" : "Create account"}
      </button>

      {/* Footer link */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => setRoute("signIn")}
          className="text-sm underline text-[#1B2245]"
        >
          Already have an account? Sign in
        </button>
      </div>
    </form>
  );
}
