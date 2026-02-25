import React, { useState } from "react";
import MinsCards from "../../components/paymentui/MinsCards";
import type { MayaMins, mins } from "../../types";
import { fetchAuthSession } from "aws-amplify/auth";
import SEO from "../seo/seo";

import LeafIcon from "../../assets/leaf.svg";
import DropIcon from "../../assets/drop.svg";
import AudienceIcon from "../../assets/t4.svg";
import OveliaIcon from "../../assets/oveliatier3.svg";

type AddOnPageProps = { onClose?: () => void };

const MINUTE_TIERS: MayaMins[] = [
  {
    title: "5 Min Pack",
    planCode: "5",
    price: "$5",
    description: "Quick Check In with Maya",
    icon: LeafIcon,
  },
  {
    title: "15 Min Pack",
    planCode: "15",
    price: "$15",
    description: "Deep Health Analysis",
    icon: DropIcon,
  },
  {
    title: "30 Min Pack",
    planCode: "30",
    price: "$30",
    description: "Wellness Companion",
    icon: OveliaIcon,
    popular: true,
  },
  {
    title: "Custom Pack",
    planCode: "Custom",
    price: "",
    description: "Choose your own talk time",
    icon: AudienceIcon,
  },
];

const AddOnPage: React.FC<AddOnPageProps> = ({ onClose }) => {
  const BASE = (import.meta as any).env?.VITE_API_BILLING_STRIPE_STAGE as string;

  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [selectedPack, setSelectedPack] = useState<mins>("30");
  const [customMinutes, setCustomMinutes] = useState<number>(30);
  const [isProcessing, setIsProcessing] = useState(false);

  const PRICE_PER_MINUTE = 1;

  const currentPrice =
    mode === "preset"
      ? Number(selectedPack)
      : customMinutes * PRICE_PER_MINUTE;

//   const purchasedMinutes =
//     mode === "preset"
//       ? Number(selectedPack)
//       : customMinutes;

  /* ---------------- STRIPE CHECKOUT ---------------- */
  const handleCheckout = async () => {
    try {
      setIsProcessing(true);
  
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();
      if (!idToken) throw new Error("Not authenticated");
  
      const payload =
        mode === "preset"
          ? { plan: selectedPack }                  // existing fixed packs
          : { customMinutes: customMinutes };       // send exact slider value
  
      const res = await fetch(
        `${String(BASE).replace(/\/$/, "")}/billing/stripe/mayamins/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
        }
      );
  
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Checkout failed");
      }
  
      window.location.href = data.url;
    } catch (err) {
    //   console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <SEO
        title="Buy Maya Minutes"
        description="Top up your talk time with Maya anytime."
        noindex
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.12)] flex flex-col overflow-hidden border border-[#E6EAF2]">          {/* HEADER */}
      <div className="flex-shrink-0 bg-white border-b border-[#EEF1F6] p-6">            <div className="flex items-center justify-between mb-5">
              <div>
              <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-[-0.02em]">                  Maya Minutes
                </h2>
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-[0.25em]">                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="flex bg-[#F1F5F9] p-1 rounded-2xl max-w-xs border border-[#E2E8F0]">              <button
                onClick={() => setMode("preset")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold tracking-wide ${
                  mode === "preset"
                    ? "bg-white shadow-sm text-[#0F172A]"
                    : "text-[#64748B]"
                }`}
              >
                Preset
              </button>

              <button
                onClick={() => setMode("custom")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold tracking-wide ${
                  mode === "custom"
                    ? "bg-white shadow-sm text-[#0F172A]"
                    : "text-[#64748B]"
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
            {mode === "preset" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {MINUTE_TIERS.filter(t => t.planCode !== "Custom").map((tier) => (
                  <MinsCards
                    key={tier.planCode}
                    tier={tier}
                    selected={selectedPack === tier.planCode}
                    onSelect={() => setSelectedPack(tier.planCode)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white p-10 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] max-w-2xl mx-auto">
                <div className="text-center mb-10">
                  <span className="text-7xl font-black tabular-nums">
                    {customMinutes}
                  </span>
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                    Minutes Selected
                  </p>
                </div>

                <div className="w-full">
  <input
    type="range"
    min="1"
    max="500"
    value={customMinutes}
    onChange={(e) => setCustomMinutes(Number(e.target.value))}
    className="
      w-full
      appearance-none
      bg-transparent
      cursor-pointer

      h-2
      rounded-full

      [&::-webkit-slider-runnable-track]:h-2
      [&::-webkit-slider-runnable-track]:rounded-full

      [&::-webkit-slider-thumb]:appearance-none
      [&::-webkit-slider-thumb]:h-5
      [&::-webkit-slider-thumb]:w-5
      [&::-webkit-slider-thumb]:rounded-full
      [&::-webkit-slider-thumb]:bg-white
      [&::-webkit-slider-thumb]:border-4
      [&::-webkit-slider-thumb]:border-[#4F46E5]
      [&::-webkit-slider-thumb]:shadow-[0_4px_14px_rgba(79,70,229,0.25)]
      [&::-webkit-slider-thumb]:transition
      [&::-webkit-slider-thumb]:duration-200
      [&::-webkit-slider-thumb]:hover:scale-105

      [&::-moz-range-thumb]:h-5
      [&::-moz-range-thumb]:w-5
      [&::-moz-range-thumb]:rounded-full
      [&::-moz-range-thumb]:bg-white
      [&::-moz-range-thumb]:border-4
      [&::-moz-range-thumb]:border-[#4F46E5]
      [&::-moz-range-thumb]:shadow-[0_4px_14px_rgba(79,70,229,0.25)]
    "
    style={{
      background: `linear-gradient(to right, #4F46E5 0%, #4F46E5 ${
        ((customMinutes - 1) / (500 - 1)) * 100
      }%, #E5E7EB ${
        ((customMinutes - 1) / (500 - 1)) * 100
      }%, #E5E7EB 100%)`,
    }}
  />
</div>

                <div className="mt-8 flex justify-between items-center bg-[#EEF2FF] p-6 rounded-2xl">
                  <div>
                  <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-[0.25em]">                      Rate
                    </p>
                    <p className="text-lg font-black">$1 / min</p>
                  </div>

                  <div className="text-right">
                  <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-[0.25em]">                      Total
                    </p>
                    <p className="text-2xl font-black text-indigo-600">
                      ${currentPrice}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex-shrink-0 bg-white border-t border-[#EEF1F6] p-6 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-[0.25em]">
                Order Total
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#0F172A] tracking-[-0.02em]">
                  ${currentPrice}
                </span>
                <span className="text-sm font-semibold text-[#94A3B8]">USD</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="px-12 py-4 bg-[#0F172A] text-white rounded-2xl font-semibold text-lg shadow-[0_8px_24px_rgba(15,23,42,0.25)] hover:bg-black transition disabled:bg-gray-300"
            >
              {isProcessing ? "Processing..." : "Complete Purchase"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddOnPage;