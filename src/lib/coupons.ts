import { supabase } from "./supabase";

export type Coupon = {
  id: string;
  code: string;
  discountAmount: number;
  discountType: "fixed" | "percentage";
  usageLimit: number;
  usedCount: number;
  expiresAt: string | null;
};

export async function fetchCoupons() {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data as any[]) ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    discountAmount: Number(row.discount_amount),
    discountType: row.discount_type || "fixed",
    usageLimit: row.usage_limit,
    usedCount: row.used_count,
    expiresAt: row.expires_at,
  }));
}

export async function createCoupon(input: any) {
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code: input.code.toUpperCase(),
      discount_amount: input.discountAmount,
      discount_type: input.discountType || "fixed",
      usage_limit: input.usageLimit,
      expires_at: input.expiresAt,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw error;
}

export async function validateCoupon(code: string) {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Invalid coupon code.");

  const d = data as any;
  const now = new Date();
  if (d.expires_at && new Date(d.expires_at) < now) {
    throw new Error("Coupon has expired.");
  }

  if (d.usage_limit > 0 && d.used_count >= d.usage_limit) {
    throw new Error("Coupon usage limit reached.");
  }

  return {
    id: d.id,
    code: d.code,
    discountAmount: Number(d.discount_amount),
    discountType: d.discount_type || "fixed",
  };
}

export async function incrementCouponUsage(id: string) {
  try {
    // Attempt hardened RPC
    const { error } = await (supabase as any).rpc("increment_coupon_usage", { p_coupon_id: id });
    if (error) throw error;
  } catch (err) {
    console.error("Coupon Increment Error:", err);
    // No manual fallback here to preserve atomicity and quota safety
  }
}
