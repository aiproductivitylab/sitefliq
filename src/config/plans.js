// ═══════════════════════════════════════════════════════════════════════════
//  PADDLE SUBSCRIPTION PRICE IDs — Step 5  ***REPLACE THE PLACEHOLDERS***
//
//  This is the SINGLE source of truth for the monthly subscription plans. It is
//  imported by the pricing page (to open Paddle checkout) and will be imported
//  by the Paddle webhook to map a subscription payment -> monthly credit refill.
//
//  To go live: in the Paddle dashboard create the 3 recurring monthly prices,
//  then paste each price's id (looks like `pri_01h...`) over the PLACEHOLDER
//  strings below. Nothing else needs to change on the client to start checkout.
// ═══════════════════════════════════════════════════════════════════════════

export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 25,            // USD / month
    credits: 100,         // monthly credit allotment
    websites: 25,         // marketed "websites per month" (1 website = 4 credits)
    priceId: "PADDLE_PRICE_STARTER_PLACEHOLDER",   // <-- replace with pri_... from Paddle
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
    priceId: "PADDLE_PRICE_PRO_PLACEHOLDER",       // <-- replace with pri_... from Paddle
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
    priceId: "PADDLE_PRICE_BUSINESS_PLACEHOLDER",  // <-- replace with pri_... from Paddle
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
