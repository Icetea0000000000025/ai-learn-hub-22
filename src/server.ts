import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "./lib/config";
import { incrementCouponUsage } from "./lib/coupons";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }
  if (!payload || Array.isArray(payload) || typeof payload !== "object") return false;
  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) return false;
  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// Lazy init
let stripeClient: Stripe | null = null;
const WEBHOOK_LOGS: string[] = [];
function addLog(msg: string) {
  const entry = `[${new Date().toISOString()}] ${msg}`;
  WEBHOOK_LOGS.unshift(entry);
  if (WEBHOOK_LOGS.length > 50) WEBHOOK_LOGS.pop();
  console.log(entry);
}

export default {
  async fetch(request: Request, env: any, ctx: unknown) {
    const url = new URL(request.url);
    const normalizedPath = url.pathname.replace(/\/$/, "");

    // Environment Propagation
    if (env) {
      Object.keys(env).forEach((key) => {
        if (typeof env[key] === "string") {
          (process.env as any)[key] = env[key];
        }
      });
    }

    const effectiveApiKey = (
      env?.STRIPE_SECRET_KEY ||
      process.env.STRIPE_SECRET_KEY ||
      STRIPE_SECRET_KEY
    )?.trim();
    const effectiveWebhookSecret = (
      env?.STRIPE_WEBHOOK_SECRET ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      STRIPE_WEBHOOK_SECRET
    )?.trim();
    let serviceRoleKey = (
      env?.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      env?.SB_SERVICE_ROLE_KEY ||
      process.env.SB_SERVICE_ROLE_KEY
    )?.trim();

    if (serviceRoleKey) serviceRoleKey = serviceRoleKey.split(/\s+/)[0];
    const effectiveSupabaseUrl = (
      env?.SUPABASE_URL ||
      env?.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      SUPABASE_URL
    )?.trim();

    if (!stripeClient && effectiveApiKey) {
      stripeClient = new Stripe(effectiveApiKey, { apiVersion: "2026-04-22.dahlia" as any });
    } else if (
      stripeClient &&
      effectiveApiKey &&
      (stripeClient as any)._api?.auth !== `Bearer ${effectiveApiKey}`
    ) {
      // Re-init if key changed
      stripeClient = new Stripe(effectiveApiKey, { apiVersion: "2026-04-22.dahlia" as any });
    }

    // WEBHOOK HANDLER
    if (normalizedPath === "/api/stripe-webhook" || normalizedPath === "/api/stripe/webhook") {
      if (request.method === "GET") {
        return new Response(
          JSON.stringify({
            status: "active",
            diagnostics: {
              hasStripeKey: !!effectiveApiKey,
              hasWebhookSecret: !!effectiveWebhookSecret,
              webhookSecretLength: effectiveWebhookSecret?.length || 0,
              hasServiceKey: !!serviceRoleKey,
              serviceKeyLength: serviceRoleKey?.length || 0,
              hasUrl: !!effectiveSupabaseUrl,
              url: effectiveSupabaseUrl,
              stripeVersion: "2026-04-22.dahlia",
            },
            logs: WEBHOOK_LOGS,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }
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

          // For PI events, we might need to fetch the session if metadata is missing,
          // but usually Stripe syncs metadata from Session to PI.
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
            if (isSession) return new Response("Missing userId", { status: 200 }); // Still return 200 to Stripe
          }

          const db = createClient(effectiveSupabaseUrl, serviceRoleKey || SUPABASE_ANON_KEY);

          try {
            let fulfilled = false;

            // FULFILLMENT LOGIC (Only if we have the necessary IDs)
            if (userId) {
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

                  // Update Course with error checking
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

                  // Record Ad Purchase
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
            }

            // RECORD PAYMENT (THE CORE FIX)
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

    // MAIN HANDLER
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
