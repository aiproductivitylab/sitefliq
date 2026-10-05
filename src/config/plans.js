// ═══════════════════════════════════════════════════════════════════════════
//  PADDLE SUBSCRIPTION PRICE IDs — Step 5  ***REPLACE THE PLACEHOLDERS***
//
//  This is the SINGLE source of truth for the monthly subscription plans. It is
//  imported by the pricing page (to open Paddle checkout) and will be imported
//  by the Paddle webhook to map a subscription payment -> monthly credit refill.
//
//  Live Paddle monthly price IDs. Pro and Business reuse the ids that were the
//  old one-time packs (now converted to monthly); the old Starter pack id is
//  deleted. Update here if prices change — the webhook reads the same values.
// ═══════════════════════════════════════════════════════════════════════════

export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 25,            // USD / month
    credits: 100,         // monthly credit allotment
    websites: 25,         // marketed "websites per month" (1 website = 4 credits)
    priceId: "pri_01m469ea9nrscg0h40p5np8x9x",
    tagline: "For solo operators getting started.",
    features: [
      "25 websites per month",
      "AI copy, SEO & schema on every page",
      "Real industry photography",
      "Plain-English chat editing",
      "One-click publish & HTML download",
      "Email support",
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 50,
    credits: 200,
    websites: 50,
    priceId: "pri_01kjxachhq3afcqc0gj54x2yq7",    
    tagline: "For freelancers and small agencies.",
    features: [
      "50 websites per month",
      "Everything in Starter",
      "No Sitefliq branding",
      "Priority generation",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: 100,
    credits: 500,
    websites: 125,
    priceId: "pri_01kjxafb31r7g5gc23se78j10a",
    tagline: "For agencies and resellers at volume.",
    features: [
      "125 websites per month",
      "Everything in Pro",
      "White-label output",
      "Best rate per website",
      "Dedicated support",
    ],
    popular: false,
  },
];

// A price id is still a placeholder (not yet wired to Paddle) until it's replaced
// with a real `pri_...` value above.
export const isPlaceholderPriceId = (priceId) =>
  !priceId || priceId.includes("PLACEHOLDER");

export const subscriptionByPriceId = (priceId) =>
  SUBSCRIPTION_PLANS.find((p) => p.priceId === priceId) || null;
