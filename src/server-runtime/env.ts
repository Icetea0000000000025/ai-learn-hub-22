import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  SUPABASE_URL,
} from "../lib/config";

export type ResolvedEnv = {
  effectiveApiKey: string | undefined;
  effectiveWebhookSecret: string | undefined;
  serviceRoleKey: string | undefined;
  effectiveSupabaseUrl: string | undefined;
};

export function propagateEnvToProcess(env: any) {
  if (env) {
    Object.keys(env).forEach((key) => {
      if (typeof env[key] === "string") {
        (process.env as any)[key] = env[key];
      }
    });
  }
}

export function resolveEnv(env: any): ResolvedEnv {
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

  return { effectiveApiKey, effectiveWebhookSecret, serviceRoleKey, effectiveSupabaseUrl };
}
