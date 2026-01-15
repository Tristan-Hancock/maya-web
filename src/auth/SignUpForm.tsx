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
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      await doSignUp(email, pwd);
      setPendingEmail(email);
      // AuthContext will route to confirmSignUp
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
      <input
        type="password"
        placeholder="Password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
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
