// src/data/tiers.ts
export const tiers = [
  {
    name: "Free Tier",
    price: "$0",
    ctaText: "Start Free",
    planCode: "free",
    features: [
      "5 Monthly Prompts",
      "1 Image Upload",
      "1 Document Upload",
      "3 Threads",
      "Talk to Maya: No",
    ],
  },
  {
    name: "Tier 1",
    price: "$12.99",
    ctaText: "Subscribe",
    planCode: "tier1",
    features: [
      "20 Monthly Prompts",
      "4 Image Uploads",
      "3 Document Uploads",
      "6 Threads",
      "Talk to Maya: No",
    ],
  },
  {
    name: "Tier 2",
    price: "$18.99",
    ctaText: "Subscribe",
    planCode: "tier2",
    popular: true,
    features: [
      "45 Monthly Prompts",
      "8 Image Uploads",
      "6 Document Uploads",
      "12 Threads",
      "Talk to Maya: Yes",
    ],
  },
  {
    name: "Tier 3",
    price: "$39.99",
    ctaText: "Subscribe",
    planCode: "tier3",
    features: [
      "100 Monthly Prompts",
      "12 Image Uploads",
      "8 Document Uploads",
      "20 Threads",
      "Talk to Maya: Yes",
    ],
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
