// Subscription.tsx
import React from "react";
import PricingCard from "../../components/paymentui/PricingCards";
import type { Tier } from "../../types";
import { fetchAuthSession } from "aws-amplify/auth";
import { useApp } from "../../appContext"; // ← add
import SEO from "../seo/seo"; // ← add
import LeafIcon from "../../assets/leaf.svg";
import DropIcon from  "../../assets/drop.svg";
import AudienceIcon from "../../assets/t4.svg";
import OveliaIcon from "../../assets/oveliatier3.svg";
type SubscriptionPageProps = { onClose?: () => void };

<SEO
  title="Pricing & Plans"
  description="Choose a plan to talk privately with Maya through text or live voice, with flexible talk-time options."
  noindex
/>


const tiers: Tier[] = [
  {
    name: "Starter",
    planCode: "free",
    price: "$0",
    statement: "For those getting started with Maya",
    features: [
      "5 Monthly Prompts",
      "1 Image Upload",
      "1 Document Upload",
      "3 Threads",
      "Talk to Maya: No",
    ],
    ctaText: "Current Plan",
    icon: LeafIcon,
  },
  {
    name: "Tier 1",
    planCode: "tier1",
    price: "$12.99",
    statement: "For better experience with Maya",
    features: ["20 Monthly Prompts", "4 Image Uploads", "3 Document Uploads", "6 Threads", "Talk to Maya: No"] ,
    ctaText: "Upgrade",
    icon: DropIcon,
  },
  {
    name: "Tier 2",
    planCode: "tier2",
    price: "$18.99",
    statement: "For the best experience with Maya",
    features: ["45 Monthly Prompts", "8 Image Uploads", "6 Document Uploads", "12 Threads", "Talk to Maya: Yes"] ,
    ctaText: "Upgrade",
    icon: OveliaIcon,
    popular: true,
  },
{
  name: "Tier 3",
  planCode: "tier3",
  price: "$39.99",
  statement: "For the best experience with Maya",
  features: ["100 Monthly Prompts", "12 Image Uploads", "8 Document Uploads", "20 Threads", "Talk to Maya: Yes"] ,
  ctaText: "Upgrade",
  icon: AudienceIcon,
  popular: true,
}


];
const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onClose }) => {
  const BASE = (import.meta as any).env?.VITE_API_BILLING_STRIPE_PROD as string;
  const { sub } = useApp(); // ← current subscription from context

  const onSubscribe = async (tier: Tier) => {
    if (tier.planCode === "free") {
      onClose?.();
      return;
    }
  
    // if (tier.planCode === "enterprise") {
    //   alert("For Enterprise Software, please connect with us at info@ovelia.health");
    //   return;
    // }
  
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (!idToken) throw new Error("Not authenticated");
  
    const url = `${String(BASE).replace(/\/$/, "")}/billing/stripe/checkout`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ plan_code: tier.planCode }),
    });
  
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Checkout failed (${res.status})`);
    if (!data?.url) throw new Error("Checkout URL missing");
  
    window.location.href = data.url;
  };
  
  const onManage = async () => {
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (!idToken) throw new Error("Not authenticated");

    const url = `${String(BASE).replace(/\/$/, "")}/billing/stripe/portal`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.url) throw new Error(data?.error || "Portal URL missing");
    window.location.href = data.url;
  };

  const currentPlanCode = sub?.plan_code ?? "free";

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">

<div
  className="relative text-brand-dark shadow-2xl w-[1308px] h-[785px] overflow-hidden"
  style={{
    borderRadius: "20px",
    background: "linear-gradient(107.56deg, #FFFFFF 0.19%, #C2BBF2 99.81%)",
  }}
>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full p-2 transition"
          aria-label="Close subscription modal"
        >
          X
        </button>

        <div className="mx-auto max-w-7xl  pt-2 text-center">
        <div className="mx-auto max-w-3xl  text-center">
  <h2
    className="mx-auto"
    style={{
      fontFamily: "Inter",
      fontWeight: 800,
      fontSize: "24px",
      lineHeight: "24px",
      color: "#4F47E6",
    }}
  >
    Pricing
  </h2>

  <h1
    className="mt-4"
    style={{
      fontFamily: "Inter",
      fontWeight: 800,
      fontSize: "55px",
      lineHeight: "1.05",
      color: "#0F1A3AE5",
    }}
  >
    The Right Plan for You
  </h1>
</div>

         
         
         
         
         
          <p className="mt-2 text-sm text-gray-500 ">
            Current plan: <span className="font-semibold">{currentPlanCode}</span>
          </p>



          {/* <p className="mt-4 mx-auto max-w-2xl text-lg leading-8 text-gray-600">Start for free and upgrade anytime.</p> */}
        </div>

        <div className="flow-root pb-16 sm:pb-24 rounded-b-3xl pt-8">
        <div className="mx-auto px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
                <PricingCard
                  key={tier.planCode}
                  tier={tier}
                  currentPlanCode={currentPlanCode}                // ← new
                  subMeta={{
                    status: sub?.status ?? "none",
                    cancel_at: sub?.cancel_at ?? 0,
                    current_period_end: sub?.current_period_end ?? 0,
                    days_left: sub?.days_left ?? null,
                  }}                                                // ← new
                  onSubscribe={onSubscribe}
                  onManage={onManage}                               // ← new
                  // onClose={onClose}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default SubscriptionPage;
