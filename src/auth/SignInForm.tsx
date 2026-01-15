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
        className={variant === "mobile" ? "space-y-5" : "space-y-4"}
      >
        {/* Desktop title only */}
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
          className={`w-full border rounded-xl p-4 text-base outline-none
            focus:ring-2 focus:ring-[#BBBFFE]`}
          placeholder="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <div className="relative">
          <input
            className={`w-full border rounded-xl p-4 pr-12 text-base outline-none
              focus:ring-2 focus:ring-[#BBBFFE]`}
            placeholder="Password"
            type={showPwd ? "text" : "password"}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          {pwd.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500"
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 leading-snug">{error}</p>
        )}

        {/* Submit */}
        <button
          disabled={loading}
          className={`w-full rounded-xl py-4 text-white font-medium
            bg-[#1B2245] hover:opacity-90 disabled:opacity-60`}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {/* Footer links */}
        <div
          className={`text-sm text-[#1B2245] ${
            variant === "mobile"
              ? "flex justify-between pt-2"
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
