import { supabase } from "./supabase";
import type { CertificateRow, CertificateInsert } from "./database.types";

export type Certificate = {
  id: string;
  userId: string;
  courseId: string;
  certificateUrl: string;
  recipientName: string | null;
  issuedAt: string;
  course?: {
    title: string;
  };
};

export async function fetchUserCertificates(userId: string) {
  const { data, error } = await supabase
    .from("certificates")
    .select(
      `
      id,
      user_id,
      course_id,
      certificate_url,
      recipient_name,
      issued_at,
      course:courses(title)
    `,
    )
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    certificateUrl: row.certificate_url,
    recipientName: row.recipient_name,
    issuedAt: row.issued_at,
    course: row.course ? { title: row.course.title } : undefined,
  }));
}

export async function issueCertificate(userId: string, courseId: string, recipientName: string) {
  // 1. First, try to find existing to avoid double insert
  const { data: existing } = await supabase
    .from("certificates")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) return existing;

  // 2. Insert new record with deterministic URL first if possible
  const certId = crypto.randomUUID();
  const certUrl = `/verify/${certId}`;

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      id: certId,
      user_id: userId,
      course_id: courseId,
      certificate_url: certUrl,
      recipient_name: recipientName,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("Supabase Certificate Insert Error:", error);
    throw error;
  }

  return data;
}
