import { supabase } from "./supabase";

export async function markLessonComplete(userId: string, courseId: string, lessonId: string) {
  const { data, error } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,lesson_id",
      },
    )
    .select();

  if (error) throw error;

  // Update last active in enrollments to push to top of "Recently Active"
  await supabase
    .from("enrollments")
    .update({ updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("course_id", courseId);

  return data;
}

export async function unmarkLessonComplete(userId: string, lessonId: string) {
  const { error } = await supabase
    .from("lesson_progress")
    .delete()
    .eq("user_id", userId)
    .eq("lesson_id", lessonId);

  if (error) throw error;
}

export async function saveLessonProgressTime(
  userId: string,
  courseId: string,
  lessonId: string,
  seconds: number,
) {
  const { data, error } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        last_watched_seconds: seconds,
      },
      {
        onConflict: "user_id,lesson_id",
      },
    )
    .select();

  if (error) throw error;
  return data;
}

export async function fetchLessonProgressDetail(userId: string, lessonId: string) {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function fetchCourseProgress(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .eq("course_id", courseId);

  if (error) {
    // If table doesn't exist yet, return empty array instead of failing
    if (error.code === "PGRST116" || error.message.includes("does not exist")) {
      console.warn("lesson_progress table not found. Please run the SQL migration.");
      return [];
    }
    throw error;
  }

  return (data ?? []).map((p) => p.lesson_id);
}
