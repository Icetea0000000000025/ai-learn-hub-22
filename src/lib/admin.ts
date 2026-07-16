import { createServerFn } from "@tanstack/react-start";
import { supabase, getAdminDb } from "./supabase";
import { mapCourse } from "./courses";
import { requireAdmin } from "./server-auth";

export type StudentProgress = {
  student: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  course: {
    id: string;
    title: string;
  };
  enrollment_date: string;
  completed_lessons: number;
  total_lessons: number;
  progress_percent: number;
  last_active: string | null;
  has_certificate: boolean;
  quiz_scores: {
    quiz_title: string;
    score: number;
    passed: boolean;
    completed_at: string;
  }[];
};

/**
 * Resilient fetch for all payments using Server Function to bypass RLS.
 */
export const fetchAllPayments = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  try {
    const db = await getAdminDb();

    // 1. Fetch basic payment data
    const { data: basePayments, error: baseError } = await db
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (baseError) {
      console.error("DB Error fetching payments:", baseError);
      return [];
    }

    if (!basePayments) return [];

    // 2. Enrich with course, bundle, organization, and profile data
    const enrichedPayments = await Promise.all(
      basePayments.map(async (p: any) => {
        const enriched: any = {
          ...p,
          payment_method: p.payment_method || p.provider || "stripe",
          transaction_id: p.transaction_id || p.id,
        };

        if (p.user_id) {
          const { data: profile } = await db
            .from("profiles")
            .select("name, email")
            .eq("id", p.user_id)
            .single();
          enriched.profiles = profile;
        }

        if (p.course_id && p.course_id !== "00000000-0000-0000-0000-000000000000") {
          const { data: course } = await db
            .from("courses")
            .select("title, creator_id")
            .eq("id", p.course_id)
            .single();
          enriched.courses = course;
        }

        if (p.bundle_id) {
          const { data: bundle } = await (db as any)
            .from("bundles")
            .select("title")
            .eq("id", p.bundle_id)
            .single();
          enriched.bundles = bundle;
        }

        if (p.organization_id) {
          const { data: org } = await (db as any)
            .from("organizations")
            .select("name")
            .eq("id", p.organization_id)
            .single();
          enriched.organizations = org;
        }

        return enriched;
      }),
    );

    return enrichedPayments;
  } catch (err: any) {
    console.error("fetchAllPayments Server Error:", err);
    return [];
  }
});

export const fetchPlatformStats = createServerFn({ method: "GET" }).handler(async () => {
  const db = await getAdminDb();

  const { count: userCount, error: userError } = await db
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (userError) throw userError;

  const { data: coursesData, error: courseError } = await db.from("courses").select("*");

  if (courseError) throw courseError;
  const courses = (coursesData || []).map(mapCourse);

  const { data: payments, error: paymentError } = await db
    .from("payments")
    .select("amount, status, currency")
    .eq("status", "completed");

  if (paymentError) throw paymentError;

  // Group revenue by currency and calculate a unified total (USD base)
  const revenueByCurrency: Record<string, number> = {};
  const EXCHANGE_RATE_THB_TO_USD = 1 / 35; // Default: 1 USD = 35 THB

  let totalRevenueUSD = 0;

  payments?.forEach((p) => {
    const curr = (p.currency || "usd").toLowerCase();
    const amount = p.amount || 0;
    revenueByCurrency[curr] = (revenueByCurrency[curr] || 0) + amount;

    if (curr === "thb") {
      totalRevenueUSD += amount * EXCHANGE_RATE_THB_TO_USD;
    } else {
      totalRevenueUSD += amount;
    }
  });

  // 1. Calculate Conversion Rate based on unique enrolled users
  const { data: enrollmentUsers, error: enrollError } = await db
    .from("enrollments")
    .select("user_id");

  if (enrollError) throw enrollError;

  const uniqueEnrolledUsers = new Set(enrollmentUsers?.map((e) => e.user_id) || []).size;
  const conversionRate =
    userCount && userCount > 0
      ? Math.min(Math.round((uniqueEnrolledUsers / userCount) * 100), 100)
      : 0;

  // 2. Calculate Avg. Engagement based on actual enrolled lessons
  // Get count of lessons grouped by course
  const { data: lessonsData, error: lessonsError } = await db
    .from("lessons")
    .select("id, course_id");

  if (lessonsError) throw lessonsError;

  const lessonsPerCourse: Record<string, number> = {};
  lessonsData?.forEach((l) => {
    if (l.course_id) {
      lessonsPerCourse[l.course_id] = (lessonsPerCourse[l.course_id] || 0) + 1;
    }
  });

  // Calculate actual possible completions (sum of lessons in enrolled courses)
  const { data: enrollmentsData, error: enrollsError } = await db
    .from("enrollments")
    .select("course_id");

  if (enrollsError) throw enrollsError;

  let possibleCompletions = 0;
  enrollmentsData?.forEach((e) => {
    if (e.course_id) {
      possibleCompletions += lessonsPerCourse[e.course_id] || 0;
    }
  });

  // Count progress records where completed_at is not null
  const { count: actualCompletionsCount, error: progressError } = await db
    .from("lesson_progress")
    .select("*", { count: "exact", head: true })
    .not("completed_at", "is", null);

  if (progressError) throw progressError;

  const actualCompletions = actualCompletionsCount || 0;
  const engagementScore =
    possibleCompletions > 0
      ? Math.min(Math.round((actualCompletions / possibleCompletions) * 100), 100)
      : 0;

  return {
    totalUsers: userCount || 0,
    totalCourses: courses.length,
    totalRevenue: totalRevenueUSD,
    revenueByCurrency,
    draftCourses: courses.filter((c) => c.status?.toLowerCase() === "draft").length,
    conversionRate: `${conversionRate}%`,
    engagement: `${engagementScore}%`,
  };
});

export const fetchRevenueByMonth = createServerFn({ method: "GET" }).handler(async () => {
  const db = await getAdminDb();
  const { data, error } = await db
    .from("payments")
    .select("amount, created_at, currency")
    .eq("status", "completed")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const EXCHANGE_RATE_THB_TO_USD = 1 / 35;
  const monthlyData: Record<string, { total: number; year: number; month: number; label: string }> =
    {};

  data?.forEach((p) => {
    if (!p.created_at) return;
    const date = new Date(p.created_at);
    const year = date.getFullYear();
    const month = date.getMonth();
    const label = date.toLocaleString("default", { month: "short" });
    const key = `${year}-${month}`;

    if (!monthlyData[key]) {
      monthlyData[key] = { total: 0, year, month, label };
    }

    const curr = (p.currency || "usd").toLowerCase();
    const amount = p.amount || 0;

    if (curr === "thb") {
      monthlyData[key].total += amount * EXCHANGE_RATE_THB_TO_USD;
    } else {
      monthlyData[key].total += amount;
    }
  });

  return Object.values(monthlyData).map((d) => ({
    name: d.label,
    total: Number(d.total.toFixed(2)), // Unified USD total
    year: d.year,
    month: d.month,
  }));
});

export const fetchRevenueByDay = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { year, month } = ctx.data as { year: number; month: number };
  const db = await getAdminDb();
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data, error } = await db
    .from("payments")
    .select("amount, created_at, currency")
    .eq("status", "completed")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const EXCHANGE_RATE_THB_TO_USD = 1 / 35;
  const dailyData: Record<string, number> = {};

  data?.forEach((p) => {
    if (!p.created_at) return;
    const day = new Date(p.created_at).getDate();

    const curr = (p.currency || "usd").toLowerCase();
    const amount = p.amount || 0;
    let amountInUsd = 0;

    if (curr === "thb") {
      amountInUsd = amount * EXCHANGE_RATE_THB_TO_USD;
    } else {
      amountInUsd = amount;
    }

    dailyData[day] = (dailyData[day] || 0) + amountInUsd;
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result = [];
  for (let d = 1; d <= daysInMonth; d++) {
    result.push({
      name: d.toString(),
      total: Number((dailyData[d] || 0).toFixed(2)), // Unified USD total
    });
  }

  return result;
});

export async function fetchStudentsProgressForCreator(
  creatorId: string,
  courseId?: string,
): Promise<StudentProgress[]> {
  let query = supabase
    .from("enrollments")
    .select(
      `
      id,
      user_id,
      course_id,
      enrolled_at,
      profiles:user_id (id, name, email, avatar_url),
      courses:course_id (id, title, creator_id)
    `,
    )
    .order("enrolled_at", { ascending: false });

  if (courseId) {
    query = query.eq("course_id", courseId);
  } else {
    const { data: creatorCourses } = await supabase
      .from("courses")
      .select("id")
      .eq("creator_id", creatorId);

    if (!creatorCourses?.length) return [];
    query = query.in(
      "course_id",
      creatorCourses.map((c) => c.id),
    );
  }

  const { data: enrollments, error } = await query;

  if (error) throw error;
  if (!enrollments?.length) return [];

  const results = await Promise.all(
    enrollments.map(async (enr: any) => {
      // 1. Get lesson progress records
      const { data: progressRecords } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed_at")
        .eq("user_id", enr.user_id)
        .eq("course_id", enr.course_id);

      // 2. Get all lessons in course to count total
      const { count: totalCount } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("course_id", enr.course_id);

      // 3. Get quiz attempts for this user IN THIS COURSE
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select(
          `
          score,
          passed,
          completed_at,
          quiz_id,
          quizzes:quiz_id!inner (
            id, 
            title, 
            lesson_id,
            lessons:lesson_id!inner (course_id)
          )
        `,
        )
        .eq("user_id", enr.user_id)
        .eq("quizzes.lessons.course_id", enr.course_id)
        .order("completed_at", { ascending: false });

      // 4. Calculate completed lessons (Progress records + Passed quizzes)
      const completedLessonIds = new Set([
        ...(progressRecords?.map((p) => p.lesson_id) || []),
        ...(attempts
          ?.filter((a) => a.passed)
          .map((a: any) => a.quizzes?.lesson_id)
          .filter(Boolean) || []),
      ]);

      const completed = completedLessonIds.size;
      const total = totalCount || 1;

      // 5. Check for certificate
      const { data: cert } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", enr.user_id)
        .eq("course_id", enr.course_id)
        .maybeSingle();

      const parseDate = (d: any) => {
        if (!d) return 0;
        const time = new Date(d).getTime();
        return isNaN(time) ? 0 : time;
      };

      const lastProgressDate = progressRecords?.length
        ? Math.max(...progressRecords.map((p) => parseDate(p.completed_at)))
        : 0;
      const lastQuizDate = attempts?.length
        ? Math.max(...attempts.map((a) => parseDate(a.completed_at)))
        : 0;

      const maxDate = Math.max(lastProgressDate, lastQuizDate);
      const finalLastActive = maxDate > 0 ? new Date(maxDate).toISOString() : enr.enrolled_at;

      return {
        student: {
          id: enr.profiles?.id || enr.user_id,
          name: enr.profiles?.name || null,
          email: enr.profiles?.email || null,
          avatar_url: enr.profiles?.avatar_url || null,
        },
        course: {
          id: enr.courses?.id,
          title: enr.courses?.title || "Unknown Course",
        },
        enrollment_date: enr.enrolled_at,
        completed_lessons: completed,
        total_lessons: total,
        progress_percent: Math.round((completed / total) * 100),
        last_active: finalLastActive,
        has_certificate: !!cert,
        quiz_scores: (attempts || []).map((a: any) => ({
          quiz_title: a.quizzes?.title || "Assessment",
          score: a.score,
          passed: a.passed,
          completed_at: a.completed_at,
        })),
      };
    }),
  );

  return results;
}
