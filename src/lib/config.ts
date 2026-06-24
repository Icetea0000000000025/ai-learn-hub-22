/**
 * PRODUCTION CONFIGURATION
 *
 * These values are hardcoded to ensure the application remains functional
 * even when environment variables (.env) are lost during GitHub/Lovable syncs.
 */

// Supabase Configuration
export const SUPABASE_URL = "https://fjiyvmfogiyvecixocnt.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_vTBN1Tc1y8lRrWGff0x4OQ_z02xC2zD";

// Gemini AI Configuration
// Note: Keep this empty if using Lovable Secrets or local .env
export const GEMINI_API_KEY = "";

// Stripe Configuration
export const STRIPE_PUBLISHABLE_KEY = ""; // pk_test_...
export const STRIPE_SECRET_KEY = ""; // sk_test_...
export const STRIPE_WEBHOOK_SECRET = ""; // whsec_...

// Application URL
const getDefaultUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.APP_URL) return process.env.APP_URL;
  return "http://localhost:8080";
};

export const APP_URL = getDefaultUrl();

// Course Categories
export const COURSE_CATEGORIES = [
  "Development",
  "Business",
  "Finance & Accounting",
  "CYBERSECURITY & NETWORKING",
  "AI / Productivity",
  "Personal Development",
  "Design",
  "Marketing",
  "Health & Fitness",
  "Music",
  "Other",
] as const;

export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    price: 0,
    revenueShare: 20, // Platform takes 20%
    aiQuota: 2, // Total AI Course Creations
    features: ["Standard Features", "2 AI Course Creations", "80% Revenue for Creator"],
  },
  starter: {
    name: "Starter",
    price: 299,
    revenueShare: 12, // Platform takes 12%
    aiQuota: 10, // Per Month
    features: ["10 AI Course Creations / mo", "88% Revenue for Creator", "Recommended Spotlights"],
  },
  growth: {
    name: "Growth",
    price: 879,
    revenueShare: 10, // Platform takes 10%
    aiQuota: 30, // Per Month
    features: [
      "30 AI Course Creations / mo",
      "90% Revenue for Creator",
      "Advanced Analytics",
      "Priority Support",
    ],
  },
  pro: {
    name: "Pro",
    price: 2499,
    revenueShare: 5, // Platform takes 5%
    aiQuota: 100, // Unlimited (Fair Use)
    features: [
      "Unlimited AI Course Creations",
      "95% Revenue for Creator",
      "White-label Options",
      "Dedicated Account Manager",
    ],
  },
} as const;

export const AD_PRICING = {
  featured: [
    { days: 3, price: 89 },
    { days: 7, price: 199 },
    { days: 14, price: 349 },
    { days: 30, price: 699 },
  ],
} as const;
