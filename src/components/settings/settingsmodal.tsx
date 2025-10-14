import React, { useMemo, useState } from "react";
import { deleteUser, fetchAuthSession } from "aws-amplify/auth";
import { useApp } from "../../appContext";

type Props = {
  onClose: () => void;
  onOpenSubscription?: () => void; // hook into your existing SubscriptionPage modal
};

const SettingsModal: React.FC<Props> = ({ onClose, onOpenSubscription }) => {
  const { sub } = useApp();
  const [busy, setBusy] = useState<"idle" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  const planLabel = useMemo(() => {
    if (!sub) return "Free";
    if (sub.status === "active") return sub.plan_code ? `${sub.plan_code} (Active)` : "Active";
    return "Free";
  }, [sub]);

  const [email, setEmail] = useState<string>("");
  React.useEffect(() => {
    (async () => {
      try {
        const { tokens } = await fetchAuthSession();
        const mail = (tokens?.idToken as any)?.payload?.email as string | undefined;
        if (mail) setEmail(mail);
      } catch {}
    })();
  }, []);

  async function handleDeleteAccount() {
    if (!confirm("Are you sure? This will permanently delete your account and all data.")) return;
    setBusy("deleting");
    setError(null);
    try {
      await deleteUser(); // Amplify Auth (v6 modular API)
      // You might also want to clear localStorage here:
      try { localStorage.clear(); } catch {}
      // Let the shell/sign-out logic handle redirect after modal closes:
      onClose();
      // (Your AuthGate will see user state change and show AuthShell)
    } catch (e: any) {
      setError(e?.message || "Failed to delete account");
    } finally {
      setBusy("idle");
    }
  }

  function handleSubscribe() {
    if (onOpenSubscription) onOpenSubscription();
    else alert("Open subscription modal (placeholder).");
  }

  function handleCancelSubscription() {
    // Placeholder (Razorpay/Stripe cancel to be wired later)
    alert("Cancel subscription (placeholder).");
  }

  const hasActiveSub = sub?.status === "active";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          aria-label="Close settings"
        >
          ✕
        </button>

        <div className="p-6 space-y-6">
          <h2 className="text-xl font-semibold text-[#101532]">Settings</h2>

          {/* User Info */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-2">User</h3>
            <div className="rounded-xl border border-gray-200 p-4 space-y-2">
              <div className="text-sm">
                <span className="text-gray-500">Email:</span>{" "}
                <span className="font-medium">{email || "—"}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Plan:</span>{" "}
                <span className="font-medium">{planLabel}</span>
              </div>
            </div>
          </section>

          {/* Subscription */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Subscription & Billing</h3>
            <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
              {!hasActiveSub ? (
                <button
                  type="button"
                  onClick={handleSubscribe}
                  className="rounded-xl px-4 py-2 text-white bg-[#101532] hover:bg-indigo-600"
                >
                  Subscribe / Upgrade
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  className="rounded-xl px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </section>

          {/* Account */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Account</h3>
            <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={busy === "deleting"}
                className="rounded-xl px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busy === "deleting" ? "Deleting…" : "Delete Account"}
              </button>
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
