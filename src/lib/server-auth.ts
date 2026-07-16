import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { getAdminDb } from "./supabase";

/**
 * Server-side auth helpers for createServerFn handlers.
 * Reads the caller's Supabase session bearer token from the incoming
 * request's Authorization header and verifies it against Supabase Auth.
 *
 * The client attaches the header via a functionMiddleware registered in
 * src/start.ts.
 */

export type AuthedUser = { userId: string; email: string | null };

function getBearerToken(): string | null {
  const raw =
    (getRequestHeader as any)("authorization") ||
    (getRequestHeader as any)("Authorization");
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return null;
  const token = trimmed.slice(7).trim();
  return token || null;
}

export async function requireUser(): Promise<AuthedUser> {
  const token = getBearerToken();
  if (!token) throw new Error("Unauthorized");
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw new Error("Unauthorized");
  return { userId: data.user.id, email: data.user.email ?? null };
}

export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  const adminDb = getAdminDb();
  const { data, error } = await adminDb
    .from("profiles")
    .select("role")
    .eq("id", user.userId)
    .single();
  if (error || !data || (data as any).role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
