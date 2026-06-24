import { supabase, getAdminDb } from "./supabase";
import type { Database } from "./database.types";
import { createServerFn } from "@tanstack/react-start";

export type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
export type ModuleInsert = Database["public"]["Tables"]["modules"]["Insert"];
export type ModuleUpdate = Database["public"]["Tables"]["modules"]["Update"];

export type Module = {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
};

export function mapModule(row: ModuleRow): Module {
  return {
    id: row.id,
    courseId: row.course_id || "",
    title: row.title,
    orderIndex: row.order_index,
  };
}

export async function fetchModulesByCourse(courseId: string) {
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapModule);
}

/**
 * INTERNAL: Create a module.
 */
export async function createModuleInternal(input: Omit<ModuleInsert, "id">) {
  const adminDb = getAdminDb();
  const { data, error } = await adminDb
    .from("modules")
    .insert(input as any)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create module:", error);
    throw new Error(error.message);
  }
  return mapModule(data);
}

/**
 * SERVER FUNCTION: Create a module.
 */
export const createModule = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { data, token, userId: clientUserId } = ctx.data;

  // Auth Verification
  let userId = clientUserId;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) userId = userData.user.id;
  }

  if (!userId) throw new Error("Unauthorized.");

  // Ownership Check
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

  return createModuleInternal(data);
});

/**
 * INTERNAL: Update a module.
 */
export async function updateModuleInternal(id: string, updates: ModuleUpdate) {
  const adminDb = getAdminDb();
  const { data, error } = await adminDb
    .from("modules")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update module:", error);
    throw error;
  }
  return mapModule(data);
}

/**
 * SERVER FUNCTION: Update a module.
 */
export const updateModule = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { id, updates, token, userId: clientUserId } = ctx.data;

  let userId = clientUserId;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) userId = userData.user.id;
  }

  if (!userId) throw new Error("Unauthorized.");

  const adminDb = getAdminDb();
  const { data: module } = await adminDb.from("modules").select("course_id").eq("id", id).single();
  if (!module || !module.course_id) throw new Error("Module not found or invalid.");

  const { data: course } = await adminDb
    .from("courses")
    .select("creator_id")
    .eq("id", module.course_id)
    .single();

  const { data: profile } = await adminDb.from("profiles").select("role").eq("id", userId).single();

  if (course?.creator_id !== userId && profile?.role !== "admin") {
    throw new Error("Forbidden.");
  }

  return updateModuleInternal(id, updates);
});

/**
 * INTERNAL: Delete a module.
 */
export async function deleteModuleInternal(id: string) {
  const adminDb = getAdminDb();
  const { error } = await adminDb.from("modules").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete module:", error);
    throw error;
  }
  return true;
}

/**
 * SERVER FUNCTION: Delete a module.
 */
export const deleteModule = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { id, token, userId: clientUserId } = ctx.data;

  let userId = clientUserId;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) userId = userData.user.id;
  }

  if (!userId) throw new Error("Unauthorized.");

  const adminDb = getAdminDb();
  const { data: module } = await adminDb.from("modules").select("course_id").eq("id", id).single();
  if (!module || !module.course_id) throw new Error("Module not found or invalid.");

  const { data: course } = await adminDb
    .from("courses")
    .select("creator_id")
    .eq("id", module.course_id)
    .single();

  const { data: profile } = await adminDb.from("profiles").select("role").eq("id", userId).single();

  if (course?.creator_id !== userId && profile?.role !== "admin") {
    throw new Error("Forbidden.");
  }

  return deleteModuleInternal(id);
});

/**
 * INTERNAL: Reorder modules.
 */
export async function reorderModulesInternal(modules: { id: string; order_index: number }[]) {
  const adminDb = getAdminDb();
  const { error } = await adminDb.from("modules").upsert(modules as any);
  if (error) {
    console.error("Failed to reorder modules:", error);
    throw error;
  }
  return true;
}

/**
 * SERVER FUNCTION: Reorder modules.
 */
export const reorderModules = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { modules, token, userId: clientUserId } = ctx.data;

  let userId = clientUserId;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) userId = userData.user.id;
  }

  if (!userId) throw new Error("Unauthorized.");

  if (modules.length > 0) {
    const adminDb = getAdminDb();
    const { data: module } = await adminDb
      .from("modules")
      .select("course_id")
      .eq("id", modules[0].id)
      .single();
    if (module && module.course_id) {
      const { data: course } = await adminDb
        .from("courses")
        .select("creator_id")
        .eq("id", module.course_id)
        .single();
      const { data: profile } = await adminDb
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (course?.creator_id !== userId && profile?.role !== "admin") throw new Error("Forbidden.");
    }
  }

  return reorderModulesInternal(modules);
});
