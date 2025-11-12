// src/auth/AuthShell.tsx
import React from "react";
import AuthFeaturePanel from "./AuthFeaturePanel"; // ← adjust path if different

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex">
      {/* LEFT: feature panel (desktop only) */}
      <div className="hidden md:flex w-1/2 bg-white">
        <AuthFeaturePanel />
      </div>

      {/* RIGHT: auth column with gradient bg */}
      <div className="flex w-full md:w-1/2 items-center justify-center px-4
                      bg-[repeating-linear-gradient(to_bottom,#EAEBFF_0%,#FFFFFF_40%,#EAEBFF_80%)]">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-[#1B2245] tracking-tight">
              Maya
            </h1>
            <p className="mt-2 text-sm text-gray-600">Sign in to continue</p>
          </div>

          {/* Auth card */}
          <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-xl p-8 sm:p-10">
            {children}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Maya can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
