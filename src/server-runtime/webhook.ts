import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY } from "../lib/config";
import { addLog } from "./webhook-log";
import { runFulfillment } from "./fulfillment";
import { recordPayment } from "./payments";
import type { ResolvedEnv } from "./env";

export async function handleWebhook(
  request: Request,
  resolved: ResolvedEnv,
  stripeClient: Stripe | null,
): Promise<Response> {
  const { effectiveApiKey, effectiveWebhookSecret, serviceRoleKey, effectiveSupabaseUrl } = resolved;

  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature || !stripeClient || !effectiveWebhookSecret) {
      const msg = `ERROR: Missing config (Sig:${!!signature}, Client:${!!stripeClient}, Secret:${!!effectiveWebhookSecret})`;
      addLog(msg);
      return new Response(msg, { status: 400 });
    }

    const body = await request.text();
    let event;

    try {
      event = await stripeClient.webhooks.constructEventAsync(
        body,
        signature,
        effectiveWebhookSecret,
      );
    } catch (verifyErr: any) {
      addLog(`VERIFICATION ERROR: ${verifyErr.message}`);
      return new Response(`Signature Verification Failed: ${verifyErr.message}`, {
        status: 400,
      });
    }

    addLog(`EVENT: ${event.type}`);

    // WE HANDLE BOTH CHECKOUT AND PAYMENT_INTENT FOR MAX RELIABILITY
    if (
      event.type === "checkout.session.completed" ||
      event.type === "payment_intent.succeeded"
    ) {
      const obj = event.data.object as any;
      const isSession = event.type === "checkout.session.completed";

      const meta = obj.metadata || {};

      addLog(
        `PROCESSOR: Type=${event.type}, ID=${obj.id}, Amount=${obj.amount_total || obj.amount}`,
      );

      const getMeta = (key: string) =>
        meta[key] ||
        meta[key.toLowerCase()] ||
        meta[key.charAt(0).toUpperCase() + key.slice(1)];
      const clean = (val: any) =>
        val === "" || val === "null" || val === "undefined" || !val ? null : val;

      const userId = clean(getMeta("userId") || getMeta("user_id"));
      const courseId = clean(getMeta("courseId") || getMeta("course_id"));
      const bundleId = clean(getMeta("bundleId") || getMeta("bundle_id"));
      const couponId = clean(getMeta("couponId") || getMeta("coupon_id"));
      const orgId = clean(
        getMeta("orgId") || getMeta("organization_id") || getMeta("organizationId"),
      );
      const seatCountStr = getMeta("seatCount") || getMeta("seat_count") || "1";
      const seatCount = parseInt(seatCountStr);
      const type = getMeta("type");

      if (!userId) {
        addLog(`SKIP: No userId in metadata for ${obj.id}`);
        if (isSession) return new Response("Missing userId", { status: 200 });
      }

      const db = createClient(effectiveSupabaseUrl as string, serviceRoleKey || SUPABASE_ANON_KEY);

      try {
        const { fulfilled } = await runFulfillment({
          db,
          userId,
          courseId,
          bundleId,
          couponId,
          orgId,
          seatCount,
          type,
          getMeta,
          obj,
        });

        const transactionId = isSession
          ? obj.id
          : obj.id.startsWith("pi_")
            ? obj.id
            : obj.payment_intent;
        const paymentIntentId = isSession
          ? typeof obj.payment_intent === "string"
            ? obj.payment_intent
            : null
          : obj.id;

        await recordPayment({
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
        });
      } catch (err: any) {
        addLog(`DB ERROR: ${err.message}`);
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    addLog(`WEBHOOK CRITICAL ERROR: ${err.message}`);
    return new Response(`Error: ${err.message}`, { status: 400 });
  }
}
