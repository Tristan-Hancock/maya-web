// src/auth/AuthShell.tsx
import React from "react";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF2] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-8xl font-extrabold text-[#1B2245]">Ovelia</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
