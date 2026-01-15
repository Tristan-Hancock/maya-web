import React from "react";

export default function MobileAuthShell({
  children,
  onBack,
  showBack = true,
  title = "Welcome",
  subtitle,
}: {
  children: React.ReactNode;
  onBack: () => void;
  showBack?: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(#EDEEFF,#FFFFFF)]">
      {/* Brand */}
      <div className="text-center pt-8 pb-6 shrink-0">
        <h1
          className="font-extrabold text-[#1B2245]"
          style={{
            fontFamily: "Inter",
            fontSize: "55px",
            lineHeight: "24px",
          }}
        >
          Ovelia
        </h1>
      </div>

      {/* FULL-HEIGHT SHEET */}
      <div className="flex-1 bg-white rounded-t-[32px] shadow-xl flex flex-col px-6 pt-6">
        {/* Header */}
        <div className="flex items-center mb-4">
          {showBack ? (
            <button
              onClick={onBack}
              aria-label="Back"
              className="text-xl text-[#1B2245]"
            >
              ←
            </button>
          ) : (
            <div className="w-6" />
          )}

          <h2 className="flex-1 text-center font-semibold text-[#1B2245]">
            {title}
          </h2>

          {/* Spacer to keep title centered */}
          <div className="w-6" />
        </div>

        {subtitle && (
          <p className="text-sm text-gray-600 mb-6 text-center">
            {subtitle}
          </p>
        )}

        {/* MAIN CONTENT */}
        <div className="flex-1">
          {children}
        </div>

        {/* FOOTER (INSIDE SHEET) */}
        <div className="flex flex-col items-center pb-6 pt-8">
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

          <p className="text-xs text-center text-gray-500 mt-4">
            Maya can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
