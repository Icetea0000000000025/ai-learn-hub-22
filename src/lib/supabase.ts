import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Utility to get a Supabase client with Service Role privileges.
 * ONLY for use in server functions (createServerFn).
 */
export function getAdminDb() {
  const env = (typeof process !== "undefined" ? process.env : {}) as any;
  const globalEnv = (typeof globalThis !== "undefined" ? (globalThis as any).env : {}) as any;

  let serviceKey = (
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SB_SERVICE_ROLE_KEY ||
    env.SERVICE_ROLE_KEY ||
    globalEnv?.SUPABASE_SERVICE_ROLE_KEY ||
    globalEnv?.SB_SERVICE_ROLE_KEY ||
    (globalThis as any).process?.env?.SUPABASE_SERVICE_ROLE_KEY ||
    (globalThis as any).process?.env?.SB_SERVICE_ROLE_KEY
  )?.trim();

  // Robust cleaning
  if (serviceKey && serviceKey.startsWith("=")) {
    serviceKey = serviceKey.substring(1).trim();
  }
  if (serviceKey && serviceKey.includes(" ")) {
    serviceKey = serviceKey.split(/\s+/)[0];
  }

  let url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || SUPABASE_URL)?.trim();
  if (url && !url.startsWith("http")) {
    url = `https://${url}`;
  }

  if (serviceKey && serviceKey.length > 20) {
    console.log(`[getAdminDb] Initializing admin client with key length: ${serviceKey.length}`);
    return createClient<Database>(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  console.warn("[getAdminDb] Service role key missing or invalid. Falling back to anon client.");
  return supabase;
}
