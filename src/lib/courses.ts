import { supabase, getAdminDb } from "./supabase";
import type { LessonInsert, LessonRow } from "./database.types";
import { createServerFn } from "@tanstack/react-start";

export type Course = {
  id: string;
  creatorId: string | null;
  title: string;
  description: string;
  imageUrl?: string;
  price: number;
  discountPrice?: number;
  status?: string;
  category?: string;
  level?: string;
  students?: number;
  rating?: number;
  reviews?: number;
  createdAt?: string;
  promoVideoUrl?: string;
  isFeatured?: boolean;
  isOnSale?: boolean;
  salePrice?: number;
  saleExpiresAt?: string | null;
  adType?: string | null;
  adExpiresAt?: string | null;
  isCampaignActive?: boolean;
  adAmountPaid?: number;
  instructor?: {
    name: string | null;
    avatar_url: string | null;
    role: string | null;
    subscriptionTier?: string | null;
  };
};

export type NewCourseInput = {
  title: string;
  description: string;
  price: number;
  discountPrice?: number;
  imageUrl?: string;
  promoVideoUrl?: string;
  category?: string;
  level?: string;
};

export type CourseUpdate = {
  title?: string;
  description?: string;
  price?: number;
  discountPrice?: number;
  imageUrl?: string;
  promoVideoUrl?: string;
  status?: string;
  category?: string;
  level?: string;
  rating?: number;
  reviews?: number;
  students?: number;
  isFeatured?: boolean;
  isOnSale?: boolean;
  salePrice?: number;
  saleExpiresAt?: string | null;
  adType?: string | null;
  isCampaignActive?: boolean;
};

export function mapCourse(row: any): Course {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    description: row.description ?? "",
    imageUrl: row.image_url ?? undefined,
    price: row.price ?? 0,
    discountPrice: row.discount_price ?? undefined,
    status: row.status ?? undefined,
    category: row.category ?? undefined,
    level: row.level ?? undefined,
    students: row.students ?? 0,
    rating: row.rating ?? 0,
    reviews: row.reviews ?? 0,
    createdAt: row.created_at ?? undefined,
    promoVideoUrl: row.promo_video_url ?? undefined,
    isFeatured: row.is_featured ?? false,
    isOnSale: row.is_on_sale ?? false,
    salePrice: row.sale_price ?? 0,
    saleExpiresAt: row.sale_expires_at ?? null,
    adType: row.ad_type ?? null,
    isCampaignActive: row.is_campaign_active ?? false,
    adAmountPaid: row.ad_amount_paid ?? 0,
    instructor: row.profiles
      ? {
          name: row.profiles.name,
          avatar_url: row.profiles.avatar_url,
          role: row.profiles.role,
          subscriptionTier: row.profiles.subscription_tier,
        }
      : undefined,
  };
}

export function isSaleActive(course: Course): boolean {
  if (!course.isOnSale) return false;
  if (!course.saleExpiresAt) return true;
  try {
    return new Date(course.saleExpiresAt) > new Date();
  } catch (e) {
    return false;
  }
}

/**
 * Returns the final price for a course after applying active discounts.
 * Priority: 1. Flash Sale, 2. Campaign (10% off), 3. Original Price
 */
export function getCourseEffectivePrice(course: Course): number {
  // 1. Flash Sale Priority
  if (isSaleActive(course) && course.salePrice !== undefined && course.salePrice > 0) {
    return course.salePrice;
  }

  // 2. Campaign Discount (10% off for Revenue-share Ads)
  if (course.isCampaignActive) {
    const discounted = course.price * 0.9;
    return Math.round(discounted * 100) / 100;
  }

  return course.price;
}

export type Bundle = {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  courses: { id: string; title: string }[];
};

export function mapBundle(row: any): Bundle {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    price: row.price ?? 0,
    imageUrl: row.image_url ?? undefined,
    courses: (row.bundle_courses || []).map((bc: any) => ({
      id: bc.course_id,
      title: bc.courses?.title,
    })),
  };
}

export async function fetchBundles() {
  const { data, error } = await (supabase as any)
    .from("bundles")
    .select("*, bundle_courses(course_id, courses(title))")
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }

  return (data ?? []).map(mapBundle);
}

export async function fetchCourses(useAdminDb: boolean = false) {
  const db = useAdminDb ? getAdminDb() : supabase;
  const { data, error } = await db
    .from("courses")
    .select("*, profiles(*)")
    .order("ad_type", { ascending: false, nullsFirst: false })
    .order("ad_amount_paid", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapCourse);
}

export async function fetchCourseById(id: string) {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;

  const { data, error } = await supabase
    .from("courses")
    .select("*, profiles(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  if (data.status !== "published" && data.status !== "Published") {
    if (!userId) return null;

    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const isAdmin = viewerProfile?.role === "admin";
    const isCreator = data.creator_id === userId;

    if (!isAdmin && !isCreator) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", id)
        .maybeSingle();

      if (!enrollment) return null;
    }
  }

  // Fetch actual student count from enrollments table to ensure accuracy
  try {
    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", id);
      
    if (count !== null) {
      data.students = count;
    }
  } catch (err) {
    console.error("Failed to fetch student count:", err);
  }

  return mapCourse(data);
}

export async function fetchCoursesByCreator(creatorId: string) {
  const { data, error } = await supabase
    .from("courses")
    .select("*, profiles(*)")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapCourse);
}

export async function createCourseInternal(input: NewCourseInput, creatorId: string) {
  const adminDb = getAdminDb();
  const payload: any = {
    creator_id: creatorId,
    title: input.title,
    description: input.description,
    price: input.price,
    discount_price: input.discountPrice,
    image_url: input.imageUrl,
    promo_video_url: input.promoVideoUrl,
    category: input.category,
    level: input.level,
    status: "draft",
    rating: 0,
    reviews: 0,
    students: 0,
  };

  const { data, error } = await adminDb
    .from("courses")
    .insert(payload)
    .select("*, profiles(*)")
    .single();

  if (error) {
    console.error("สร้างคอร์สไม่สำเร็จ:", error);
    throw new Error(error.message);
  }

  return mapCourse(data);
}

/**
 * SERVER FUNCTION: Create a course.
 */
export const createCourse = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { input, creatorId, token } = ctx?.data ?? ctx;

  let userId = creatorId;

  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) userId = userData.user.id;
  } else {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) userId = userData.user.id;
  }

  if (!userId) {
    throw new Error("Session expired. Please log in again.");
  }

  if (creatorId && userId !== creatorId) {
    throw new Error("Unauthorized: Identity mismatch.");
  }

  return createCourseInternal(input, userId);
});

export async function updateCourseInternal(id: string, updates: CourseUpdate) {
  const adminDb = getAdminDb();

  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.discountPrice !== undefined) payload.discount_price = updates.discountPrice;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
  if (updates.promoVideoUrl !== undefined) payload.promo_video_url = updates.promoVideoUrl;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.level !== undefined) payload.level = updates.level;
  if (updates.rating !== undefined) payload.rating = updates.rating;
  if (updates.reviews !== undefined) payload.reviews = updates.reviews;
  if (updates.students !== undefined) payload.students = updates.students;
  if (updates.isFeatured !== undefined) payload.is_featured = updates.isFeatured;
  if (updates.isOnSale !== undefined) payload.is_on_sale = updates.isOnSale;
  if (updates.salePrice !== undefined) payload.sale_price = updates.salePrice;
  if (updates.saleExpiresAt !== undefined) payload.sale_expires_at = updates.saleExpiresAt;
  if (updates.adType !== undefined) payload.ad_type = updates.adType;
  if (updates.isCampaignActive !== undefined) payload.is_campaign_active = updates.isCampaignActive;

  const { data, error } = await adminDb
    .from("courses")
    .update(payload)
    .eq("id", id)
    .select("*, profiles(*)")
    .single();

  if (error) throw error;

  return mapCourse(data);
}

/**
 * SERVER FUNCTION: Update a course.
 */
export const updateCourse = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { id, updates, token, userId: clientUserId } = ctx?.data ?? ctx;
  console.log(`[Admin] Updating Course ${id}:`, updates);

  let userId = clientUserId;

  if (token) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (user) userId = user.id;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) userId = user.id;
  }

  if (!userId) userId = clientUserId;
  if (!userId) throw new Error("Unauthorized: No active session.");

  const adminDb = getAdminDb();
  const { data: course, error: courseErr } = await adminDb
    .from("courses")
    .select("creator_id, status")
    .eq("id", id)
    .single();

  if (courseErr || !course) throw new Error("Course not found.");

  const { data: profile } = await adminDb.from("profiles").select("role").eq("id", userId).single();

  const isAdmin = profile?.role === "admin";
  const isCreator = course.creator_id === userId;

  if (!isAdmin && !isCreator) {
    throw new Error("Forbidden: You do not have permission to edit this course.");
  }

  // Enforce publish rule: Only check lessons if the status is being CHANGED to 'published'
  const isTransitioningToPublished =
    String(updates?.status || "").toLowerCase() === "published" &&
    String(course.status || "").toLowerCase() !== "published";

  if (isTransitioningToPublished) {
    const { data: modules } = await adminDb.from("modules").select("id").eq("course_id", id);
    const moduleIds = (modules || []).map((m: any) => m.id);

    const { data: directLessons } = await adminDb.from("lessons").select("id").eq("course_id", id);
    const { data: moduleLessons } =
      moduleIds.length > 0
        ? await adminDb.from("lessons").select("id").in("module_id", moduleIds)
        : { data: [] as any[] };

    const uniqueLessonIds = new Set<string>([
      ...(directLessons || []).map((l: any) => l.id),
      ...(moduleLessons || []).map((l: any) => l.id),
    ]);
    if (uniqueLessonIds.size === 0) {
      throw new Error("Cannot publish course without at least one lesson.");
    }
  }

  return updateCourseInternal(id, updates);
});

export async function deleteCourseInternal(id: string) {
  const adminDb = getAdminDb();

  await adminDb
    .from("enrollments" as any)
    .delete()
    .eq("course_id", id);
  await adminDb
    .from("payments" as any)
    .delete()
    .eq("course_id", id);
  await adminDb
    .from("lesson_progress" as any)
    .delete()
    .eq("course_id", id);
  await adminDb
    .from("bundle_courses" as any)
    .delete()
    .eq("course_id", id);
  await adminDb
    .from("organization_member_courses" as any)
    .delete()
    .eq("course_id", id);
  await adminDb
    .from("organization_packages" as any)
    .delete()
    .eq("course_id", id);
  await adminDb
    .from("reviews" as any)
    .delete()
    .eq("course_id", id);
  await adminDb
    .from("reports" as any)
    .delete()
    .eq("course_id", id);

  const { data: modules } = await adminDb.from("modules").select("id").eq("course_id", id);
  if (modules && modules.length > 0) {
    const moduleIds = modules.map((m) => m.id);
    const { data: lessons } = await adminDb.from("lessons").select("id").in("module_id", moduleIds);
    if (lessons && lessons.length > 0) {
      await adminDb
        .from("quizzes")
        .delete()
        .in(
          "lesson_id",
          lessons.map((l) => l.id),
        );
      await adminDb
        .from("lessons")
        .delete()
        .in(
          "id",
          lessons.map((l) => l.id),
        );
    }
    await adminDb.from("modules").delete().eq("course_id", id);
  }

  const { error } = await adminDb.from("courses").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * SERVER FUNCTION: Delete a course.
 */
export const deleteCourse = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { id, token, userId: clientUserId } = ctx?.data ?? ctx;
  if (!id) throw new Error("Missing course id.");

  let userId = clientUserId;
  if (token) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (user) userId = user.id;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) userId = user.id;
  }

  if (!userId) throw new Error("Unauthorized.");

  const adminDb = getAdminDb();
  const { data: course } = await adminDb.from("courses").select("creator_id").eq("id", id).single();
  if (!course) throw new Error("Course not found.");

  const { data: profile } = await adminDb.from("profiles").select("role").eq("id", userId).single();

  if (course.creator_id !== userId && profile?.role !== "admin") {
    throw new Error("Forbidden.");
  }

  return deleteCourseInternal(id);
});
