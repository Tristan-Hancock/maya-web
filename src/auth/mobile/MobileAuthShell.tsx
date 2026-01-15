import React from "react";

export default function MobileAuthShell({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(#EDEEFF,#FFFFFF)]">
      {/* Brand (same as landing) */}
      <div className="text-center pt-10 pb-6">
        <h1 className="text-4xl font-extrabold text-[#1B2245]">Ovelia</h1>
      </div>

      {/* Shared widget container */}
      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-6 shadow-xl relative">
        {/* Header row */}
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            aria-label="Back"
            className="text-xl text-[#1B2245]"
          >
            ←
          </button>
          <h2 className="flex-1 text-center font-semibold text-[#1B2245]">
            Welcome
          </h2>
          {/* spacer to keep title centered */}
          <div className="w-6" />
        </div>

        {/* Subtitle */}
        <p className="text-sm text-gray-600 mb-6">
          Sign in to continue
        </p>

        {/* Injected form */}
        {children}
      </div>

      {/* Footer icon */}
      <div className="mt-10 flex justify-center">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1B2245"
          strokeWidth="1.5"
        >
          <path d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z" />
        </svg>
      </div>

      {/* Footer disclaimer */}
      <p className="text-xs text-center text-gray-500 mt-4 mb-6">
        Maya can make mistakes. Verify important information.
      </p>
    </div>
  );
}
