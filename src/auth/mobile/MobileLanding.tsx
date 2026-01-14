import React from "react";
import {
  HeartPulseIcon,
  DocumentSearchIcon,
  DumbbellIcon,
  WaveformIcon,
  PlayCircleIcon,
} from "../../components/icons/iconslist";

export default function MobileLanding({
  onContinue,
}: {
  onContinue: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(#EDEEFF,#FFFFFF)]">
      {/* Brand */}
      <div className="text-center pt-10 pb-6">
        <h1 className="text-4xl font-extrabold text-[#1B2245]">Ovelia</h1>
      </div>

      {/* Bottom sheet */}
      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-8 shadow-xl">
        <h2 className="text-lg font-semibold">
          Meet Maya, your{" "}
          <span className="text-indigo-600">fitness guide.</span>
        </h2>

        {/* Audio CTA */}
        <button className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-indigo-50 w-full">
          <PlayCircleIcon className="w-6 h-6 text-indigo-600" />
          <div className="text-left">
            <div className="font-medium text-indigo-800">
              Hear from Maya
            </div>
            <div className="text-xs text-indigo-600">
              Listen to quick introduction.
            </div>
          </div>
        </button>

        {/* Features */}
        <div className="mt-6 space-y-4">
          <Feature icon={<HeartPulseIcon />} title="Expert Health insights" />
          <Feature icon={<DocumentSearchIcon />} title="Analyze Medical Reports" />
          <Feature icon={<DumbbellIcon />} title="Personalized Wellness" />
          <Feature icon={<WaveformIcon />} title="Natural Voice Conversations" />
        </div>

        {/* Example input */}
        <input
          disabled
          placeholder="How can I manage my PCOS symptoms?"
          className="mt-6 w-full border rounded-full p-3 text-sm text-gray-500"
        />

        {/* CTA */}
        <button
          onClick={onContinue}
          className="mt-6 w-full rounded-xl p-4 bg-[#1B2245] text-white"
        >
          Login / sign up
        </button>

        {/* Footer */}
        <p className="text-xs text-center text-gray-500 mt-4">
          Maya can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
    </div>
  );
}
