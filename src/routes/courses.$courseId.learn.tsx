import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchLessonsByCourse } from "@/lib/lessons";
import { useAuth, getCurrentSession } from "@/lib/auth";
import { checkEnrollment } from "@/lib/enrollments";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";

const learnSearchSchema = z.object({
  lessonId: z.string().optional(),
  success: z.union([z.string(), z.boolean()]).optional(),
});

export const Route = createFileRoute("/courses/$courseId/learn")({
  beforeLoad: async ({ location }) => {
    const session = await getCurrentSession();
    if (!session)
      throw redirect({
        to: "/login",
        search: { mode: "login", redirect: location.href },
      });
  },
  validateSearch: (search) => learnSearchSchema.parse(search),
  component: LearnRedirect,
  head: () => ({ meta: [{ title: "Accessing Lessons — LearnLab" }] }),
});

/**
 * Redirect route that bridges from a generic /learn link to a specific /lessons/$id path.
 * Wait for Stripe fulfillment webhook when success parameter is present.
 */
function LearnRedirect() {
  const { courseId } = Route.useParams();
  const search = Route.useSearch() as any;
  const searchLessonId = search.lessonId;
  const isSuccessRedirect = search.success === "true" || search.success === true;

  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { lang } = useI18n();

  const [isVerifying, setIsVerifying] = useState(isSuccessRedirect);
  const [errorText, setErrorText] = useState<string | null>(null);

  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: () => fetchLessonsByCourse(courseId),
  });

  useEffect(() => {
    if (loading || !user) return;

    let active = true;
    let pollInterval: any = null;
    let timeoutId: any = null;

    const run = async () => {
      if (isSuccessRedirect) {
        // Start polling checkEnrollment
        const check = async () => {
          try {
            const enrolled = await checkEnrollment(user.id, courseId);
            if (enrolled && active) {
              setIsVerifying(false);
              clearInterval(pollInterval);
              clearTimeout(timeoutId);
            }
          } catch (err) {
            console.error("Error checking enrollment:", err);
          }
        };

        // Check immediately
        await check();

        if (active && isVerifying) {
          pollInterval = setInterval(check, 2000);

          // Limit total polling to 30 seconds to prevent infinite spinning
          timeoutId = setTimeout(() => {
            if (active && isVerifying) {
              clearInterval(pollInterval);
              setErrorText(
                lang === "th"
                  ? "การจัดส่งสิทธิ์การเรียนใช้เวลานานกว่าปกติ โปรดตรวจสอบหน้าแดชบอร์ดของคุณ หรือติดต่อฝ่ายช่วยเหลือหากไม่สามารถเข้าเรียนได้ในเร็วๆ นี้"
                  : "Fulfillment is taking longer than expected. Please check your dashboard or contact support if your access isn't active soon.",
              );
              setIsVerifying(false);
            }
          }, 30000);
        }
      } else {
        setIsVerifying(false);
      }
    };

    run();

    return () => {
      active = false;
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, loading, courseId, isSuccessRedirect, isVerifying, lang]);

  useEffect(() => {
    if (isLoadingLessons || loading || !user || isVerifying) return;

    if (errorText) return;

    if (lessons.length > 0) {
      const targetId = searchLessonId || lessons[0].id;
      void navigate({
        to: "/courses/$courseId/lessons/$lessonId",
        params: { courseId, lessonId: targetId },
        replace: true,
      });
    } else {
      void navigate({ to: "/courses/$courseId", params: { courseId }, replace: true });
    }
  }, [
    lessons,
    isLoadingLessons,
    loading,
    user,
    courseId,
    navigate,
    searchLessonId,
    isVerifying,
    errorText,
  ]);

  // Premium, animated checking loading screen
  if (isVerifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 font-sans text-slate-100 relative overflow-hidden">
        {/* Glowing background gradient elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />

        <div className="flex flex-col items-center gap-6 z-10 max-w-md text-center px-6">
          <div className="relative flex items-center justify-center">
            {/* Double spinner rings */}
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
            <div className="absolute h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/20 border-b-emerald-500 animate-reverse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white animate-pulse">
              {lang === "th" ? "กำลังยืนยันการลงทะเบียนเรียน" : "Confirming Enrollment"}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {lang === "th"
                ? "เรากำลังเสร็จสิ้นการทำรายการผ่าน Stripe บทเรียนของคุณจะโหลดโดยอัตโนมัติในอีกสักครู่..."
                : "We are finalizing your transaction with Stripe. Your lessons will load automatically in just a moment..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 font-sans text-slate-100 px-6">
        <div className="flex flex-col items-center gap-6 max-w-md text-center border border-red-500/20 bg-red-500/[0.02] p-8 rounded-3xl backdrop-blur-md">
          <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              {lang === "th" ? "หมดเวลาการตรวจสอบสิทธิ์" : "Verification Timeout"}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">{errorText}</p>
          </div>
          <Link
            to="/courses/$courseId"
            params={{ courseId }}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 px-6 text-sm font-bold text-white transition-colors"
          >
            {lang === "th" ? "กลับไปที่หน้าหลักสูตร" : "Return to Course Page"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 font-sans text-slate-400">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm tracking-wide font-medium">
          {lang === "th" ? "กำลังโหลดบทเรียน..." : "LOADING LESSON..."}
        </p>
      </div>
    </div>
  );
}
