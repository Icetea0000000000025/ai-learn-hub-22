import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";
import { STRIPE_SECRET_KEY, getAppUrl } from "./config";

// Use environment variable first, fallback to config for local dev
const apiKey = (process.env.STRIPE_SECRET_KEY || STRIPE_SECRET_KEY)?.trim();

// Only initialize Stripe if an API key is provided to prevent SSR crashes
const stripe = apiKey
  ? new Stripe(apiKey, {
    apiVersion: "2026-04-22.dahlia" as any,
  })
  : null;

export const issueStripeRefund = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { transactionId } = ctx.data;

  if (!stripe) {
    throw new Error("Stripe is not configured. Cannot process refund.");
  }

  try {
    // The transactionId is the checkout session ID
    const session = await stripe.checkout.sessions.retrieve(transactionId);

    if (!session.payment_intent) {
      throw new Error("No payment intent found for this session.");
    }

    const refund = await stripe.refunds.create({
      payment_intent: session.payment_intent as string,
    });

    return { success: true, refundId: refund.id };
  } catch (err: any) {
    console.error("Stripe Refund Error:", err);
    throw new Error(err.message || "Failed to process refund with Stripe.");
  }
});

export const createSubscriptionCheckoutSession = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { tier, userId, amount } = ctx.data;

    if (!stripe) {
      throw new Error("Stripe is not configured.");
    }

    // Amount is in THB (already)
    const finalUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "promptpay"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: `LearnLab ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
              description: `1 Month Subscription to the ${tier} plan.`,
            },
            unit_amount: amount * 100, // Stripe expects cents/satangs
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${finalUrl}/dashboard?success=true&type=subscription`,
      cancel_url: `${finalUrl}/pricing?canceled=true`,
      metadata: {
        type: "subscription_purchase",
        userId,
        tier,
      },
    });

    return { sessionId: session.id, url: session.url };
  },
);

export const createAdCheckoutSession = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { courseId, courseTitle, userId, durationDays, amount, adType } = ctx.data;

    if (!stripe) {
      throw new Error("Stripe is not configured.");
    }

    const finalUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "promptpay"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: `Promote Course: ${courseTitle}`,
              description: `${durationDays} Days of ${adType} placement.`,
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${finalUrl}/dashboard?success=true&type=ad`,
      cancel_url: `${finalUrl}/pricing?canceled=true`,
      metadata: {
        type: "ad_purchase",
        userId,
        courseId,
        durationDays: durationDays.toString(),
        adType,
      },
    });

    return { sessionId: session.id, url: session.url };
  },
);

export const createEnterpriseCheckoutSession = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { planName, userId, amount } = ctx.data;

    if (!stripe) {
      throw new Error("Stripe is not configured.");
    }

    // Conversion Logic: PromptPay requires THB. We convert USD to THB for the checkout.
    const USD_TO_THB_RATE = 36.5;
    const amountInThbCents = Math.round(amount * USD_TO_THB_RATE * 100);
    const finalUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "promptpay"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: `Enterprise: ${planName}`,
              description: `Unlimited institutional access for your workforce. (Converted from USD at ${USD_TO_THB_RATE} rate)`,
            },
            unit_amount: amountInThbCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${finalUrl}/organization?success=true`,
      cancel_url: `${finalUrl}/pricing?canceled=true`,
      metadata: {
        userId,
        type: "enterprise_plan",
        planName,
        originalUsdAmount: amount.toString(),
        exchangeRate: USD_TO_THB_RATE.toString(),
      },
    });

    return { sessionId: session.id, url: session.url };
  },
);

export const createOrgPackageCheckoutSession = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { orgId, courseId, courseTitle, seatCount, amountPerSeat, userId } = ctx.data;

    if (!stripe) {
      throw new Error("Stripe is not configured.");
    }

    // Apply Bulk Discount Logic (Updated Tiers)
    let discount = 1.0;
    if (seatCount > 50) {
      discount = 0.75; // 25% off
    } else if (seatCount > 20) {
      discount = 0.8; // 20% off
    } else if (seatCount > 10) {
      discount = 0.85; // 15% off
    } else if (seatCount >= 1) {
      discount = 0.9; // 10% off
    }

    // Conversion Logic: PromptPay requires THB.
    const USD_TO_THB_RATE = 36.5;
    const discountedAmountPerSeatThb = Math.round(amountPerSeat * discount * USD_TO_THB_RATE * 100);
    const finalUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "promptpay"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: `Enterprise: ${courseTitle}`,
              description: `Bulk License: ${seatCount} seats. Converted from USD at ${USD_TO_THB_RATE}. (${Math.round((1 - discount) * 100)}% volume discount applied)`,
            },
            unit_amount: discountedAmountPerSeatThb,
          },
          quantity: seatCount,
        },
      ],
      mode: "payment",
      success_url: `${finalUrl}/organization?success=true`,
      cancel_url: `${finalUrl}/organization?canceled=true`,
      metadata: {
        type: "org_package_purchase",
        orgId,
        courseId,
        seatCount,
        userId,
        courseTitle,
        discountApplied: `${Math.round((1 - discount) * 100)}%`,
        originalUsdAmount: amountPerSeat.toString(),
        exchangeRate: USD_TO_THB_RATE.toString(),
      },
    });

    return { sessionId: session.id, url: session.url };
  },
);

export const createBundleCheckoutSession = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { bundleId, userId, bundleTitle, amount } = ctx.data;

    if (!stripe) {
      throw new Error("Stripe is not configured.");
    }

    if (!apiKey) {
      throw new Error("Stripe Secret Key is missing.");
    }

    // Conversion Logic: PromptPay requires THB.
    const USD_TO_THB_RATE = 36.5;
    const amountInThbCents = Math.round(amount * USD_TO_THB_RATE * 100);
    const finalUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "promptpay"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: `Bundle Mastery: ${bundleTitle}`,
              description: `Unlock all courses. Converted from USD at ${USD_TO_THB_RATE}.`,
            },
            unit_amount: amountInThbCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${finalUrl}/dashboard?success=true`,
      cancel_url: `${finalUrl}/?canceled=true`,
      metadata: {
        bundleId,
        userId,
        type: "bundle_purchase",
        bundleTitle,
        originalUsdAmount: amount.toString(),
        exchangeRate: USD_TO_THB_RATE.toString(),
      },
    });

    return { sessionId: session.id, url: session.url };
  },
);

export const createStripeCheckoutSession = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { courseId, userId, courseTitle, couponId } = ctx.data;

    if (!stripe) {
      throw new Error(
        "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.",
      );
    }

    if (!apiKey) {
      throw new Error("Stripe Secret Key is missing.");
    }

    const { getAdminDb } = await import("./supabase");
    const db = getAdminDb();

    // 1. Fetch authentic course price from DB
    const { data: course, error: courseError } = await db
      .from("courses")
      .select("price, title, is_on_sale, sale_price, sale_expires_at, is_campaign_active")
      .eq("id", courseId)
      .single();

    if (courseError || !course) throw new Error("Course not found or invalid.");

    // Determine Base Price (Flash Sale & Campaign support)
    let basePrice = Number(course.price || 0);
    const isOnSale = course.is_on_sale ?? false;
    const salePrice = Number(course.sale_price ?? 0);
    const saleExpiresAt = course.sale_expires_at;

    const isSaleActive = isOnSale && (!saleExpiresAt || new Date(saleExpiresAt) > new Date());

    if (isSaleActive && salePrice > 0) {
      basePrice = salePrice;
    } else if (course.is_campaign_active) {
      basePrice = Math.round(basePrice * 0.9 * 100) / 100; // 10% discount for Revenue-share Ads
    }

    let finalAmount = basePrice;

    // 2. Validate Coupon Server-Side (EC-014)
    if (couponId) {
      const { data: coupon, error: couponError } = await db
        .from("coupons")
        .select("*")
        .eq("id", couponId)
        .single();

      if (couponError || !coupon) throw new Error("Invalid coupon applied.");

      const now = new Date();
      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        throw new Error("Coupon has expired.");
      }

      const usageLimit = coupon.usage_limit || 0;
      const usedCount = coupon.used_count || 0;
      if (usageLimit > 0 && usedCount >= usageLimit) {
        throw new Error("Coupon usage limit reached. It cannot be used anymore.");
      }

      // Calculate Discount Based on Type
      const discountVal = Number(coupon.discount_amount || 0);
      const discountType = (coupon.discount_type || "fixed").toLowerCase();

      if (discountType === "percentage") {
        const discountPercent = Math.min(100, discountVal);
        finalAmount = Math.max(0, basePrice * (1 - discountPercent / 100));
      } else {
        finalAmount = Math.max(0, basePrice - discountVal);
      }
    }

    // Conversion Logic: PromptPay requires THB.
    const USD_TO_THB_RATE = 36.5;
    const amountInThbCents = Math.round(finalAmount * USD_TO_THB_RATE * 100);

    // Fallback URL logic to ensure local testing works on 8080
    const finalUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "promptpay"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: course.title || courseTitle,
              description: `Converted from USD at ${USD_TO_THB_RATE} rate.`,
            },
            unit_amount: amountInThbCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${finalUrl}/courses/${courseId}/learn?success=true`,
      cancel_url: `${finalUrl}/checkout/${courseId}?canceled=true`,
      metadata: {
        type: "individual_purchase",
        courseId,
        userId,
        couponId: couponId || "",
        originalUsdAmount: finalAmount.toString(),
        exchangeRate: USD_TO_THB_RATE.toString(),
      },
    });

    return { sessionId: session.id, url: session.url };
  },
);
