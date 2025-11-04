
type VoiceGate =
  | { kind: "cooldown_active"; waitMs: number }
  | { kind: "minutes_exhausted"; used?: number; cap?: number }
  | { kind: "voice_disabled" }
  | { kind: "concurrent_call" }
  | { kind: "generic"; message: string };

export function msToClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
}

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
          body: `You can start another call in ${msToClock(gate.waitMs)}. Upgrade to remove or reduce cooldowns.`,
        };
      case "minutes_exhausted":
        return {
          title: "Monthly voice minutes used",
          body: `You’ve used your voice minutes${gate.cap !== undefined ? ` (${gate.used ?? 0}/${gate.cap} min)` : ""} for this month. Upgrade to continue immediately.`,
        };
      case "voice_disabled":
        return {
          title: "Voice not available",
          body: "Your current plan does not include voice. Upgrade to enable voice calls.",
        };
      case "concurrent_call":
        return {
          title: "Call already active",
          body: "You already have a voice session in progress or within grace. End it before starting a new one.",
        };
      default:
        return { title: "Voice temporarily unavailable", body: gate.message };
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200">
        <div className="p-5">
          <h3 className="text-lg font-semibold text-[#1B2245]">{copy.title}</h3>
          <p className="mt-2 text-sm text-gray-700">{copy.body}</p>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
          <button
            onClick={onUpgrade}
            className="px-4 py-2 rounded-full text-white bg-[#6B66FF] hover:bg-[#5853e6]"
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
