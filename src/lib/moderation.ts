import { supabase, getAdminDb } from "./supabase";
import type { ReportInsert, ReportUpdate } from "./database.types";
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "./server-auth";

export async function submitReport(report: ReportInsert) {
  const { data, error } = await supabase.from("reports").insert(report).select().single();

  if (error) throw error;
  return data;
}

export async function fetchAllReports() {
  const { data, error } = await supabase
    .from("reports")
    .select("*, courses(title, creator_id), profiles:reporter_id(name, email)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * SERVER FUNCTION: Update report status (Admin only)
 */
export const updateReportStatus = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  await requireAdmin();
  const { id, status } = ctx.data;
  const adminDb = getAdminDb();

  const { data, error } = await adminDb
    .from("reports")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
});

/**
 * SERVER FUNCTION: Delete a report (Dismiss)
 */
export const deleteReport = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const payload = ctx?.data ?? ctx;
  const reportId = typeof payload === "string" ? payload : payload?.id;
  const adminDb = getAdminDb();

  const { error } = await adminDb.from("reports").delete().eq("id", reportId);

  if (error) throw error;
  return true;
});
