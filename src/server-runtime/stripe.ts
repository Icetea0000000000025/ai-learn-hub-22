import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(effectiveApiKey: string | undefined): Stripe | null {
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
  return stripeClient;
}
