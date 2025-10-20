// src/auth/AuthShell.tsx
import React from "react";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-[#191D38] bg-[repeating-linear-gradient(to_bottom,#EAEBFF_0%,#FFFFFF_40%,#EAEBFF_80%)] px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-[#1B2245] tracking-tight">
            Ovelia
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to continue
          </p>
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
  );
}
