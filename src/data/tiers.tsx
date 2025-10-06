import type { Tier } from "../types";

export const tiers: Tier[] = [
  {
    name: "Free",
    planCode: "free",
    price: "$0",
    blurb: "Get started with Maya.",
    features: ["5 prompts / month", "Basic answers", "No chat history"],
    ctaText: "Continue Free",
  },
  {
    name: "Tier 1",
    planCode: "tier1",
    price: "$6/mo",
    blurb: "More prompts and saved history.",
    features: [
      "50 prompts / month",
      "Chat history",
      "Image uploads (5/mo)",
      "Doc uploads (5/mo)",
    ],
    ctaText: "Choose Tier 1",
    popular: true,
  },
  {
    name: "Tier 2",
    planCode: "tier2",
    price: "$18/mo",
    blurb: "Heavier usage for power users.",
    features: [
      "500 prompts / month",
      "Chat history",
      "Image uploads (10/mo)",
      "Doc uploads (20/mo)",
      "Priority queue",
    ],
    ctaText: "Choose Tier 2",
  },
  {
    name: "Tier 3",
    planCode: "tier3",
    price: "Custom",
    blurb: "High limits & support.",
    features: [
      "5000 prompts / month",
      "Chat history",
      "Image uploads (20/mo)",
      "Doc uploads (50/mo)",
      "SLA & support",
    ],
    ctaText: "Contact sales",
  },
];
