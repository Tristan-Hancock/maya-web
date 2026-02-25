
type VoiceGate =
  | { kind: "cooldown_active"; waitMs: number }
  | { kind: "minutes_exhausted"; used?: number; cap?: number }
  | { kind: "voice_disabled" }
  | { kind: "concurrent_call" }
  | { kind: "generic"; message: string };

  export default function VoiceGateModal({
    gate,
    onClose,
    onUpgrade,
  }: {
    gate: VoiceGate | null;
    onClose: () => void;
    onUpgrade: () => void;
  }) {
    if (!gate) return null;
  
    const copy = (() => {
      switch (gate.kind) {
        case "cooldown_active":
          return {
            title: "Voice is on cooldown",
            body: `You can start another call shortly. Purchase Maya Minutes to skip cooldowns.`,
          };
        case "minutes_exhausted":
          return {
            title: "You’ve used your voice minutes",
            body: `You’ve used your included minutes${
              gate.cap !== undefined ? ` (${gate.used ?? 0}/${gate.cap} min)` : ""
            }. Purchase more Maya Minutes to continue instantly.`,
          };
        case "voice_disabled":
          return {
            title: "Voice not available",
            body: "Voice calls require Maya Minutes. Purchase minutes to start talking.",
          };
        case "concurrent_call":
          return {
            title: "Call already active",
            body: "You already have a voice session in progress. End it before starting a new one.",
          };
        default:
          return {
            title: "Voice temporarily unavailable",
            body: gate.message || "Please try again in a moment.",
          };
      }
    })();
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-md rounded-3xl bg-white shadow-[0_20px_60px_rgba(15,23,42,0.15)] border border-[#E6EAF2] overflow-hidden">
  
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
            aria-label="Close"
          >
            ✕
          </button>
  
          {/* Content */}
          <div className="p-8 text-center">
            <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {copy.title}
            </h3>
  
            <p className="mt-4 text-sm text-[#475569] leading-relaxed">
              {copy.body}
            </p>
  
            {/* CTA */}
            <button
              onClick={onUpgrade}
              className="
                mt-8
                w-full
                py-4
                rounded-2xl
                text-white
                font-semibold
                text-lg
                tracking-wide
                bg-gradient-to-r
                from-pink-500
                via-fuchsia-500
                to-purple-500
                shadow-[0_8px_24px_rgba(236,72,153,0.35)]
                hover:shadow-[0_12px_32px_rgba(236,72,153,0.45)]
                hover:scale-[1.02]
                active:scale-[0.98]
                transition-all duration-200
              "
            >
              Purchase Maya Minutes
            </button>
          </div>
        </div>
      </div>
    );
  }