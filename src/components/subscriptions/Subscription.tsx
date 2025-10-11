// src/components/subscriptions/SubscriptionPage.tsx
import React from "react";
import PricingCard from "../../components/paymentui/PricingCards";
import { tiers } from "../../data/tiers";
{/* import { ArrowLeftIcon } from "../icons/sidebaricons"; */}

type SubscriptionPageProps = {
  onClose?: () => void; // <-- parent passes this to close modal
};

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Modal container */}
      <div className="relative bg-gray-50 text-brand-dark rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* ✕ Close Button */}
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
          <p className="mt-2 text-4xl font-bold tracking-tight text-brand-dark sm:text-5xl">
            The right plan for you, whoever you are
          </p>
          <p className="mt-6 mx-auto max-w-2xl text-lg leading-8 text-gray-600">
            Choose a plan that fits your needs. Start for free and upgrade anytime.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="flow-root bg-white pb-16 sm:pb-24 rounded-b-3xl">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto grid max-w-md grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-2">
              {tiers.slice(0, 2).map((tier) => (
                <PricingCard key={tier.name} tier={tier} onClose={onClose} />
              ))}

              <div className="flex flex-col items-start gap-x-8 gap-y-10 rounded-3xl p-8 ring-1 ring-gray-900/10 sm:p-10 lg:col-span-2 lg:flex-row lg:items-center">
                <div className="lg:min-w-0 lg:flex-1">
                  <h3 className="text-lg font-semibold leading-8 tracking-tight text-indigo-600">
                    {tiers[2].name}
                  </h3>
                  <p className="mt-1 text-base leading-7 text-gray-600">
                    Powerful features for your entire team.
                  </p>
                </div>
                <a
                  href="#"
                  className="rounded-md px-3.5 py-2 text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Contact sales <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
