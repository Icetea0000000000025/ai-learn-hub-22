import { supabase, getAdminDb } from "./supabase";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./server-auth";

export async function fetchQuizzesByCourse(courseId: string) {
  // First get all lesson IDs for this course
  const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", courseId);

  if (!lessons || lessons.length === 0) return [];

  const lessonIds = lessons.map((l) => l.id);

  const { data, error } = await supabase.from("quizzes").select("*").in("lesson_id", lessonIds);

  if (error) throw error;
  return (data || []).map((data) => ({
    id: data.id,
    lessonId: data.lesson_id,
    title: data.title,
    passingScore: data.passing_score,
  }));
}

export async function fetchQuizByLesson(lessonId: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    lessonId: data.lesson_id,
    title: data.title,
    passingScore: data.passing_score,
    attemptsAllowed: (data as any).attempt_limit,
    timeLimit: data.time_limit,
  };
}

export async function fetchStudentQuizContent(quizId: string) {
  const { data: questions, error: qError } = await supabase
    .from("quiz_questions")
    .select("id, question_text, question_type")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (qError) throw qError;

  const results = [];
  for (const q of questions || []) {
    const { data: options, error: oError } = await supabase
      .from("quiz_options")
      .select("id, option_text, order_index")
      .eq("question_id", q.id)
      .order("order_index", { ascending: true });

    if (oError) throw oError;
    results.push({
      id: q.id,
      text: q.question_text,
      type: q.question_type,
      options: (options || []).map((o) => ({ id: o.id, text: o.option_text })),
    });
  }
  return results;
}

export async function fetchQuizContentInternal(quizId: string) {
  const { data: questions, error: qError } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (qError) throw qError;
  const results = [];
  for (const q of questions || []) {
    const { data: options, error: oError } = await supabase
      .from("quiz_options")
      .select("*")
      .eq("question_id", q.id)
      .order("order_index", { ascending: true });

    if (oError) throw oError;
    results.push({
      id: q.id,
      text: q.question_text,
      type: q.question_type,
      options: (options || []).map((o) => ({
        id: o.id,
        text: o.option_text,
        isCorrect: o.is_correct,
      })),
    });
  }
  return results;
}

/**
 * INTERNAL: Create a quiz.
 */
export async function createQuizInternal(input: any) {
  const adminDb = getAdminDb();
  const { data, error } = await adminDb.from("quizzes").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

/**
 * SERVER FUNCTION: Create a quiz.
 */
export const createQuiz = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  await requireUser();
  return createQuizInternal(ctx.data);
});

/**
 * INTERNAL: Update a quiz.
 */
export async function updateQuizInternal(id: string, updates: any) {
  const adminDb = getAdminDb();
  const { data, error } = await adminDb
    .from("quizzes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * SERVER FUNCTION: Update a quiz.
 */
export const updateQuiz = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  await requireUser();
  const { id, updates } = ctx.data;
  return updateQuizInternal(id, updates);
});

/**
 * INTERNAL: Create a question.
 */
export async function createQuestionInternal(input: any) {
  const adminDb = getAdminDb();
  const { data, error } = await adminDb.from("quiz_questions").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

/**
 * SERVER FUNCTION: Create a question.
 */
export const createQuestion = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  await requireUser();
  return createQuestionInternal(ctx.data);
});

/**
 * INTERNAL: Delete a question.
 */
export async function deleteQuestionInternal(id: string) {
  const adminDb = getAdminDb();
  const { error } = await adminDb.from("quiz_questions").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * SERVER FUNCTION: Delete a question.
 */
export const deleteQuestion = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  await requireUser();
  const payload = ctx?.data ?? ctx;
  const id = typeof payload === "string" ? payload : payload?.id;
  return deleteQuestionInternal(id);
});

/**
 * INTERNAL: Create an option.
 */
export async function createOptionInternal(input: any) {
  const adminDb = getAdminDb();
  const { data, error } = await adminDb.from("quiz_options").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

/**
 * SERVER FUNCTION: Create an option.
 */
export const createOption = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  return createOptionInternal(ctx.data);
});

export async function fetchBestQuizAttempt(quizId: string, userId: string) {
  // Directly use the user's ID and quiz ID to get the best attempt (highest score)
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching best attempt:", error);
  }

  return data;
}

export async function submitQuizAttempt(quizId: string, answers: Record<string, string[]>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("passing_score")
    .eq("id", quizId)
    .single();
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id")
    .eq("quiz_id", quizId);
  if (!questions) throw new Error("No questions found");

  let correctCount = 0;
  for (const q of questions) {
    const { data: options } = await supabase
      .from("quiz_options")
      .select("id, is_correct")
      .eq("question_id", q.id);
    const correctOptionIds = options?.filter((o) => o.is_correct).map((o) => o.id) || [];
    const selected = answers[q.id] || [];
    if (
      selected.length === correctOptionIds.length &&
      selected.every((id: string) => correctOptionIds.includes(id))
    )
      correctCount++;
  }

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= (quiz?.passing_score ?? 70);
  const { data: attemptData, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({ quiz_id: quizId, user_id: session.user.id, score, passed })
    .select()
    .single();
  if (attemptError) throw attemptError;
  return { attempt: attemptData, score, passed };
}
