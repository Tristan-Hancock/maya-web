// SettingsModal.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { useApp } from "../../appContext";
import DeleteAccountModal from "./deletaccount";

type Props = {
  onClose: () => void;
  onOpenSubscription?: () => void;
};

function fmtDate(sec?: number | null) {
  if (!sec) return "";
  try {
    return new Date(sec * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch { return ""; }
}

const SettingsModal: React.FC<Props> = ({ onClose, onOpenSubscription }) => {
  const { sub } = useApp();
  const [showDelete, setShowDelete] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const cancelAt = (sub as any)?.cancel_at as number | undefined;
  const cpe = (sub as any)?.current_period_end as number | undefined;

  const planLabel = useMemo(() => {
    if (!sub) return "Free";
    const code = sub.plan_code || "free";
    switch (sub.status) {
      case "active": return `${code} (Active)`;
      case "cancel_at_period_end": return `${code} (Cancels at period end)`;
      case "past_due": return `${code} (Payment issue)`;
      case "canceled": return "Free";
      default: return "Free";
    }
  }, [sub]);

  useEffect(() => {
    (async () => {
      try {
        const { tokens } = await fetchAuthSession();
        const mail = (tokens?.idToken as any)?.payload?.email as string | undefined;
        if (mail) setEmail(mail);
      } catch {}
    })();
  }, []);

  const handleSubscribe = useCallback(() => {
    setErr(null);
    onOpenSubscription?.();
  }, [onOpenSubscription]);

  // Opens Stripe Billing Portal (user can cancel there; webhook updates DB)
  const handleCancelSubscription = useCallback(async () => {
    try {
      setErr(null);
      setBusy(true);

      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();
      if (!idToken) throw new Error("Not authenticated");

      const base = (import.meta as any).env?.VITE_API_BILLING_STRIPE_STAGE as string;
      if (!base) throw new Error("Billing base URL not configured (VITE_API_BILLING_STRIPE_STAGE)");

      const url = base.endsWith("/")
        ? `${base}billing/stripe/portal`
        : `${base}/billing/stripe/portal`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Portal request failed (${res.status})`);
      }

      const portalUrl = data?.url as string;
      if (!portalUrl) throw new Error("Portal URL missing from response");

      window.location.assign(portalUrl);
    } catch (e: any) {
      setErr(e?.message || "Failed to open billing portal");
    } finally {
      setBusy(false);
    }
  }, []);

  const hasActiveSub =
    sub?.status === "active" ||
    sub?.status === "cancel_at_period_end" ||
    sub?.status === "past_due";

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
              {sub?.status === "cancel_at_period_end" && (
                <div className="text-xs text-gray-500">
                  Scheduled to cancel on{" "}
                  <span className="font-medium">
                    {fmtDate(cancelAt || cpe) || "period end"}
                  </span>
                  . You’ll keep access until then.
                </div>
              )}
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
                  disabled={busy}
                  className="rounded-xl px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-70"
                >
                  {busy ? "Opening portal…" : "Manage / Cancel Subscription"}
                </button>
              )}
              {err && <div className="text-sm text-red-600">{err}</div>}
            </div>
          </section>

          {/* Account */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Account</h3>
            <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => { setShowDelete(true); }}
                className="rounded-xl px-4 py-2 bg-red-600 text-white hover:bg-red-700"
              >
                Delete Account
              </button>
            </div>
          </section>
        </div>
      </div>

      {showDelete && (
        <DeleteAccountModal
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            setShowDelete(false);
            onClose();
          }}
        />
      )}
    </div>
  );
};

export default SettingsModal;
