import { supabase, getAdminDb } from "./supabase";
import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "./server-auth";
import Stripe from "stripe";

export async function fetchUserOrganizations(userId: string) {
  try {
    // 1. Get organizations where user is the owner
    const { data: ownedData, error: ownedError } = await supabase
      .from("organizations")
      .select("*")
      .eq("owner_id", userId);

    if (ownedError && ownedError.code !== "42P01") throw ownedError;

    // 2. Get organizations where user is a member
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("*, organizations(*)")
      .eq("user_id", userId);

    if (memberError && memberError.code !== "42P01") throw memberError;

    const ownedOrgs = (ownedData || []).map((org) => ({
      id: `owner-${org.id}`,
      organization_id: org.id,
      user_id: userId,
      role: "admin",
      organizations: org,
      joined_at: org.created_at,
    }));

    const memberOrgs = (memberData || []).map((m) => ({
      ...m,
      organizations: m.organizations,
    }));

    // Merge: Start with owned organizations
    const merged = [...ownedOrgs];
    memberOrgs.forEach((m) => {
      if (!merged.find((existing) => existing.organization_id === m.organization_id)) {
        merged.push(m as any);
      }
    });

    // Final Sort:
    // 1. Owned orgs first
    // 2. Then alphabetical by name
    return merged.sort((a: any, b: any) => {
      const isOwnerA = a.id.startsWith("owner-") ? 1 : 0;
      const isOwnerB = b.id.startsWith("owner-") ? 1 : 0;
      if (isOwnerA !== isOwnerB) return isOwnerB - isOwnerA;

      const nameA = a.organizations?.name || "";
      const nameB = b.organizations?.name || "";
      return nameA.localeCompare(nameB);
    });
  } catch (err) {
    console.error("Failed to fetch user organizations:", err);
    return [];
  }
}

export async function checkCourseLicense(orgId: string, courseId: string) {
  const { data, error } = await supabase
    .from("organization_packages")
    .select("max_seats, used_seats")
    .eq("organization_id", orgId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) return false;
  if (!data) return false;

  return (data.used_seats || 0) < (data.max_seats || 0);
}

export const claimOrganizationSeat = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const auth = await requireUser();
    const payload = ctx?.data ?? ctx;
    const { orgId, courseId } = payload;
    const userId = auth.userId;
    const adminDb = getAdminDb();

    // 1. Check if seat available
    const { data: pkg, error: pkgError } = await adminDb
      .from("organization_packages")
      .select("id, max_seats, used_seats")
      .eq("organization_id", orgId)
      .eq("course_id", courseId)
      .single();

    if (pkgError || !pkg) throw new Error("No license package found for this course.");
    if ((pkg.used_seats || 0) >= (pkg.max_seats || 0))
      throw new Error("No seats remaining in this license.");

    // 2. Add member course assignment
    const { data: member } = await adminDb
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .single();

    if (!member) throw new Error("User is not a member of this organization.");

    await (adminDb as any).from("organization_member_courses").insert({
      member_id: member.id,
      course_id: courseId,
    });

    // 3. Increment used_seats
    await (adminDb.from("organization_packages") as any)
      .update({ used_seats: (pkg.used_seats || 0) + 1 })
      .eq("id", pkg.id);

    // 4. Enroll user
    await adminDb.from("enrollments").upsert(
      {
        user_id: userId,
        course_id: courseId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_id" } as any,
    );

    return true;
  },
);

export const removeCourseFromMember = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    await requireUser();
    const { memberId, courseId } = ctx.data;
    const adminDb = getAdminDb();

    // 1. Delete assignment
    await (adminDb as any)
      .from("organization_member_courses")
      .delete()
      .eq("member_id", memberId)
      .eq("course_id", courseId);

    // 2. Find membership to get user_id & org_id
    const { data: member } = await adminDb
      .from("organization_members")
      .select("organization_id, user_id")
      .eq("id", memberId)
      .single();

    if (member) {
      // 3. Delete enrollment
      await adminDb
        .from("enrollments")
        .delete()
        .eq("user_id", (member as any).user_id)
        .eq("course_id", courseId);

      // 4. Update package utilization
      const { data: pkg } = await adminDb
        .from("organization_packages")
        .select("id, used_seats")
        .eq("organization_id", (member as any).organization_id)
        .eq("course_id", courseId)
        .single();

      if (pkg) {
        await (adminDb.from("organization_packages") as any)
          .update({ used_seats: Math.max(0, ((pkg as any).used_seats || 1) - 1) })
          .eq("id", (pkg as any).id);
      }
    }

    return true;
  },
);

export const assignCourseToMember = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const auth = await requireUser();
  const { memberId, courseId } = ctx.data;
  const assignedBy = auth.userId;
  const adminDb = getAdminDb();

  // 1. Add assignment
  await (adminDb as any).from("organization_member_courses").insert({
    member_id: memberId,
    course_id: courseId,
    assigned_by: assignedBy,
  });

  // 2. Find membership to get user_id & org_id
  const { data: member } = await adminDb
    .from("organization_members")
    .select("organization_id, user_id")
    .eq("id", memberId)
    .single();

  if (member) {
    // 1. Auto-enroll the user
    await adminDb.from("enrollments").upsert(
      {
        user_id: (member as any).user_id,
        course_id: courseId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_id" } as any,
    );

    // 2. Update package utilization
    const { data: pkg } = await adminDb
      .from("organization_packages")
      .select("id, used_seats")
      .eq("organization_id", (member as any).organization_id)
      .eq("course_id", courseId)
      .single();

    if (pkg) {
      await (adminDb.from("organization_packages") as any)
        .update({ used_seats: ((pkg as any).used_seats || 0) + 1 })
        .eq("id", (pkg as any).id);
    }
  }

  return true;
});

export const inviteMemberToOrg = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const auth = await requireUser();
  const { email, orgId } = ctx.data;
  const invitedBy = auth.userId;
  void invitedBy;
  const adminDb = getAdminDb();

  // 1. Find user by email
  const { data: userProfile, error: userError } = await adminDb
    .from("profiles")
    .select("id, name")
    .eq("email", email)
    .single();

  if (userError || !userProfile) {
    throw new Error("User with this email not found in the system.");
  }

  // 2. CHECK RULE: Is this user already in ANY organization?
  const { data: existingMembership } = await adminDb
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", userProfile.id)
    .maybeSingle();

  if (existingMembership) {
    const orgName = (existingMembership as any).organizations?.name || "another organization";
    throw new Error(
      `This user is already a member of "${orgName}". They must be removed from their current organization before joining a new one.`,
    );
  }

  // 3. CHECK RULE: Is this user an OWNER of ANY organization?
  const { data: existingOwnedOrg } = await adminDb
    .from("organizations")
    .select("id, name")
    .eq("owner_id", userProfile.id)
    .maybeSingle();

  if (existingOwnedOrg && (existingOwnedOrg as any).id !== orgId) {
    throw new Error(
      `This user is an owner of organization "${existingOwnedOrg.name}". Owners cannot be added as members to other organizations.`,
    );
  }

  // 4. Perform assignment
  const { error: joinError } = await adminDb.from("organization_members").insert({
    organization_id: orgId,
    user_id: userProfile.id,
    role: "employee",
  });

  if (joinError) throw joinError;

  return { success: true, name: userProfile.name };
});

export const provisionFreeCourseToOrg = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const auth = await requireUser();
    const { orgId, courseId } = ctx.data;
    const userId = auth.userId;
    const adminDb = getAdminDb();

    // 1. Verify Organization Ownership
    const { data: org } = await adminDb
      .from("organizations")
      .select("owner_id")
      .eq("id", orgId)
      .single();

    if (!org || (org as any).owner_id !== userId) {
      throw new Error("Unauthorized: Only organization owners can provision courses.");
    }

    // 2. Verify Course Ownership
    const { data: course } = await adminDb
      .from("courses")
      .select("creator_id")
      .eq("id", courseId)
      .single();

    if (!course || (course as any).creator_id !== userId) {
      throw new Error("Unauthorized: You can only provision your own courses for free.");
    }

    // 3. Create or Update Package with High Seat Count
    const { data: existingPkg } = await adminDb
      .from("organization_packages")
      .select("id")
      .eq("organization_id", orgId)
      .eq("course_id", courseId)
      .maybeSingle();

    const UNLIMITED_SEATS = 1000;

    if (existingPkg) {
      const { error: updateError } = await adminDb
        .from("organization_packages")
        .update({ max_seats: UNLIMITED_SEATS })
        .eq("id", (existingPkg as any).id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await adminDb.from("organization_packages").insert({
        organization_id: orgId,
        course_id: courseId,
        max_seats: UNLIMITED_SEATS,
        used_seats: 0,
      });
      if (insertError) throw insertError;
    }

    return { success: true };
  },
);

export const deleteOrganization = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const auth = await requireUser();
  const payload = ctx?.data ?? ctx;
  const orgId = typeof payload === "string" ? payload : payload?.orgId;
  const adminDb = getAdminDb();

  // Only the owner may delete the organization
  const { data: org } = await adminDb
    .from("organizations")
    .select("owner_id")
    .eq("id", orgId)
    .single();
  if (!org || (org as any).owner_id !== auth.userId) {
    throw new Error("Forbidden");
  }
  const orgId = typeof payload === "string" ? payload : payload?.orgId;
  const adminDb = getAdminDb();

  // 1. Get member IDs
  const { data: memberRows } = await adminDb
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId);

  const memberIds = (memberRows || []).map((m) => m.id);

  if (memberIds.length > 0) {
    // 2. Delete member course assignments
    await (adminDb as any).from("organization_member_courses").delete().in("member_id", memberIds);
  }

  // 3. Delete members
  await adminDb.from("organization_members").delete().eq("organization_id", orgId);

  // 4. Delete packages
  await adminDb.from("organization_packages").delete().eq("organization_id", orgId);

  // 5. Nullify organization reference in payments
  await (adminDb.from("payments") as any)
    .update({ organization_id: null })
    .eq("organization_id", orgId);

  // 6. Finally delete org itself
  const { error } = await adminDb.from("organizations").delete().eq("id", orgId);
  if (error) throw error;

  return { success: true };
});

export const repairMissingPackages = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { orgId, userId } = ctx.data;
    const adminDb = getAdminDb();

    // 1. Get all completed payments for this user/org that are NOT fulfilled
    const { data: payments } = await (adminDb.from("payments") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .eq("is_fulfilled", false);

    if (!payments || payments.length === 0) return { count: 0 };

    let count = 0;
    for (const p of payments) {
      // Logic for org packages
      if (p.organization_id && p.course_id && p.seat_count) {
        const { data: existingPkg } = await adminDb
          .from("organization_packages")
          .select("id, max_seats")
          .eq("organization_id", p.organization_id)
          .eq("course_id", p.course_id)
          .maybeSingle();

        if (existingPkg) {
          await (adminDb.from("organization_packages") as any)
            .update({ max_seats: (existingPkg as any).max_seats + p.seat_count })
            .eq("id", (existingPkg as any).id);
        } else {
          await adminDb.from("organization_packages").insert({
            organization_id: p.organization_id,
            course_id: p.course_id,
            max_seats: p.seat_count,
            used_seats: 0,
          });
        }
        await (adminDb.from("payments") as any).update({ is_fulfilled: true }).eq("id", p.id);
        count++;
      }
    }

    return { count };
  },
);
