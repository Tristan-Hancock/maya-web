import React from "react";
import PricingCard from "../../components/paymentui/PricingCards";
import type { Tier } from "../../types";

type SubscriptionPageProps = {
  onClose?: () => void;
};

const tiers: Tier[] = [
  {
    name: "Free Tier",
    price: "$0",
    ctaText: "Start Free",
    planCode: "free",
    features: ["5 Monthly Prompts", "1 Image Upload", "1 Document Upload", "3 Threads", "Talk to Maya: No"],
  },
  {
    name: "Tier 1",
    price: "$12.99",
    ctaText: "Subscribe",
    planCode: "tier1",
    features: ["20 Monthly Prompts", "4 Image Uploads", "3 Document Uploads", "6 Threads", "Talk to Maya: No"],
  },
  {
    name: "Tier 2",
    price: "$18.99",
    ctaText: "Subscribe",
    planCode: "tier2",
    popular: true,
    features: ["45 Monthly Prompts", "8 Image Uploads", "6 Document Uploads", "12 Threads", "Talk to Maya: Yes"],
  },
  {
    name: "Tier 3",
    price: "$39.99",
    ctaText: "Subscribe",
    planCode: "tier3",
    features: ["100 Monthly Prompts", "12 Image Uploads", "8 Document Uploads", "20 Threads", "Talk to Maya: Yes"],
  },
  {
    name: "Enterprise Software",
    price: "Contact Us",
    ctaText: "Get in Touch",
    planCode: "enterprise",
    features: [
      "Custom Monthly Prompts",
      "Custom Upload Limits",
      "Unlimited Threads",
      "Dedicated Support",
      "Talk to Maya: Yes",
    ],
  },
];

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-gray-50 text-brand-dark rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full p-2 transition"
          aria-label="Close subscription modal"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-8 text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            The right plan for you
          </p>
          <p className="mt-6 mx-auto max-w-2xl text-lg leading-8 text-gray-600">
            Start for free and upgrade anytime.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="flow-root bg-white pb-16 sm:pb-24 rounded-b-3xl">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {tiers.map((tier) => (
                <PricingCard key={tier.name} tier={tier} onClose={onClose} onSubscribe={() => {}} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
