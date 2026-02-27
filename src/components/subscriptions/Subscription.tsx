import React, { useEffect, useRef, useState } from "react"; // add useMemo to continue 
import PricingCard from "../../components/paymentui/PricingCards";
import type { Tier } from "../../types";
import { fetchAuthSession } from "aws-amplify/auth";
import { useApp } from "../../appContext";
import SEO from "../seo/seo";
import { fetchWithTimeout, isNetworkConnectivityError, isRequestTimeoutError } from "../../utils/network";

import LeafIcon from "../../assets/leaf.svg";
import DropIcon from "../../assets/drop.svg";
import AudienceIcon from "../../assets/t4.svg";
import OveliaIcon from "../../assets/oveliatier3.svg";
type SubscriptionPageProps = { onClose?: () => void };

<SEO
  title="Pricing & Plans"
  description="Choose a plan to talk privately with Maya through text or live voice, with flexible talk-time options."
  noindex
/>

const TIERS: Tier[] = [
  {
    name: "Starter",
    planCode: "free",
    price: "$0",
    yearPrice: "$0",
    statement: "For getting started with Maya",
    features: [
      "8 Monthly Prompts",
      "0 Image Analysis",
      "1 Document Analysis",
      "3 Chats",
      "Call Maya: Yes (1 min Talk Time)",
    ],
    ctaText: "Current Plan",
    icon: LeafIcon,
  },
  
  {
    name: "Tier 1",
    planCode: "tier1",
    price: "$12.99",
    yearPrice: "$156",
    statement: "For light but consistent use of Maya",
    features: [
      "60 Monthly Messages",
      "2 Image Analysis",
      "3 Document Analysis",
      "5 Chats",
      "Call Maya: Yes (3 mins Talk Time)",
    ],
    ctaText: "Upgrade",
    icon: DropIcon,
  },
  
  {
    name: "Tier 2",
    planCode: "tier2",
    price: "$21.99",
    yearPrice: "$264",
    statement: "For regular voice conversations with Maya",
    features: [
      "180 Monthly Messages",
      "5 Image Analysis",
      "6 Document Analysis",
      "8 Chats",
      "Call Maya: Yes (10 mins Talk Time)",
    ],
    ctaText: "Upgrade",
    icon: OveliaIcon,
    popular: true,
  },
  
  {
    name: "Tier 3",
    planCode: "tier3",
    price: "$44.99",
    yearPrice: "$540",
    statement: "For frequent and extended use of Maya",
    features: [
      "300 Monthly Messages",
      "10 Image Analysis",
      "8 Document Analysis",
      "12 Chats",
      "Call Maya: Yes (20 mins Talk Time)",
    ],
    ctaText: "Upgrade",
    icon: AudienceIcon,
  },  
];

/* --------------------- MOBILE DETECTOR --------------------- */

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

/* --------------------- COMPONENT --------------------- */

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onClose }) => {
  const { sub } = useApp();
  const BASE = (import.meta as any).env?.VITE_API_BILLING_STRIPE_PROD as string;
  const [billingError, setBillingError] = useState<string | null>(null);

  const isMobile = useIsMobile();
  const currentPlanCode = sub?.plan_code ?? "free";

  /** 🔑 REF MUST BE INSIDE COMPONENT */
  const tier2Ref = useRef<HTMLDivElement | null>(null);

  /* ------------------ AUTO SCROLL (MOBILE ONLY) ------------------ */

  useEffect(() => {
    if (!isMobile) return;
    if (!tier2Ref.current) return;
  
    // allow layout + images to settle
    setTimeout(() => {
      tier2Ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",   // ✅ CRITICAL CHANGE
        inline: "nearest",
      });
    }, 50);
  }, [isMobile]);
  

  /* ------------------ SUBSCRIBE ------------------ */

  const onSubscribe = async (tier: Tier) => {
    setBillingError(null);
    if (tier.planCode === "free") {
      onClose?.();
      return;
    }

    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();
      if (!idToken) throw new Error("Not authenticated");
      if (!BASE) throw new Error("Billing endpoint unavailable");

      const res = await fetchWithTimeout(
        `${String(BASE).replace(/\/$/, "")}/billing/stripe/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ plan_code: tier.planCode }),
        },
        12000
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Checkout failed");
      }

      window.location.href = data.url;
    } catch (e: any) {
      if (isNetworkConnectivityError(e)) {
        setBillingError("Network error, please check your internet connection");
      } else if (isRequestTimeoutError(e)) {
        setBillingError("Couldn’t reach billing right now. Please try again.");
      } else {
        setBillingError(e?.message || "Checkout failed. Please try again.");
      }
    }
  };
  
  const onManage = async () => {
    setBillingError(null);
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();
      if (!idToken) throw new Error("Not authenticated");
      if (!BASE) throw new Error("Billing endpoint unavailable");

      const url = `${String(BASE).replace(/\/$/, "")}/billing/stripe/portal`;
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        },
        12000
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.error || "Portal URL missing");
      window.location.href = data.url;
    } catch (e: any) {
      if (isNetworkConnectivityError(e)) {
        setBillingError("Network error, please check your internet connection");
      } else if (isRequestTimeoutError(e)) {
        setBillingError("Couldn’t reach billing right now. Please try again.");
      } else {
        setBillingError(e?.message || "Couldn’t open billing portal. Please try again.");
      }
    }
  };


  return (
    <>
      <SEO
        title="Pricing & Plans"
        description="Choose a plan to talk privately with Maya through text or live voice."
        noindex
      />

      {/* BACKDROP */}
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
        {/* MODAL */}
        <div
          className="
            relative
            w-full
            max-w-[1320px]
            h-[92vh]
            flex
            flex-col
            overflow-hidden
            rounded-2xl
            shadow-2xl
          "
          style={{
            background:
              "linear-gradient(107.56deg, #FFFFFF 0.19%, #C2BBF2 99.81%)",
          }}
        >
          {/* CLOSE BUTTON */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="
              absolute
              right-4
              top-4
              z-50
              h-10
              w-10
              rounded-full
              bg-white/90
              text-gray-700
              shadow-md
              hover:bg-white
              flex
              items-center
              justify-center
            "
          >
            ✕
          </button>

          {/* HEADER */}
          <div className="shrink-0 px-6 pt-8 text-center">
            <h2 className="text-sm font-semibold text-[#4F47E6]">
              Pricing
            </h2>

            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-[52px] font-extrabold text-[#0F1A3AE5]">
              The Right Plan for You
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Current plan:{" "}
              <span className="font-semibold">{currentPlanCode}</span>
            </p>
            {billingError && (
              <p className="mt-3 text-sm text-red-600">{billingError}</p>
            )}
          </div>

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-10 pb-16">
            <div
              className="
                grid
                grid-cols-1
                gap-6
                sm:grid-cols-2
                lg:grid-cols-4
                place-items-center
              "
            >
              {TIERS.map((tier) => {
                const isTier2 = tier.planCode === "tier2";

                return (
                  <div
                    key={tier.planCode}
                    ref={isTier2 ? tier2Ref : undefined}
                  >
                    <PricingCard
                      tier={tier}
                      currentPlanCode={currentPlanCode}
                      subMeta={{
                        status: sub?.status ?? "none",
                        cancel_at: sub?.cancel_at ?? 0,
                        current_period_end: sub?.current_period_end ?? 0,
                        days_left: sub?.days_left ?? null,
                      }}
                      onSubscribe={onSubscribe}
                      onManage={onManage}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubscriptionPage;
