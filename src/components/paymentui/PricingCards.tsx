// PricingCard.tsx
import React, { useState, useEffect, useMemo } from "react";
import type { Tier } from "../../types";
import { CheckIcon } from "../../components/icons/sidebaricons";

type SubMeta = {
  status: string; // "active" | "trialing" | "canceled" | "incomplete" | "none" ...
  cancel_at: number; // epoch seconds or 0
  current_period_end: number; // epoch seconds or 0
  days_left: number | null;
};

type PricingCardProps = {
  tier: Tier;
  currentPlanCode: string;                          // ← new
  subMeta: SubMeta;                                 // ← new
  onSubscribe: (tier: Tier) => Promise<void> | void;
  onManage?: () => void;
  onClose?: () => void;
};

const PLAN_ORDER = ["free", "tier1", "tier2", "tier3", "enterprise"];

function fmtDate(sec: number) {
  if (!sec) return "";
  return new Date(sec * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const PricingCard: React.FC<PricingCardProps> = ({ tier, currentPlanCode, subMeta, onSubscribe,  /* onManage, */ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isPopular = !!tier.popular;

  const relation = useMemo(() => {
    const a = PLAN_ORDER.indexOf(currentPlanCode);
    const b = PLAN_ORDER.indexOf(tier.planCode);
    if (a === -1 || b === -1) return "switch";
    if (b === a) return "current";
    return b > a ? "upgrade" : "downgrade";
  }, [currentPlanCode, tier.planCode]);

  const isCurrent = relation === "current" && (subMeta.status === "active" || subMeta.status === "trialing" || currentPlanCode === "free");

  const ctaLabel = useMemo(() => {
    if (isCurrent) return "Current Plan";
    return relation === "upgrade" ? "Upgrade" : relation === "downgrade" ? "Downgrade" : tier.ctaText;
  }, [isCurrent, relation, tier.ctaText]);

  const ctaClasses = `mt-8 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-full transition-colors ${
    isPopular
      ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-indigo-600"
      : "text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300 focus-visible:outline-indigo-600"
  }`;

  const handleSubscription = async () => {
    if (isCurrent) return; // no-op
    try {
      setIsLoading(true);
      setIsSuccess(false);
      await onSubscribe(tier);
      if (tier.planCode === "free") setIsSuccess(true);
    } catch (e) {
      console.error("Subscribe failed:", e);
      alert((e as Error)?.message || "Subscription failed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuccess && onClose) {
      const t = setTimeout(() => onClose(), 900);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onClose]);

  const renderButtonContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Processing...
        </div>
      );
    }
    if (isSuccess) return "Subscribed!";
    return ctaLabel;
  };

  // Info chips for current plan
  const showCancelChip = isCurrent && subMeta.cancel_at > 0;
  const showRenewChip = isCurrent && !showCancelChip && subMeta.current_period_end > 0 && currentPlanCode !== "free";

  return (
    <div className={`relative flex flex-col justify-between rounded-3xl p-8 ring-1 xl:p-10 ${isPopular ? "bg-gray-900 ring-gray-900" : "bg-white ring-gray-200"}`}>
      {onClose && (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className={`absolute top-3 right-3 rounded-md px-2 py-1 text-sm ${isPopular ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}
        >
          ✕
        </button>
      )}

      <div>
        <div className="flex items-center justify-between gap-x-4">
          <h3 className={`text-lg font-semibold leading-8 ${isPopular ? "text-white" : "text-gray-900"}`}>{tier.name}</h3>
          <div className="flex items-center gap-2">
            {isPopular && (
              <p className="rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-indigo-400">
                Most popular
              </p>
            )}
            {isCurrent && (
              <p className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-emerald-600">
                Current plan
              </p>
            )}
            {showCancelChip && (
              <p className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold leading-5 text-amber-600">
                Cancels on {fmtDate(subMeta.cancel_at)}
              </p>
            )}
            {showRenewChip && (
              <p className="rounded-full bg-blue-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-blue-700">
                Renews {fmtDate(subMeta.current_period_end)}
              </p>
            )}
          </div>
        </div>

        <p className={`mt-4 text-sm leading-6 ${isPopular ? "text-gray-300" : "text-gray-600"}`}>A plan that's right for you.</p>

        <p className="mt-6 flex items-baseline gap-x-1">
          <span className={`text-4xl font-bold tracking-tight ${isPopular ? "text-white" : "text-gray-900"}`}>{tier.price}</span>
        </p>

        <ul role="list" className={`mt-8 space-y-3 text-sm leading-6 ${isPopular ? "text-gray-300" : "text-gray-600"}`}>
          {tier.features.map((feature) => (
            <li key={feature} className="flex gap-x-3">
              <CheckIcon className={`h-6 w-5 flex-none ${isPopular ? "text-white" : "text-indigo-600"}`} aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>

        {isCurrent && subMeta.days_left !== null && currentPlanCode === "free" && (
          <p className={`mt-4 text-xs ${isPopular ? "text-gray-300" : "text-gray-600"}`}>
            You’re on the free plan. Upgrade to increase limits.
          </p>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={handleSubscription}
          disabled={isLoading || isSuccess || isCurrent}
          className={`${ctaClasses} ${isCurrent ? "cursor-default opacity-70" : ""} ${isSuccess ? "bg-green-500 hover:bg-green-500 cursor-default text-white" : ""} disabled:opacity-70`}
        >
          {renderButtonContent()}
        </button>

        {/* {isCurrent && onManage && currentPlanCode !== "free" && (
          <button
            onClick={onManage}
            className="w-full rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 ring-1 ring-inset ring-gray-300 hover:ring-gray-400"
          >
            Manage billing
          </button>
        )} */}
      </div>
    </div>
  );
};

export default PricingCard;
