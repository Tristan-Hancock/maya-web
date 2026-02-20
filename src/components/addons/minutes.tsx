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

  const purchasedMinutes =
    mode === "preset"
      ? Number(selectedPack)
      : customMinutes;

  /* ---------------- STRIPE CHECKOUT ---------------- */

  const handleCheckout = async () => {
    try {
      setIsProcessing(true);

      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();
      if (!idToken) throw new Error("Not authenticated");

      const res = await fetch(
        `${String(BASE).replace(/\/$/, "")}/billing/stripe/minutes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            minutes: purchasedMinutes,
            price: currentPrice,
            type: mode,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Checkout failed");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
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
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#F8FAFC] rounded-3xl shadow-2xl flex flex-col overflow-hidden">

          {/* HEADER */}
          <div className="flex-shrink-0 bg-white border-b p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  Maya Minutes
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Interactive Audio Packages
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl max-w-xs">
              <button
                onClick={() => setMode("preset")}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${
                  mode === "preset"
                    ? "bg-white shadow text-indigo-600"
                    : "text-gray-500"
                }`}
              >
                Preset
              </button>

              <button
                onClick={() => setMode("custom")}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${
                  mode === "custom"
                    ? "bg-white shadow text-indigo-600"
                    : "text-gray-500"
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
              <div className="bg-white p-10 rounded-2xl shadow-sm border max-w-2xl mx-auto">
                <div className="text-center mb-10">
                  <span className="text-7xl font-black tabular-nums">
                    {customMinutes}
                  </span>
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                    Minutes Selected
                  </p>
                </div>

                <input
                  type="range"
                  min="1"
                  max="500"
                  value={customMinutes}
                  onChange={(e) =>
                    setCustomMinutes(Number(e.target.value))
                  }
                  className="w-full accent-indigo-600"
                />

                <div className="mt-8 flex justify-between items-center bg-indigo-50 p-5 rounded-xl">
                  <div>
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                      Rate
                    </p>
                    <p className="text-lg font-black">$1 / min</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                      Total
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
          <div className="flex-shrink-0 bg-white border-t p-6 flex justify-between items-center">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Order Total
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">
                  ${currentPrice}
                </span>
                <span className="text-xs font-bold text-gray-400">USD</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="px-12 py-4 bg-gray-900 text-white rounded-xl font-black hover:bg-black transition disabled:bg-gray-300"
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