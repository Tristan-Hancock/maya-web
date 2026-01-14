import React from "react";

export default function MobileAuthShell({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(#EDEEFF,#FFFFFF)]">
      {/* Header */}
      <div className="pt-6 px-4 flex items-center">
        <button
          onClick={onBack}
          aria-label="Back"
          className="text-xl"
        >
          ←
        </button>
        <h1 className="flex-1 text-center font-semibold text-[#1B2245]">
          Welcome
        </h1>
      </div>

      {/* Card */}
      <div className="mt-6 mx-4 bg-white rounded-2xl shadow-xl p-6">
        {children}
      </div>

      {/* Footer logo */}
      <div className="mt-10 flex justify-center">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C8 6 6 9 6 12a6 6 0 0012 0c0-3-2-6-6-10z"
            stroke="#1B2245"
          />
        </svg>
      </div>

      <p className="text-xs text-center text-gray-500 mt-4">
        Maya can make mistakes. Verify important information.
      </p>
    </div>
  );
}
