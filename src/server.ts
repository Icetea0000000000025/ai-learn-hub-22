import "./lib/error-capture";
import { incrementCouponUsage as _incrementCouponUsage } from "./lib/coupons";
import { propagateEnvToProcess, resolveEnv } from "./server-runtime/env";
import { getStripeClient } from "./server-runtime/stripe";
import { handleWebhook } from "./server-runtime/webhook";
import {
  getServerEntry,
  brandedErrorResponse,
  normalizeCatastrophicSsrResponse,
} from "./server-runtime/ssr";

// Preserve original import side-effects (no behavior change)
void _incrementCouponUsage;

export default {
  async fetch(request: Request, env: any, ctx: unknown) {
    const url = new URL(request.url);
    const normalizedPath = url.pathname.replace(/\/$/, "");

    propagateEnvToProcess(env);
    const resolved = resolveEnv(env);
    const stripeClient = getStripeClient(resolved.effectiveApiKey);

    if (normalizedPath === "/api/stripe-webhook" || normalizedPath === "/api/stripe/webhook") {
      return handleWebhook(request, resolved, stripeClient);
    }

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
