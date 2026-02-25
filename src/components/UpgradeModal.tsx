type UpgradeReason =
  | { kind: "thread_limit"; cap?: number }
  | { kind: "prompt_cap" }
  | { kind: "doc_cap" }
  | { kind: "generic" };

export default function UpgradeModal({
  reason,
  onClose,
  onUpgrade,
}: {
  reason: UpgradeReason | null;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  if (!reason) return null;

  const copy = (() => {
    switch (reason.kind) {
      case "thread_limit":
        return {
          title: "Thread limit reached",
          body: `You’ve reached your free thread limit${
            reason.cap !== undefined ? ` (${reason.cap})` : ""
          }. Upgrade to create more conversations.`,
        };
      case "prompt_cap":
        return {
          title: "Daily message limit reached",
          body: "You’ve used your free messages for today. Upgrade to continue instantly.",
        };
      case "doc_cap":
        return {
          title: "Document limit reached",
          body: "You’ve reached your document upload limit. Upgrade to attach more files.",
        };
      default:
        return {
          title: "Upgrade required",
          body: "Upgrade your plan to continue using this feature.",
        };
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