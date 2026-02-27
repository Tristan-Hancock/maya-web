import React from "react";
import OveliaLogo from "../../assets/Vector.svg";
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
        <img src={OveliaLogo} alt="Ovelia" className="w-9 h-9" />


          <p className="text-xs text-center text-gray-500 mt-4">
            Maya can make mistakes. Verify important information.
          </p>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-600">
            <a href="/terms-and-conditions" className="hover:underline">
              Terms
            </a>
            <a href="/privacy-policy" className="hover:underline">
              Privacy
            </a>
            <a href="/cookie-policy" className="hover:underline">
              Cookies
            </a>
          </div>
          <p className="mt-2 text-center text-[11px] text-gray-500">
            By using Maya, you agree to our{" "}
            <a href="/terms-and-conditions" className="underline">
              Terms and Conditions
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
