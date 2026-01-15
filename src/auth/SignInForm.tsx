import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export default function SignInForm({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { doSignIn, setRoute, error, clearError, pendingEmail } = useAuth();

  const [email, setEmail] = useState<string>(pendingEmail ?? "");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pendingEmail) setEmail(pendingEmail);
  }, [pendingEmail]);

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
    <div
      className={`w-full mx-auto ${
        variant === "mobile"
          ? "max-w-none"
          : "max-w-[420px] px-4 sm:px-0"
      }`}
    >
      <form
        onSubmit={onSubmit}
        className={variant === "mobile" ? "space-y-4" : "space-y-4"}
      >
        {/* Desktop-only heading */}
        {variant === "desktop" && (
          <>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#1B2245]">
              Welcome
            </h2>
            <p className="text-sm text-gray-600">Sign in to continue</p>
          </>
        )}

        {/* Email */}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm outline-none
                     focus:ring-2 focus:ring-[#BBBFFE]"
        />

        {/* Password */}
        <div className="relative">
          <input
            type={showPwd ? "text" : "password"}
            placeholder="Password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 pr-12 text-sm outline-none
                       focus:ring-2 focus:ring-[#BBBFFE]"
          />
          {pwd.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute inset-y-0 right-0 flex items-center pr-4
                         text-gray-400"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 leading-snug">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3 bg-[#1B2245]
                     text-white text-sm font-medium
                     hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {/* Footer links */}
        <div
          className={`text-xs text-[#1B2245] ${
            variant === "mobile"
              ? "flex justify-between"
              : "flex flex-col sm:flex-row gap-2 sm:justify-between"
          }`}
        >
          <button
            type="button"
            onClick={() => setRoute("signUp")}
            className="underline"
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => setRoute("forgotPassword")}
            className="underline"
          >
            Forgot password?
          </button>
        </div>
      </form>
    </div>
  );
}
