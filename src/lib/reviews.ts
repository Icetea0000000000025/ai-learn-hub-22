import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];

export type Review = {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string | null;
  user?: {
    name: string | null;
  };
};

export async function fetchReviewsByCourse(courseId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      *,
      profiles:user_id (name)
    `,
    )
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    courseId: row.course_id,
    userId: row.user_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    user: {
      name: row.profiles?.name || "Anonymous",
    },
  }));
}

export async function createReview(input: ReviewInsert) {
  // Check if user already reviewed
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("course_id", input.course_id!)
    .eq("user_id", input.user_id!)
    .maybeSingle();

  if (existing) {
    throw new Error("You have already reviewed this course.");
  }

  const { data, error } = await supabase.from("reviews").insert(input).select("*").single();

  if (error) throw error;

  // Update course rating and reviews count
  const { data: allReviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("course_id", input.course_id!);

  if (allReviews?.length) {
    const totalRating = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = totalRating / allReviews.length;

    await supabase
      .from("courses")
      .update({
        rating: avgRating,
        reviews: allReviews.length,
      })
      .eq("id", input.course_id!);
  }

  return data;
}
