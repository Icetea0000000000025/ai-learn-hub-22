import { supabase, getAdminDb } from "./supabase";
import type { LessonInsert, LessonRow } from "./database.types";
import { createServerFn } from "@tanstack/react-start";

export type Lesson = {
  id: string;
  courseId: string;
  moduleId: string | null;
  title: string;
  videoUrl: string | null;
  orderIndex: number;
  contentType: string;
  bodyText: string | null;
  attachmentUrl: string | null;
  isPreview: boolean;
};

export function mapLesson(row: any): Lesson {
  return {
    id: row.id,
    courseId: row.course_id || "",
    moduleId: row.module_id,
    title: row.title,
    videoUrl: row.video_url,
    orderIndex: row.order_index ?? 0,
    contentType: row.content_type || "video",
    bodyText: row.body_text || null,
    attachmentUrl: row.attachment_url || null,
    isPreview: row.is_preview ?? false,
  };
}

export async function fetchLessonById(id: string) {
  const { data, error } = await supabase.from("lessons").select("*").eq("id", id).single();

  if (error) {
    console.error("Fetch lesson by ID error:", error);
    throw error;
  }
  return mapLesson(data);
}

export async function fetchLessonsByCourse(courseId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Fetch lessons error:", error);
    throw error;
  }
  return (data ?? []).map(mapLesson);
}

/**
 * Fetches only the lesson metadata (titles, structure) for public viewing.
 * Uses the course_curriculum view to avoid RLS restrictions on video content.
 */
export async function fetchCurriculumByCourse(courseId: string) {
  const { data, error } = await (supabase as any)
    .from("course_curriculum")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (error) {
    console.warn("View 'course_curriculum' not found, falling back to lessons table:", error);
    return fetchLessonsByCourse(courseId);
  }
  return (data ?? []).map(mapLesson);
}

export async function fetchLessonsByModule(moduleId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapLesson);
}

/**
 * INTERNAL: Create a lesson.
 */
export async function createLessonInternal(input: Omit<LessonInsert, "id">) {
  const adminDb = getAdminDb();
  const { data, error } = await adminDb
    .from("lessons")
    .insert(input as any)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create lesson:", error);
    throw new Error(error.message);
  }
  return mapLesson(data);
}

/**
 * SERVER FUNCTION: Create a lesson.
 */
export const createLesson = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { data, token, userId: clientUserId } = ctx.data;

  // Auth Verification
  let userId = clientUserId;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) userId = userData.user.id;
  } else {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) userId = userData.user.id;
  }

  if (!userId) throw new Error("Unauthorized.");

  // Check if user owns the course
  const adminDb = getAdminDb();
  const { data: course } = await adminDb
    .from("courses")
    .select("creator_id")
    .eq("id", data.course_id)
    .single();

  const { data: profile } = await adminDb.from("profiles").select("role").eq("id", userId).single();

  if (course?.creator_id !== userId && profile?.role !== "admin") {
    throw new Error("Forbidden.");
  }

  return createLessonInternal(data);
});

/**
 * INTERNAL: Update a lesson.
 */
export async function updateLessonInternal(id: string, updates: Partial<LessonInsert>) {
  const adminDb = getAdminDb();
  const { data, error } = await adminDb
    .from("lessons")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update lesson:", error);
    throw error;
  }
  return mapLesson(data);
}

/**
 * SERVER FUNCTION: Update a lesson.
 */
export const updateLesson = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { id, updates, token, userId: clientUserId } = ctx.data;

  let userId = clientUserId;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) userId = userData.user.id;
  } else {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) userId = userData.user.id;
  }

  if (!userId) throw new Error("Unauthorized.");

  const adminDb = getAdminDb();
  const { data: lesson } = await adminDb.from("lessons").select("course_id").eq("id", id).single();
  if (!lesson || !lesson.course_id) throw new Error("Lesson not found or invalid.");

  const { data: course } = await adminDb
    .from("courses")
    .select("creator_id")
    .eq("id", lesson.course_id)
    .single();

  const { data: profile } = await adminDb.from("profiles").select("role").eq("id", userId).single();

  if (course?.creator_id !== userId && profile?.role !== "admin") {
    throw new Error("Forbidden.");
  }

  return updateLessonInternal(id, updates);
});

/**
 * INTERNAL: Delete a lesson.
 */
export async function deleteLessonInternal(id: string) {
  const adminDb = getAdminDb();
  const { error } = await adminDb.from("lessons").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete lesson:", error);
    throw error;
  }
  return true;
}

/**
 * SERVER FUNCTION: Delete a lesson.
 */
export const deleteLesson = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { id, token, userId: clientUserId } = ctx.data;

  let userId = clientUserId;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) userId = userData.user.id;
  } else {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) userId = userData.user.id;
  }

  if (!userId) throw new Error("Unauthorized.");

  const adminDb = getAdminDb();
  const { data: lesson } = await adminDb.from("lessons").select("course_id").eq("id", id).single();
  if (!lesson || !lesson.course_id) throw new Error("Lesson not found or invalid.");

  const { data: course } = await adminDb
    .from("courses")
    .select("creator_id")
    .eq("id", lesson.course_id)
    .single();

  const { data: profile } = await adminDb.from("profiles").select("role").eq("id", userId).single();

  if (course?.creator_id !== userId && profile?.role !== "admin") {
    throw new Error("Forbidden.");
  }

  return deleteLessonInternal(id);
});

/**
 * INTERNAL: Reorder lessons.
 */
export async function reorderLessonsInternal(lessons: { id: string; order_index: number }[]) {
  const adminDb = getAdminDb();
  const { error } = await adminDb.from("lessons").upsert(lessons as any);
  if (error) {
    console.error("Failed to reorder lessons:", error);
    throw error;
  }
  return true;
}

/**
 * SERVER FUNCTION: Reorder lessons.
 */
export const reorderLessons = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { lessons, token, userId: clientUserId } = ctx.data;

  let userId = clientUserId;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) userId = userData.user.id;
  }

  if (!userId) throw new Error("Unauthorized.");

  // Basic check for first lesson ownership (assuming all in same course)
  if (lessons.length > 0) {
    const adminDb = getAdminDb();
    const { data: lesson } = await adminDb
      .from("lessons")
      .select("course_id")
      .eq("id", lessons[0].id)
      .single();
    if (lesson && lesson.course_id) {
      const { data: course } = await adminDb
        .from("courses")
        .select("creator_id")
        .eq("id", lesson.course_id)
        .single();
      const { data: profile } = await adminDb
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (course?.creator_id !== userId && profile?.role !== "admin") throw new Error("Forbidden.");
    }
  }

  return reorderLessonsInternal(lessons);
});
