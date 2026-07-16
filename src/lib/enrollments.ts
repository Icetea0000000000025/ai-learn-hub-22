import { createServerFn } from "@tanstack/react-start";
import { supabase, getAdminDb } from "./supabase";
import type { Course } from "./courses";

export const deleteEnrollment = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { enrollmentId } = ctx.data;
  const adminDb = getAdminDb();

  const { error } = await adminDb.from("enrollments").delete().eq("id", enrollmentId);

  if (error) throw error;
  return { success: true };
});

export type Enrollment = {
  id: string;
  userId: string | null;
  courseId: string | null;
  enrolledAt: string | null;
};

export type EnrollmentWithCourse = {
  id: string;
  user_id: string | null;
  course_id: string | null;
  enrolled_at: string | null;
  updated_at: string | null;
  last_lesson_id: string | null;
  progress_percent: number;
  course: Course;
};

export async function updateLastLesson(userId: string, courseId: string, lessonId: string) {
  const { error } = await supabase
    .from("enrollments")
    .update({ last_lesson_id: lessonId })
    .eq("user_id", userId)
    .eq("course_id", courseId);

  if (error) throw error;
}

export async function fetchLastLesson(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("last_lesson_id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) throw error;
  return data?.last_lesson_id || null;
}

export async function enrollInCourse(userId: string, course_id: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .insert({
      user_id: userId,
      course_id: course_id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You are already enrolled in this course.");
    }
    throw error;
  }

  return { data, error: null };
}

export async function checkEnrollment(userId: string, courseId: string) {
  if (!userId) return false;

  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function fetchUserEnrollments(userId: string): Promise<EnrollmentWithCourse[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `
      *,
      course:courses(*, profiles(*))
    `,
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const enrollmentsWithProgress = await Promise.all(
    (data || []).map(async (row: any) => {
      // Get total lessons count
      const { count: totalLessons } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("course_id", row.course_id);

      // Get completed lessons count
      const { count: completedLessons } = await supabase
        .from("lesson_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("course_id", row.course_id);

      const progress_percent =
        totalLessons && totalLessons > 0
          ? Math.round(((completedLessons || 0) / totalLessons) * 100)
          : 0;

      return {
        ...row,
        progress_percent,
        course: {
          id: row.course.id,
          creatorId: row.course.creator_id,
          title: row.course.title,
          description: row.course.description || "",
          price: row.course.price || 0,
          imageUrl: row.course.image_url || undefined,
          status: row.course.status || undefined,
          instructor: row.course.profiles
            ? {
              name: row.course.profiles.name,
              avatar_url: row.course.profiles.avatar_url,
              role: row.course.profiles.role,
            }
            : undefined,
        },
      };
    }),
  );

  return enrollmentsWithProgress;
}
