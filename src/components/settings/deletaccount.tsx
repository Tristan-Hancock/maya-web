import React, { useEffect, useMemo, useState } from "react";
import { deleteUser, fetchAuthSession } from "aws-amplify/auth";

type Props = {
  onClose: () => void;
  onDeleted?: () => void; // optional callback after successful deletion
};

const DeleteAccountModal: React.FC<Props> = ({ onClose, onDeleted }) => {
  const [email, setEmail] = useState<string>("");
  const [ack, setAck] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { tokens } = await fetchAuthSession();
        const mail = (tokens?.idToken as any)?.payload?.email as string | undefined;
        if (mail) setEmail(mail);
      } catch {}
    })();
  }, []);

  const canSubmit = useMemo(() => ack && confirmText.trim().toUpperCase() === "DELETE", [ack, confirmText]);

  async function handleDelete() {
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteUser();
      try { localStorage.clear(); } catch {}
      if (onDeleted) onDeleted();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to delete account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          aria-label="Close delete account"
        >
          ✕
        </button>

        <div className="p-6 space-y-5">
          <h2 className="text-xl font-semibold text-[#101532]">Delete Account</h2>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium mb-2">This action is permanent.</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Your account and profile will be removed.</li>
              <li>All threads and chat history will be deleted.</li>
              <li>This cannot be undone.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Email:</span>{" "}
              <span className="font-medium">{email || "—"}</span>
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            <span>
              I understand my account and data will be permanently deleted and cannot be recovered.
            </span>
          </label>

          <div className="text-sm">
            <label className="block text-gray-700 mb-1">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#101532]"
              placeholder="DELETE"
            />
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!canSubmit || busy}
              className="px-4 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Delete Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
