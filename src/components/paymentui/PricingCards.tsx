// PricingCard.tsx
import React, { useState, useEffect } from "react";
import type { Tier } from "../../types";
import { CheckIcon } from "../../components/icons/sidebaricons";
import { fetchAuthSession } from "aws-amplify/auth";

type PricingCardProps = {
  tier: Tier;
  onSubscribe?: (tier: Tier) => Promise<void> | void;
  onClose?: () => void;
};

const PricingCard: React.FC<PricingCardProps> = ({ tier, onSubscribe, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isPopular = !!tier.popular;
  const ctaLabel = tier.ctaText;

  const ctaClasses = `mt-8 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-full transition-colors ${
    isPopular
      ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-indigo-600"
      : "text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300 focus-visible:outline-indigo-600"
  }`;

  async function defaultSubscribe() {
    // Get Cognito token
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (!idToken) throw new Error("Not authenticated");

    // Stripe checkout endpoint (your new lambda)
    const BASE =
      (import.meta as any).env?.VITE_API_BILLING_STRIPE_STAGE 
     

    const url = `${BASE.replace(/\/$/, "")}/billing/stripe/checkout`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ plan_code: tier.planCode }), // e.g. "tier1"
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || data?.reason || data?.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    // Redirect to hosted Stripe Checkout
    if (data?.url) {
      window.location.href = data.url;
      return; // stop here; page navigates away
    }

    // If you ever switch to client-side redirect with stripe.js:
    // const stripe = await loadStripe(data.publishable_key);
    // await stripe?.redirectToCheckout({ sessionId: data.id });

    throw new Error("Checkout URL missing from response");
  }

  const handleSubscription = async () => {
    try {
      setIsLoading(true);
      setIsSuccess(false);

      if (onSubscribe) {
        await onSubscribe(tier); // custom hook if you want
      } else if (tier.planCode !== "free") {
        await defaultSubscribe();
      } else {
        setIsSuccess(true);
      }
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

  return (
    <div
      className={`relative flex flex-col justify-between rounded-3xl p-8 ring-1 xl:p-10 ${
        isPopular ? "bg-gray-900 ring-gray-900" : "bg-white ring-gray-200"
      }`}
    >
      {onClose && (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className={`absolute top-3 right-3 rounded-md px-2 py-1 text-sm ${
            isPopular
              ? "text-gray-300 hover:text-white hover:bg-white/10"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          ✕
        </button>
      )}

      <div>
        <div className="flex items-center justify-between gap-x-4">
          <h3 className={`text-lg font-semibold leading-8 ${isPopular ? "text-white" : "text-gray-900"}`}>{tier.name}</h3>
          {isPopular && (
            <p className="rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-indigo-400">
              Most popular
            </p>
          )}
        </div>

        <p className="mt-4 text-sm leading-6 text-gray-600">A plan that's right for you.</p>

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
      </div>

      <button
        onClick={handleSubscription}
        disabled={isLoading || isSuccess}
        className={`${ctaClasses} ${isSuccess ? "bg-green-500 hover:bg-green-500 cursor-default text-white" : ""} disabled:opacity-70`}
      >
        {renderButtonContent()}
      </button>
    </div>
  );
};

export default PricingCard;
