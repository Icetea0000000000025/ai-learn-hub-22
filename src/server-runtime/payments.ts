import { addLog } from "./webhook-log";

export type RecordPaymentArgs = {
  db: any;
  userId: string | null;
  courseId: string | null;
  bundleId: string | null;
  orgId: string | null;
  couponId: string | null;
  seatCount: number;
  obj: any;
  transactionId: any;
  paymentIntentId: any;
  fulfilled: boolean;
};

export async function recordPayment(args: RecordPaymentArgs): Promise<void> {
  const {
    db,
    userId,
    courseId,
    bundleId,
    orgId,
    couponId,
    seatCount,
    obj,
    transactionId,
    paymentIntentId,
    fulfilled,
  } = args;

  const baseData: any = {
    user_id: userId,
    course_id: courseId,
    amount: (obj.amount_total || obj.amount || 0) / 100,
    status: "completed",
    created_at: new Date().toISOString(),
  };

  addLog(`RECORDING PAYMENT: Tx=${transactionId}, PI=${paymentIntentId}`);

  // ATTEMPT 1: Try with every possible column
  try {
    const fullData = {
      ...baseData,
      bundle_id: bundleId,
      organization_id: orgId,
      seat_count: seatCount || 0,
      currency: obj.currency || "usd",
      payment_method: obj.payment_method_types?.[0] || "stripe",
      transaction_id: transactionId,
      payment_intent_id: paymentIntentId,
      coupon_id: couponId,
      is_fulfilled: fulfilled,
      platform_fee_percent: 30,
    };

    const { error: fullErr } = await db
      .from("payments")
      .upsert(fullData, { onConflict: "transaction_id" });
    if (!fullErr) {
      addLog("SUCCESS: Payment recorded via Full Upsert.");
    } else {
      addLog(
        `FULL UPSERT FAILED: ${fullErr.message} (${fullErr.code}). Trying fallback...`,
      );

      // ATTEMPT 2: Try without 'transaction_id' (if column missing)
      const { transaction_id, ...noTxData } = fullData;
      const { error: noTxErr } = await db.from("payments").insert(noTxData);
      if (!noTxErr) {
        addLog("SUCCESS: Recorded via Insert (No transaction_id).");
      } else {
        addLog(`INSERT FAILED: ${noTxErr.message}. Trying Minimal Legacy...`);

        // ATTEMPT 3: Minimal Legacy (based on migrations.sql)
        const legacyData: any = {
          user_id: userId,
          course_id: courseId || "00000000-0000-0000-0000-000000000000", // Fallback if NOT NULL
          amount: baseData.amount,
          status: "completed",
          provider: fullData.payment_method,
        };

        const { error: legacyErr } = await db.from("payments").insert(legacyData);
        if (legacyErr) addLog(`LEGACY FATAL: ${legacyErr.message}`);
        else addLog("SUCCESS: Recorded via Legacy Minimal.");
      }
    }
  } catch (innerCatch: any) {
    addLog(`CRITICAL DB EXCEPTION: ${innerCatch.message}`);
  }
}
