import { addLog } from "./webhook-log";

export type FulfillmentArgs = {
  db: any;
  userId: string | null;
  courseId: string | null;
  bundleId: string | null;
  couponId: string | null;
  orgId: string | null;
  seatCount: number;
  type: string | undefined;
  getMeta: (key: string) => any;
  obj: any;
};

export async function runFulfillment(args: FulfillmentArgs): Promise<{ fulfilled: boolean }> {
  const { db, userId, courseId, bundleId, couponId, orgId, seatCount, type, getMeta, obj } = args;
  let fulfilled = false;

  if (!userId) return { fulfilled };

  // PRIORITY 1: B2B Organization License
  if (orgId && (courseId || type === "org_package_purchase")) {
    if (courseId) {
      const seats = seatCount || 1;
      addLog(`B2B ACTION: Provisioning ${seats} seats for org ${orgId}`);
      const { data: pkg } = await db
        .from("organization_packages")
        .select("*")
        .eq("organization_id", orgId)
        .eq("course_id", courseId)
        .maybeSingle();
      if (pkg) {
        await db
          .from("organization_packages")
          .update({ max_seats: (pkg.max_seats || 0) + seats })
          .eq("id", pkg.id);
      } else {
        await db.from("organization_packages").insert({
          organization_id: orgId,
          course_id: courseId,
          max_seats: seats,
          used_seats: 0,
        });
      }
      fulfilled = true;
    }
  }

  // PRIORITY 2: Enterprise Plan
  if (type === "enterprise_plan") {
    await db
      .from("profiles")
      .update({ org_request_status: "approved" })
      .eq("id", userId);
    fulfilled = true;
  }

  // PRIORITY 2.1: Creator Subscriptions
  if (type === "subscription_purchase") {
    const tier = getMeta("tier") || "free";
    addLog(`SUBSCRIPTION ACTION: Upgrading user ${userId} to ${tier} tier`);
    await db
      .from("profiles")
      .update({
        subscription_tier: tier,
        subscription_expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 30 days
      })
      .eq("id", userId);
    fulfilled = true;
  }

  // PRIORITY 2.2: Ad Purchases
  if (type === "ad_purchase") {
    const durationStr = getMeta("durationDays") || getMeta("duration_days") || "0";
    const durationDays = parseInt(durationStr);
    const adType = getMeta("adType") || getMeta("ad_type") || "featured";
    const amountPaid = (obj.amount_total || obj.amount || 0) / 100;

    addLog(
      `AD ACTION START: Applying ${adType} for ${durationDays} days to course ${courseId}. Amount: ${amountPaid}`,
    );

    if (courseId && courseId !== "null") {
      const expiresAt = new Date(
        Date.now() + durationDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { error: updateErr } = await db
        .from("courses")
        .update({
          ad_type: adType,
          ad_expires_at: expiresAt,
          ad_amount_paid: amountPaid,
          is_featured: adType === "featured" ? true : false,
        })
        .eq("id", courseId);

      if (updateErr) {
        addLog(`AD UPDATE ERROR: ${updateErr.message}`);
        throw updateErr;
      }

      const { error: insertErr } = await db.from("ad_purchases" as any).insert({
        user_id: userId,
        course_id: courseId,
        ad_type: adType,
        duration_days: durationDays,
        amount: amountPaid,
        status: "completed",
        expires_at: expiresAt,
      });

      if (insertErr) addLog(`AD PURCHASE RECORD ERROR: ${insertErr.message}`);

      addLog(`AD SUCCESS: ${courseId} is now ${adType} for ${durationDays} days.`);
      fulfilled = true;
    } else {
      addLog("AD ERROR: Missing or invalid courseId in metadata.");
    }
  }

  // PRIORITY 3: Bundle
  if (bundleId && !fulfilled) {
    const { data: bcs } = await db
      .from("bundle_courses")
      .select("course_id")
      .eq("bundle_id", bundleId);
    if (bcs) {
      for (const bc of bcs) {
        await db.from("enrollments").upsert(
          {
            user_id: userId,
            course_id: bc.course_id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,course_id" } as any,
        );
      }
      fulfilled = true;
    }
  }

  // PRIORITY 4: Standard Course
  const isB2B = !!orgId || type === "org_package_purchase";
  if (!fulfilled && courseId && !isB2B) {
    await db
      .from("enrollments")
      .upsert(
        { user_id: userId, course_id: courseId, updated_at: new Date().toISOString() },
        { onConflict: "user_id,course_id" } as any,
      );
    if (couponId) {
      try {
        await db.rpc("increment_coupon_usage", { p_coupon_id: couponId });
      } catch (e) {
        // Ignore coupon increment errors
      }
    }
    fulfilled = true;
  }

  return { fulfilled };
}
