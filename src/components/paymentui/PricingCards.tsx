import React, { useState, useEffect, useMemo } from "react";
import type { Tier } from "../../types";
import { CheckIcon } from "../../components/icons/sidebaricons";

type SubMeta = {
  status: string;
  cancel_at: number;
  current_period_end: number;
  days_left: number | null;
};

type PricingCardProps = {
  tier: Tier;
  currentPlanCode: string;
  subMeta: SubMeta;
  onSubscribe: (tier: Tier) => Promise<void> | void;
  onManage?: () => void;
  onClose?: () => void;
};

const PLAN_ORDER = ["free", "tier1", "tier2", "tier3"];

function fmtDate(sec: number) {
  if (!sec) return "";
  return new Date(sec * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const PricingCard: React.FC<PricingCardProps> = ({
  tier,
  currentPlanCode,
  subMeta,
  onSubscribe,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isPopular = !!tier.popular;

  const relation = useMemo(() => {
    const a = PLAN_ORDER.indexOf(currentPlanCode);
    const b = PLAN_ORDER.indexOf(tier.planCode);
    if (a === b) return "current";
    return b > a ? "upgrade" : "downgrade";
  }, [currentPlanCode, tier.planCode]);

  const isCurrent =
    relation === "current" &&
    (subMeta.status === "active" ||
      subMeta.status === "trialing" ||
      currentPlanCode === "free");

  const ctaLabel = useMemo(() => {
    if (isCurrent) return "Current Plan";
    return relation === "upgrade" ? "Upgrade" : "Downgrade";
  }, [isCurrent, relation]);

  const handleSubscription = async () => {
    if (isCurrent) return;
    try {
      setIsLoading(true);
      setIsSuccess(false);
      await onSubscribe(tier);
      if (tier.planCode === "free") setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuccess && onClose) {
      const t = setTimeout(onClose, 900);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onClose]);

  const showCancelChip = isCurrent && subMeta.cancel_at > 0;
  const showRenewChip =
    isCurrent &&
    !showCancelChip &&
    subMeta.current_period_end > 0 &&
    currentPlanCode !== "free";

  return (
    <div
      className={`relative flex flex-col ring-1 ${
        isPopular ? "bg-gray-900 ring-gray-900" : "bg-white ring-gray-200"
      }`}
      style={{
        width: 270,
        minHeight: 430,
        borderRadius: 20,
        padding: "28px 24px",
      }}
    >
      {/* Close */}
      {onClose && (
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 rounded-lg px-2 py-1 text-sm ${
            isPopular
              ? "text-gray-300 hover:text-white hover:bg-white/10"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          ✕
        </button>
      )}

      {/* ICON */}
      <div className="flex justify-center">
        <img
          src={tier.icon}
          alt=""
          className={`h-10 w-10 ${isPopular ? "opacity-90" : ""}`}
        />
      </div>

      {/* TITLE */}
      <h3
        className={`mt-4 text-center text-xl font-semibold ${
          isPopular ? "text-white" : "text-gray-900"
        }`}
      >
        {tier.name}
      </h3>

      {/* PRICE */}
      <div className="mt-3 text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span
            className={`text-4xl font-bold ${
              isPopular ? "text-white" : "text-gray-900"
            }`}
          >
            {tier.price}
          </span>
          <span className="text-sm text-gray-400">/month (USD)</span>
        </div>
        <div className="mt-1 text-sm text-gray-400">
          billed yearly
        </div>
      </div>

      {/* STATEMENT */}
      <p
        className={`mt-4 text-center text-sm ${
          isPopular ? "text-gray-300" : "text-gray-600"
        }`}
      >
        {tier.statement}
      </p>

      {/* DIVIDER */}
      <div className="mt-4 h-px w-full bg-gray-200" />

      {/* FEATURES */}
      <ul
        className={`mt-4 flex-1 space-y-3 text-sm ${
          isPopular ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <CheckIcon
              className={`h-5 w-5 shrink-0 ${
                isPopular ? "text-white" : "text-indigo-600"
              }`}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={handleSubscription}
        disabled={isCurrent || isLoading}
        className={`mt-4 w-full rounded-full py-2.5 text-sm font-semibold transition ${
          isCurrent
            ? "border border-gray-400 text-gray-400 cursor-default"
            : isPopular
            ? "bg-indigo-600 text-white hover:bg-indigo-500"
            : "border border-indigo-400 text-indigo-600 hover:border-indigo-500"
        }`}
      >
        {isLoading ? "Processing..." : ctaLabel}
      </button>
    </div>
  );
};

export default PricingCard;
