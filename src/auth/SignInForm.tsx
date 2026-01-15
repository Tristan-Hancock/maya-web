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
    <div className="w-full">
      <form
        onSubmit={onSubmit}
        className="space-y-5"
      >
        {/* Desktop-only heading */}
        {variant === "desktop" && (
          <>
            <h2 className="text-xl font-semibold text-[#1B2245]">
              Welcome
            </h2>
            <p className="text-sm text-gray-600">
              Sign in to continue
            </p>
          </>
        )}

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

        {/* Error (fixed height so layout doesn’t jump) */}
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
            text-sm
            font-medium
            hover:opacity-90
            disabled:opacity-60
          "
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {/* Footer links */}
        <div className="flex justify-between pt-2 text-sm text-[#1B2245]">
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
