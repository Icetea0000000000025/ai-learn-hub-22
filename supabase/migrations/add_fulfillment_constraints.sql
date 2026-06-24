-- Cleanup duplicates and add missing unique constraints for reliable fulfillment

-- 1. Enrollments (User + Course)
DELETE FROM public.enrollments a
USING public.enrollments b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.course_id = b.course_id;

ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_course_unique;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id);

-- 2. Organization Packages (Org + Course)
DELETE FROM public.organization_packages a
USING public.organization_packages b
WHERE a.id < b.id
  AND a.organization_id = b.organization_id
  AND a.course_id = b.course_id;

ALTER TABLE public.organization_packages DROP CONSTRAINT IF EXISTS organization_packages_org_course_unique;
ALTER TABLE public.organization_packages ADD CONSTRAINT organization_packages_org_course_unique UNIQUE (organization_id, course_id);

-- 3. Organization Member Courses (Member + Course)
DELETE FROM public.organization_member_courses a
USING public.organization_member_courses b
WHERE a.id < b.id
  AND a.member_id = b.member_id
  AND a.course_id = b.course_id;

ALTER TABLE public.organization_member_courses DROP CONSTRAINT IF EXISTS organization_member_courses_member_course_unique;
ALTER TABLE public.organization_member_courses ADD CONSTRAINT organization_member_courses_member_course_unique UNIQUE (member_id, course_id);
