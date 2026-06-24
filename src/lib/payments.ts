import { supabase, getAdminDb } from "./supabase";
import type { Database, PaymentInsert, PaymentRow } from "./database.types";
import { enrollInCourse } from "./enrollments";
import { SUBSCRIPTION_PLANS } from "./config";

export async function createPaymentRecord(input: PaymentInsert) {
  const adminDb = getAdminDb();

  // Ensure transaction_id is present and unique
  const finalInput = {
    ...input,
    transaction_id:
      input.transaction_id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  // Dynamic Platform Fee Calculation
  if (input.course_id && !input.platform_fee_percent) {
    try {
      // 1. Get Course and Creator
      const { data: course } = await adminDb
        .from("courses")
        .select("creator_id, is_campaign_active")
        .eq("id", input.course_id)
        .single();

      if (course?.creator_id) {
        // 2. Get Creator Tier
        const { data: profile } = await adminDb
          .from("profiles")
          .select("subscription_tier")
          .eq("id", course.creator_id)
          .single();

        const tier = (profile?.subscription_tier || "free") as keyof typeof SUBSCRIPTION_PLANS;
        let fee = SUBSCRIPTION_PLANS[tier].revenueShare;

        // 3. Campaign Ad Surcharge (+15%)
        // As per Learnlab: Normal Tier % + 15% for Campaign (10% for user discount, 5% for platform banner)
        if (course.is_campaign_active) {
          fee += 15;
        }

        finalInput.platform_fee_percent = fee;
      }
    } catch (e) {
      console.error("Failed to calculate dynamic fee, defaulting to 30%:", e);
      finalInput.platform_fee_percent = 30;
    }
  }

  const { data, error } = await supabase.from("payments").insert(finalInput).select().single();

  if (error) throw error;
  return data;
}

export async function fetchUserPayments(userId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*, courses(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchCreatorSales(creatorId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*, courses!inner(title, creator_id), profiles!inner(name, email)")
    .eq("courses.creator_id", creatorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchCreatorRevenue(creatorId: string) {
  // 1. Get total revenue from completed payments for courses by this creator
  const { data: payments, error } = await supabase
    .from("payments")
    .select("amount, courses!inner(creator_id)")
    .eq("courses.creator_id", creatorId)
    .eq("status", "completed");

  if (error) throw error;

  const totalRevenue = payments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;

  // 2. Get total unique enrollments for students count
  const { data: enrollmentData, error: enrollError } = await supabase
    .from("enrollments")
    .select(
      `
      id,
      courses!inner (creator_id)
    `,
    )
    .eq("courses.creator_id", creatorId);

  if (enrollError) throw enrollError;

  // 3. Get average rating across all courses
  const { data: courses, error: courseError } = await supabase
    .from("courses")
    .select("rating")
    .eq("creator_id", creatorId)
    .gt("reviews", 0);

  let avgRating = 0;
  if (!courseError && courses?.length) {
    const totalRating = courses.reduce((acc, c) => acc + (c.rating || 0), 0);
    avgRating = totalRating / courses.length;
  }

  return {
    total: totalRevenue,
    transactions: enrollmentData?.length || 0,
    averageRating: avgRating,
  };
}
