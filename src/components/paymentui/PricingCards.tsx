import React, { useMemo, useState , useEffect } from "react";
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

// function fmtDate(sec: number) {
//   if (!sec) return "";
//   return new Date(sec * 1000).toLocaleDateString(undefined, {
//     year: "numeric",
//     month: "short",
//     day: "numeric",
//   });
// }

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

  // const showCancelChip = isCurrent && subMeta.cancel_at > 0;
  // const showRenewChip =
  //   isCurrent &&
  //   !showCancelChip &&
  //   subMeta.current_period_end > 0 &&
  //   currentPlanCode !== "free";

  return (
    <div
      className={`
        w-full
        sm:w-[300px]
        flex flex-col
        rounded-2xl
        ring-1
        ${
          isPopular
            ? "bg-gray-900 ring-gray-900"
            : "bg-white ring-gray-200"
        }
        p-6
      `}
    >
      {/* Icon */}
      <div className="flex justify-center">
        <img src={tier.icon} className="h-10 w-10" />
      </div>

      {/* Title */}
      <h3
        className={`mt-4 text-center text-xl font-semibold ${
          isPopular ? "text-white" : "text-gray-900"
        }`}
      >
        {tier.name}
      </h3>

      {/* Price */}
      <div className="mt-4 text-center">
        <span
          className={`text-4xl font-bold ${
            isPopular ? "text-white" : "text-gray-900"
          }`}
        >
          {tier.price}
        </span>
        <span className="ml-1 text-sm text-gray-400">/month</span>
        <div className="text-sm text-gray-400">billed yearly</div>
      </div>

      {/* Statement */}
      <p
        className={`mt-4 text-center text-sm ${
          isPopular ? "text-gray-300" : "text-gray-600"
        }`}
      >
        {tier.statement}
      </p>

      <div
        className={`my-5 h-px ${
          isPopular ? "bg-white/20" : "bg-gray-200"
        }`}
      />

      {/* Features */}
      <ul
        className={`flex-1 space-y-3 text-sm ${
          isPopular ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {tier.features.map((f) => (
          <li key={f} className="flex gap-3">
            <CheckIcon
              className={`h-5 w-5 ${
                isPopular ? "text-white" : "text-indigo-600"
              }`}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={handleSubscription}
        disabled={isCurrent || isLoading}
        className={`
          mt-6 w-full rounded-full py-3 text-sm font-semibold transition
          ${
            isCurrent
              ? "border border-gray-400 text-gray-400"
              : isPopular
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "border border-indigo-400 text-indigo-600 hover:border-indigo-500"
          }
        `}
      >
        {isLoading ? "Processing…" : ctaLabel}
      </button>
    </div>
  );
};

export default PricingCard;
