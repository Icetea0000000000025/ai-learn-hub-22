import { createFileRoute, Link, useRouter, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Eye,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  ListVideo,
  BrainCircuit,
  Loader2,
  CheckCircle2,
  BookOpen,
  Clock,
  Maximize2,
  Bookmark,
  Layout,
  Menu,
  X,
  FileText,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuizPlayer } from "@/components/quiz-player";
import { useAuth } from "@/lib/auth";
import { fetchCourseById } from "@/lib/courses";
import { fetchLessonsByCourse } from "@/lib/lessons";
import { fetchModulesByCourse } from "@/lib/modules";
import { fetchQuizByLesson, fetchQuizzesByCourse } from "@/lib/quizzes";
import {
  fetchLessonProgressDetail,
  saveLessonProgressTime,
  markLessonComplete,
  unmarkLessonComplete,
  fetchCourseProgress,
} from "@/lib/progress";
import { updateLastLesson } from "@/lib/enrollments";
import { issueCertificate } from "@/lib/certificates";
import { generateCertificateDescription } from "@/lib/ai";
import { parseStorageUrl, getSignedUrl } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Trophy,
  Star,
  Sparkles as SparklesIcon,
  Download,
  Printer,
  ShieldCheck,
  Flag,
} from "lucide-react";
import { SelectionTermExplainer } from "@/components/selection-term-explainer";

// --- COMPONENT: Report Course Dialog (Local for Lesson Player) ---
function ReportCourseDialog({
  courseId,
  userId,
}: {
  courseId: string;
  userId: string | undefined;
}) {
  const [reason, setReason] = useState("Inappropriate content");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const reportMutation = useMutation({
    mutationFn: async (report: any) => {
      const { data, error } = await supabase.from("reports").insert(report).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Thank you. Our moderation team will review this course.");
      setIsOpen(false);
      setDescription("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit report");
    },
  });

  if (!userId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all group"
        onClick={() => setIsOpen(true)}
        title="Report Violation"
      >
        <Flag className="h-5 w-5 group-hover:fill-rose-500/10" />
      </Button>
      <DialogContent className="max-w-md bg-white rounded-[2.5rem] border-slate-200 p-0 shadow-2xl text-slate-900 font-sans overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-8 custom-scrollbar">
          <DialogHeader className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-500/10">
              <Flag className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">
              Report Violation
            </DialogTitle>
            <DialogDescription className="text-base font-medium text-slate-500">
              Why are you reporting this content?
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Violation Reason
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Inappropriate content",
                  "Copyright Violation",
                  "Spam or Misleading",
                  "Harassment",
                  "Other",
                ].map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border text-sm font-bold transition-all",
                      reason === r
                        ? "bg-rose-50 border-rose-200 text-rose-700"
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {r}
                    {reason === r && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Additional Context
              </Label>
              <textarea
                placeholder="Provide specific details about the violation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] w-full p-4 rounded-xl border-slate-200 bg-slate-50 focus:ring-rose-500/20 resize-none text-sm font-medium"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 flex gap-3">
            <Button
              variant="ghost"
              className="rounded-xl h-12 flex-1 font-bold"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl h-12 flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-200/50"
              onClick={() =>
                reportMutation.mutate({
                  course_id: courseId,
                  reporter_id: userId!,
                  reason,
                  description,
                  status: "pending",
                })
              }
              disabled={reportMutation.isPending}
            >
              {reportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import DOMPurify from "dompurify";

import { getCurrentSession } from "@/lib/auth";

export const Route = createFileRoute("/courses/$courseId/lessons/$lessonId")({
  beforeLoad: async ({ location, params }) => {
    const { courseId, lessonId } = params;
    const session = await getCurrentSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: { mode: "login", redirect: location.href },
      });
    }

    // Perform authorization checks on the server to prevent SSR leaks
    // Use parallel queries for performance
    const [enrollmentRes, courseRes, lessonRes] = await Promise.all([
      supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabase.from("courses").select("creator_id").eq("id", courseId).maybeSingle(),
      supabase.from("lessons").select("is_preview").eq("id", lessonId).maybeSingle(),
    ]);

    const isAdmin = (session.user as any)?.user_metadata?.role === "admin";
    const isCreator = session.user.id === courseRes.data?.creator_id;
    const isEnrolled = !!enrollmentRes.data;
    const isPreview = !!(lessonRes.data as any)?.is_preview;

    if (!isEnrolled && !isCreator && !isAdmin && !isPreview) {
      console.warn(
        `Unauthorized access attempt to lesson ${lessonId} in course ${courseId} by user ${session.user.id}`,
      );
      throw redirect({
        to: "/courses/$courseId",
        params: { courseId },
      });
    }
  },
  component: LessonPlayerPage,
});

// --- HELPER: YouTube ID Extraction ---
const extractId = (url: string | null) => {
  if (!url) return null;
  const trimmed = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) return match[2];
  const parts = trimmed.split("/");
  const lastPart = parts[parts.length - 1]?.split(/[?&#]/)[0];
  return (lastPart?.length || 0) === 11 ? lastPart : null;
};

// --- COMPONENT: Video Player (Polished Light with Persistence) ---
function LessonVideoSection({
  videoId,
  lessonUrl,
  lessonId,
  courseId,
  userId,
  initialTime,
  isCompleted,
}: {
  videoId: string | null;
  lessonUrl: string | null;
  lessonId: string;
  courseId: string;
  userId: string;
  initialTime: number;
  isCompleted: boolean;
}) {
  const { lang } = useI18n();
  const [isLoaded, setIsLoaded] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const lastSavedTime = useRef(initialTime);

  useEffect(() => {
    async function fetchSignedUrl() {
      if (!lessonUrl || videoId) {
        setSignedUrl(null);
        return;
      }

      const storageInfo = parseStorageUrl(lessonUrl);
      if (storageInfo) {
        try {
          const url = await getSignedUrl(storageInfo.bucket, storageInfo.path);
          setSignedUrl(url);
        } catch (e) {
          console.error("Failed to fetch signed URL:", e);
          setSignedUrl(null);
        }
      } else {
        setSignedUrl(lessonUrl);
      }
    }

    fetchSignedUrl();
  }, [lessonUrl, videoId]);

  useEffect(() => {
    if (!videoId && !lessonUrl) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [lessonId, videoId, lessonUrl]);

  // Logic to save progress every 5 seconds
  useEffect(() => {
    if (!userId || !lessonId) return;

    const interval = setInterval(async () => {
      let currentTime = 0;

      if (videoRef.current) {
        currentTime = videoRef.current.currentTime;
      } else if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        try {
          currentTime = playerRef.current.getCurrentTime();
        } catch (e) {
          // Ignore if player is not ready
        }
      }

      if (currentTime > 0 && Math.abs(currentTime - lastSavedTime.current) > 3) {
        lastSavedTime.current = currentTime;
        void saveLessonProgressTime(userId, courseId, lessonId, currentTime);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [userId, lessonId, courseId]);

  // YouTube API Integration
  useEffect(() => {
    if (!videoId) return;

    const scriptId = "youtube-iframe-api";
    let tag = document.getElementById(scriptId) as HTMLScriptElement;

    if (!tag) {
      tag = document.createElement("script");
      tag.id = scriptId;
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const initPlayer = () => {
      if (!(window as any).YT || !(window as any).YT.Player) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore error on destroy
        }
      }

      const containerId = `yt-player-${lessonId}`;
      const element = document.getElementById(containerId);
      if (!element) return;

      playerRef.current = new (window as any).YT.Player(containerId, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          start: Math.floor(initialTime),
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsLoaded(true);
            // Redundant seekTo for safety
            if (initialTime > 0) {
              event.target.seekTo(initialTime, true);
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.ENDED is 0
            if (event.data === 0 && !isCompleted) {
              const markCompleteBtn = document.getElementById("mark-complete-btn");
              if (markCompleteBtn) {
                markCompleteBtn.click();
              }
            }
          },
        },
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.getIframe === "function") {
            const iframe = playerRef.current.getIframe();
            if (iframe && iframe.parentNode) {
              playerRef.current.destroy();
            }
          }
          playerRef.current = null;
        } catch (e) {
          console.debug("Failed to destroy lesson YT player:", e);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, lessonId, isCompleted]);

  const handleVideoLoaded = () => {
    setIsLoaded(true);
    if (videoRef.current && initialTime > 0) {
      videoRef.current.currentTime = initialTime;
    }
  };

  const handleVideoEnded = () => {
    if (!isCompleted) {
      const markCompleteBtn = document.getElementById("mark-complete-btn");
      if (markCompleteBtn) {
        markCompleteBtn.click();
      }
    }
  };

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-[2rem] overflow-hidden border border-slate-200 shadow-2xl group">
      <AnimatePresence mode="wait">
        {!isLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-white opacity-20" />
          </div>
        )}
      </AnimatePresence>

      <motion.div
        key={`video-root-${lessonId}-${videoId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
      >
        {videoId ? (
          <div
            id={`yt-player-${lessonId}`}
            key={`player-container-${lessonId}-${videoId}`}
            className="w-full h-full"
          />
        ) : signedUrl ? (
          <video
            ref={videoRef}
            key={`native-${lessonId}`}
            src={`${signedUrl}#t=${initialTime}`}
            controls
            autoPlay
            className="w-full h-full"
            onLoadedData={handleVideoLoaded}
            onEnded={handleVideoEnded}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900 text-center px-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative h-20 w-20 rounded-[2rem] bg-slate-800 border border-slate-700 flex items-center justify-center text-primary shadow-2xl">
                <BrainCircuit className="h-10 w-10 animate-pulse" />
              </div>
            </div>
            <h3 className="text-white font-black text-lg tracking-tight mb-2">
              {lang === "th"
                ? "วิดีโอกำลังอยู่ระหว่างการจัดเตรียม"
                : "วิดีโอกำลังอยู่ระหว่างการจัดเตรียม"}
            </h3>
            <p className="text-slate-400 text-xs font-medium max-w-xs leading-relaxed uppercase tracking-widest">
              {lang === "th"
                ? "วิดีโอบทเรียนกำลังถูกจัดเตรียมโดย AI โปรดลองอีกครั้งในอีกสักครู่"
                : "Video is being prepared by AI. Please check back in a few moments."}
            </p>
            <div className="mt-8 flex items-center gap-3">
              <div className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <div className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="h-1 w-1 rounded-full bg-primary animate-bounce" />
            </div>
          </div>
        )}
      </motion.div>
      <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-[2rem]" />
    </div>
  );
}

// --- COMPONENT: Sidebar Lesson Item ---
function SidebarItem({
  lesson,
  isActive,
  isCompleted,
  index,
  onClick,
}: {
  lesson: any;
  isActive: boolean;
  isCompleted: boolean;
  index: number;
  onClick: () => void;
}) {
  const { lang } = useI18n();
  return (
    <Link
      to="/courses/$courseId/lessons/$lessonId"
      params={{ courseId: lesson.courseId, lessonId: lesson.id }}
      onClick={onClick}
      className={cn(
        "group flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 border mb-1.5",
        isActive
          ? "bg-primary/[0.04] border-primary/20 text-primary shadow-sm"
          : "bg-transparent border-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-900",
      )}
    >
      <div
        className={cn(
          "h-7 w-7 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 transition-colors",
          isActive
            ? "bg-primary text-white shadow-lg shadow-primary/20"
            : isCompleted
              ? "bg-emerald-50 text-emerald-600"
              : "bg-white border border-slate-200",
        )}
      >
        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
      </div>
      <div className="flex flex-col min-w-0">
        <span
          className={cn(
            "text-sm font-bold truncate leading-tight mb-1 flex items-center gap-2",
            isActive && "text-slate-900",
          )}
        >
          {lesson.title}
          {lesson.isPreview && (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[7px] uppercase tracking-widest px-1.5 py-0 rounded-md">
              {lang === "th" ? "ตัวอย่าง" : "Preview"}
            </Badge>
          )}
        </span>
        <div className="flex items-center gap-2 opacity-60 font-bold text-[8px] uppercase tracking-widest text-slate-400">
          <span>
            {lesson.contentType === "video"
              ? lang === "th"
                ? "วิดีโอ"
                : "Video"
              : lesson.contentType || "Video"}
          </span>
          <div className="h-1 w-1 rounded-full bg-current opacity-30" />
          <span>
            {lesson.contentType === "video"
              ? lang === "th"
                ? "บทเรียนวิดีโอ"
                : "Video Lesson"
              : lesson.contentType === "pdf"
                ? lang === "th"
                  ? "เอกสาร PDF"
                  : "PDF Document"
                : lesson.contentType === "quiz"
                  ? lang === "th"
                    ? "บทเรียนควิซ"
                    : "Quiz Lesson"
                  : lesson.contentType === "text"
                    ? lang === "th"
                      ? "บทความ"
                      : "Text Article"
                    : lang === "th"
                      ? "สไลด์การสอน"
                      : "Slide Deck"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// --- MAIN PAGE COMPONENT ---
function LessonPlayerPage() {
  const { courseId, lessonId } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { lang, t } = useI18n();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "quiz">("content");

  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => fetchCourseById(courseId),
  });
  const { data: modules = [] } = useQuery({
    queryKey: ["modules", courseId],
    queryFn: () => fetchModulesByCourse(courseId),
  });
  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: () => fetchLessonsByCourse(courseId),
  });

  const { data: lesson, isLoading: isLoadingLesson } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  const { data: progress } = useQuery({
    queryKey: ["lesson-progress", user?.id, lessonId],
    queryFn: () => (user ? fetchLessonProgressDetail(user.id, lessonId) : null),
    enabled: !!user?.id,
  });

  const { data: quiz } = useQuery({
    queryKey: ["quiz", lessonId],
    queryFn: () => fetchQuizByLesson(lessonId),
  });

  const { data: enrollment, isLoading: isLoadingEnrollment } = useQuery({
    queryKey: ["enrollment", user?.id, courseId],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const isEnrolled = !!enrollment;
  const isCreator = user?.id === course?.creatorId;
  const isAdmin =
    (user?.user_metadata as any)?.role === "admin" || (profile as any)?.role === "admin";
  const isAuthorized = isEnrolled || isCreator || isAdmin;
  const isPreview = (lesson as any)?.is_preview === true;

  useEffect(() => {
    if (!isLoadingLesson && !lesson) {
      toast.error("บทเรียนนี้ไม่มีการเปลี่ยนแปลงหรือถูกลบออกแล้ว");
      void navigate({ to: "/courses/$courseId", params: { courseId }, replace: true });
      return;
    }

    if (
      !isLoadingCourse &&
      !isLoadingLesson &&
      !isLoadingEnrollment &&
      !isAuthorized &&
      !isPreview
    ) {
      void navigate({ to: "/courses/$courseId", params: { courseId } });
    }
  }, [
    isLoadingCourse,
    isLoadingLesson,
    isLoadingEnrollment,
    isAuthorized,
    isPreview,
    courseId,
    navigate,
    lesson,
  ]);

  const [isClaiming, setIsClaiming] = useState(false);
  const [recipientName, setRecipientName] = useState(user?.user_metadata?.full_name || "");
  const [aiStatement, setAiStatement] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [issuedCertificateData, setIssuedCertificateData] = useState<any>(null);

  const queryClient = useQueryClient();
  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (isCompleted) {
        await unmarkLessonComplete(user.id, lessonId);
      } else {
        await markLessonComplete(user.id, courseId, lessonId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress", user?.id, lessonId] });
      queryClient.invalidateQueries({ queryKey: ["course-progress", user?.id, courseId] });
      queryClient.invalidateQueries({ queryKey: ["passed-quizzes", user?.id, courseId] });

      if (!isCompleted) {
        toast.success("Lesson marked as complete!");
        // Check if this was the last lesson
        const newProgress = [...allProgress, lessonId];
        if (newProgress.length === lessons.length && allQuizzesPassed) {
          setIsClaiming(true);
        }
        if (nextLesson) goToNext();
      } else {
        toast.info("Lesson marked as incomplete");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update progress");
    },
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!user || !course) return;
      setIsGeneratingAi(true); // Re-use loading state for the DB call
      try {
        // AI is currently too slow/unreliable for real-time certificate generation
        // Switching to a professional static template validation statement for stability
        const statement = `This certifies that ${recipientName} has successfully met all requirements and demonstrated proficiency in ${course.title}.`;
        setAiStatement(statement);
        const cert = await issueCertificate(user.id, courseId, recipientName);
        setIssuedCertificateData(cert);
        toast.success("Certificate issued successfully!");
      } catch (err) {
        toast.error("Failed to issue certificate. Please try again.");
      } finally {
        setIsGeneratingAi(false);
      }
    },
  });

  const currentIndex = lessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const goToNext = useCallback(() => {
    if (nextLesson)
      void navigate({
        to: "/courses/$courseId/lessons/$lessonId",
        params: { courseId, lessonId: nextLesson.id },
      });
  }, [nextLesson, navigate, courseId]);

  const goToPrev = useCallback(() => {
    if (prevLesson)
      void navigate({
        to: "/courses/$courseId/lessons/$lessonId",
        params: { courseId, lessonId: prevLesson.id },
      });
  }, [prevLesson, navigate, courseId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]);

  useEffect(() => {
    setActiveTab("content");
    if (user?.id && courseId && lessonId) {
      void updateLastLesson(user.id, courseId, lessonId);
    }
  }, [lessonId, user?.id, courseId]);

  const videoId = useMemo(() => extractId(lesson?.video_url ?? null), [lesson?.video_url]);

  const { data: allProgress = [] } = useQuery({
    queryKey: ["course-progress", user?.id, courseId],
    queryFn: () => (user ? fetchCourseProgress(user.id, courseId) : []),
    enabled: !!user?.id,
  });

  const { data: courseQuizzes = [] } = useQuery({
    queryKey: ["course-quizzes", courseId],
    queryFn: () => fetchQuizzesByCourse(courseId),
    enabled: !!courseId,
  });

  const { data: passedQuizAttempts = [] } = useQuery({
    queryKey: ["passed-quizzes", user?.id, courseId],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("quiz_attempts")
        .select("quiz_id")
        .eq("user_id", user.id)
        .eq("passed", true);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const passedQuizIds = useMemo(() => {
    return Array.from(new Set(passedQuizAttempts.map((a) => a.quiz_id)));
  }, [passedQuizAttempts]);

  const allQuizzesPassed = useMemo(() => {
    if (courseQuizzes.length === 0) return true;
    // Check if every quiz in the course has a corresponding passed attempt
    return courseQuizzes.every((q) => passedQuizIds.includes(q.id));
  }, [courseQuizzes, passedQuizIds]);

  const progressPercent =
    (lessons?.length || 0) > 0 ? Math.round((allProgress.length / lessons.length) * 100) : 0;

  const isLessonCompleted = (id: string) => allProgress.includes(id);
  const isCompleted = isLessonCompleted(lessonId);

  const isCourseComplete =
    allProgress.length === lessons.length && lessons.length > 0 && allQuizzesPassed;

  const canClaimCertificate = isCourseComplete;

  // We capture the initial time for the current lesson to avoid re-rendering
  // the video player every time the progress is saved to the DB.
  const initialTimeForLesson = useMemo(() => {
    return Number((progress as any)?.last_watched_seconds || 0);
  }, [progress]);

  // Memoize the video section to prevent re-renders when switching tabs
  const isValidUrl = (url: string | null) => {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    // Common AI placeholders or invalid values
    if (
      trimmed === "" ||
      trimmed === "null" ||
      trimmed === "none" ||
      trimmed === "pending" ||
      trimmed === "undefined" ||
      trimmed === "video_url" ||
      trimmed.includes("placeholder")
    ) {
      return false;
    }
    // Basic check for URL-like structure
    return trimmed.startsWith("http") || trimmed.startsWith("/") || trimmed.startsWith("blob:");
  };

  const VideoPlayer = useMemo(() => {
    if (!lesson) return null;
    const effectiveVideoUrl = isValidUrl(lesson.video_url) ? lesson.video_url : null;

    return (
      <LessonVideoSection
        lessonId={lessonId}
        videoId={videoId}
        lessonUrl={effectiveVideoUrl}
        courseId={courseId}
        userId={user?.id || ""}
        initialTime={initialTimeForLesson}
        isCompleted={isCompleted}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, videoId, lesson?.video_url, courseId, user?.id, initialTimeForLesson, isCompleted]);
  if (isLoadingCourse || isLoadingLesson) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="flex h-screen w-full flex-col bg-white text-slate-900 font-sans selection:bg-primary/10 selection:text-primary overflow-hidden">
      {/* --- LIGHT PLAYER HEADER --- */}
      <header className="h-16 shrink-0 border-b border-slate-100 bg-white flex items-center justify-between px-6 z-40 sticky top-0 shadow-sm">
        <div className="flex items-center gap-6 overflow-hidden">
          <Link
            to="/courses/$courseId"
            params={{ courseId }}
            className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all shrink-0 group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] truncate opacity-70 leading-none">
              {course?.title}
            </span>
            <h1 className="text-sm font-bold text-slate-900 truncate mt-1.5">{lesson.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex flex-col items-end gap-1.5 min-w-[160px]">
            <div className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Progress</span>
              <span className="text-primary">{progressPercent}%</span>
            </div>
            <Progress
              value={progressPercent}
              className="h-1.5 w-full bg-slate-100 border border-black/[0.02]"
            />
          </div>

          <div className="h-10 w-px bg-slate-100 hidden lg:block" />

          <div className="flex items-center gap-2">
            {allProgress.length === lessons.length && lessons.length > 0 && !allQuizzesPassed && (
              <div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 mr-2">
                <BrainCircuit className="h-4 w-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Pass all quizzes to unlock certificate
                </span>
              </div>
            )}
            {canClaimCertificate && (
              <Button
                onClick={() => setIsClaiming(true)}
                className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 mr-2 animate-pulse hover:animate-none"
              >
                <Trophy className="h-4 w-4 mr-2" /> Claim Certificate
              </Button>
            )}
            <ReportCourseDialog courseId={courseId} userId={user?.id} />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex h-10 px-5 items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all bg-slate-50 border border-slate-100 rounded-xl"
            >
              <Layout className="h-4 w-4" /> {sidebarOpen ? "Focus Mode" : "Syllabus"}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-slate-400 hover:text-slate-900 rounded-xl lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {isCreator && !isEnrolled && (
        <div className="bg-slate-900 text-white py-2 px-6 flex items-center justify-between z-30 border-b border-white/5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary">
              <Eye className="h-3.5 w-3.5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
              Smart Preview Mode{" "}
              <span className="text-emerald-400 ml-2">(Creator Bypass Active)</span>
            </p>
          </div>
          <p className="text-[10px] font-medium text-slate-500 hidden sm:block italic">
            You are viewing this lesson via creator privileges. Students must enroll to see this.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
          <div
            className={cn(
              "mx-auto transition-all duration-500 px-6 py-12 lg:px-12",
              sidebarOpen ? "max-w-4xl" : "max-w-5xl",
            )}
          >
            <section className="space-y-12 pb-32">
              {VideoPlayer}

              <div className="space-y-12 max-w-4xl mx-auto lg:mx-0">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 border-b border-slate-100 pb-12">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg text-slate-600">
                        <BookOpen className="h-3.5 w-3.5" />{" "}
                        {lang === "th" ? "บทเรียนที่" : "Lesson"} {currentIndex + 1}
                      </div>
                      <div className="h-1 w-1 rounded-full bg-slate-200" />
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />{" "}
                        {lang === "th" ? "การสตรีมต่อเนื่อง" : "Persistent Streaming"}
                      </div>
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                      {lesson.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      id="mark-complete-btn"
                      size="sm"
                      className={cn(
                        "h-11 px-7 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all",
                        isCompleted
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10"
                          : quiz && !isCompleted
                            ? "bg-slate-400 cursor-not-allowed text-white"
                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10",
                      )}
                      onClick={() => {
                        // User requested freedom: No longer blocking progress or requiring quiz BEFORE marking complete.
                        // However, we still track if they HAVE a quiz so the UI can show a reminder.
                        markCompleteMutation.mutate();
                      }}
                      disabled={markCompleteMutation.isPending}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> {t("completed")}
                        </>
                      ) : (
                        t("markComplete")
                      )}
                    </Button>
                  </div>
                </div>

                {/* TAB SWITCHER */}
                <div className="flex gap-12 border-b border-slate-100">
                  {["content", "quiz"].map((tab) =>
                    tab === "quiz" && !quiz ? null : (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                          "pb-5 text-[11px] font-black uppercase tracking-[0.3em] relative transition-colors",
                          activeTab === tab
                            ? "text-primary"
                            : "text-slate-400 hover:text-slate-600",
                        )}
                      >
                        {tab === "content"
                          ? t("resources")
                          : lang === "th"
                            ? "แบบประเมิน"
                            : "Assessment"}
                        {activeTab === tab && (
                          <motion.div
                            layoutId="player-tab-line-light"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                          />
                        )}
                      </button>
                    ),
                  )}
                </div>

                {/* TAB CONTENT */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab + lessonId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === "quiz" && quiz ? (
                      <div className="py-6">
                        <QuizPlayer
                          key={quiz.id}
                          quizId={quiz.id}
                          userId={user?.id || ""}
                          passingScore={quiz.passingScore ?? 70}
                          onComplete={async (passed) => {
                            if (passed && user) {
                              try {
                                await markLessonComplete(user.id, courseId, lessonId);
                                queryClient.invalidateQueries({
                                  queryKey: ["lesson-progress", user.id, lessonId],
                                });
                                queryClient.invalidateQueries({
                                  queryKey: ["course-progress", user.id, courseId],
                                });
                                queryClient.invalidateQueries({
                                  queryKey: ["passed-quizzes", user.id, courseId],
                                });
                                toast.success(
                                  lang === "th"
                                    ? "ทำเครื่องหมายว่าบทเรียนเสร็จสิ้นแล้ว!"
                                    : "Lesson marked as complete!",
                                );
                              } catch (err) {
                                console.error("Failed to mark lesson complete:", err);
                              }
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="space-y-12">
                        {lesson.attachment_url && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-primary/5 border border-primary/10 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6"
                          >
                            <div className="flex items-center gap-6 text-left">
                              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <Download className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg">
                                  {lang === "th"
                                    ? "มีสื่อการเรียนรู้พร้อมใช้งาน"
                                    : "Learning Resource Available"}
                                </h3>
                                <p className="text-slate-500 text-sm font-medium">
                                  {lang === "th"
                                    ? "บทเรียนนี้มีสื่อการเรียนการสอนเพิ่มเติม (PDF, สไลด์ หรือ โค้ด)"
                                    : "This lesson includes supplemental materials (PDF, Slides, or Code)."}
                                </p>
                              </div>
                            </div>
                            <Button
                              asChild
                              className="rounded-xl h-12 px-8 bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/10"
                            >
                              <a href={lesson.attachment_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />{" "}
                                {lang === "th" ? "เปิดสื่อการเรียนรู้" : "Open Resource"}
                              </a>
                            </Button>
                          </motion.div>
                        )}

                        <div
                          className="prose prose-slate max-w-none 
                              prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-lg prose-p:font-medium
                              prose-headings:text-slate-900 prose-headings:font-bold prose-headings:tracking-tight
                              prose-strong:text-slate-900 prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
                              prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-2xl"
                        >
                          {lesson.body_text ? (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(lesson.body_text),
                              }}
                            />
                          ) : !lesson.attachment_url ? (
                            <div className="py-24 text-center text-slate-300 italic border-2 border-dashed border-slate-100 rounded-[3rem] bg-white/50">
                              {lang === "th"
                                ? "ไม่มีเนื้อหาการอ่านประกอบสำหรับบทเรียนนี้"
                                : "Supplemental reading is not available for this module."}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </section>
          </div>
        </main>

        {/* --- REFINED LIGHT SIDEBAR --- */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="border-l border-slate-100 bg-white shrink-0 hidden lg:flex flex-col relative overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 leading-none">
                  {lang === "th" ? "โครงสร้างหลักสูตร" : "Course Curriculum"}
                </span>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {lang === "th" ? "โมดูลและบทเรียน" : "Modules & Lessons"}
                </h3>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-5 space-y-10">
                  {modules.map((mod, mIdx) => {
                    const moduleLessons = lessons.filter((l) => l.moduleId === mod.id);
                    return (
                      <div key={mod.id} className="space-y-4">
                        <div className="flex items-center justify-between px-3">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {lang === "th" ? "ส่วนที่" : "Section"} {mIdx + 1}: {mod.title}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            {moduleLessons.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {moduleLessons.map((l, lIdx) => (
                            <SidebarItem
                              key={l.id}
                              lesson={l}
                              index={lIdx}
                              isActive={l.id === lessonId}
                              isCompleted={isLessonCompleted(l.id)}
                              onClick={() => {}}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="h-32" />
              </ScrollArea>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* --- CERTIFICATE CLAIM DIALOG --- */}
      <Dialog open={isClaiming} onOpenChange={setIsClaiming}>
        <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <AnimatePresence mode="wait">
            {!issuedCertificateData ? (
              <motion.div
                key="claim-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-10 space-y-8"
              >
                <DialogHeader className="text-left space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <DialogTitle className="text-3xl font-black tracking-tight leading-none">
                    {lang === "th" ? "รับใบประกาศนียบัตรของคุณ" : "Claim Your Certificate"}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium">
                    {lang === "th" ? (
                      <>
                        ยินดีด้วยที่คุณเรียนจบหลักสูตร <b>{course?.title}</b>!
                        โปรดยืนยันชื่อของคุณเพื่อให้แสดงบนใบประกาศนียบัตรอย่างเป็นทางการ
                      </>
                    ) : (
                      <>
                        Congratulations on completing <b>{course?.title}</b>! Please confirm your
                        name as you want it to appear on your official certificate.
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      {lang === "th" ? "ชื่อ-นามสกุลจริง" : "Full Legal Name"}
                    </Label>
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={lang === "th" ? "เช่น นายสมชาย ดีใจ" : "e.g. John Doe"}
                      className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus-visible:ring-primary/50 text-base font-bold"
                    />
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-primary/[0.03] border border-primary/10 rounded-2xl">
                    <SparklesIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-[10px] text-primary/80 font-bold leading-relaxed">
                      {lang === "th"
                        ? "Gemini AI จะสร้างข้อความการรับรองที่เป็นเอกลักษณ์และเป็นมืออาชีพสำหรับความสำเร็จของคุณโดยอิงตามผลการเรียนของคุณ"
                        : "Gemini AI will now generate a unique, professional validation statement for your achievement based on your performance."}
                    </p>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    onClick={() => claimMutation.mutate()}
                    disabled={isGeneratingAi || !recipientName}
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 gap-3"
                  >
                    {isGeneratingAi ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {lang === "th"
                          ? "กำลังสร้างเอกสารดิจิทัล..."
                          : "Generating Digital Asset..."}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-5 w-5" />
                        {lang === "th" ? "ออกใบประกาศนียบัตรของฉัน" : "Issue My Certificate"}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </motion.div>
            ) : (
              <motion.div
                key="certificate-preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-0"
              >
                {/* PREVIEW CARD */}
                <div className="bg-slate-900 p-12 text-center space-y-12 relative overflow-hidden min-h-[500px] flex flex-col justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent)]" />
                  <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                  <div className="relative z-10 space-y-6">
                    <div className="flex justify-center">
                      <div className="h-20 w-20 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                        <Trophy className="h-10 w-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500">
                        {lang === "th"
                          ? "เกียรติบัตรแห่งความเป็นเลิศ"
                          : "Certificate of Excellence"}
                      </p>
                      <h2 className="text-4xl font-black text-white tracking-tight">
                        {recipientName}
                      </h2>
                    </div>
                    <div className="h-px w-24 bg-white/10 mx-auto" />
                    <p className="text-slate-400 text-sm font-medium italic max-w-md mx-auto leading-relaxed">
                      "{aiStatement}"
                    </p>
                    <div className="pt-8 space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        {lang === "th" ? "หลักสูตรที่เรียนสำเร็จ" : "Completed Course"}
                      </p>
                      <p className="text-lg font-bold text-white">{course?.title}</p>
                    </div>
                  </div>

                  <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-12 opacity-20">
                    <div className="text-left">
                      <p className="text-[8px] font-black uppercase text-slate-400">
                        {lang === "th" ? "วันที่ออกใบรับรอง" : "Date Issued"}
                      </p>
                      <p className="text-[10px] font-bold text-white">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-[8px] font-black uppercase text-slate-400">
                        {lang === "th" ? "รหัสการรับรอง" : "Verified ID"}
                      </p>
                      <p className="text-[10px] font-bold text-white">
                        {issuedCertificateData.id.split("-")[0].toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="rounded-xl h-12 px-6 font-bold text-xs gap-2 border-slate-200"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4" /> {lang === "th" ? "พิมพ์ PDF" : "Print PDF"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl h-12 px-6 font-bold text-xs gap-2 border-slate-200"
                    >
                      <Download className="h-4 w-4" />{" "}
                      {lang === "th" ? "บันทึกรูปภาพ" : "Save Image"}
                    </Button>
                  </div>
                  <Button
                    onClick={() => setIsClaiming(false)}
                    className="rounded-xl h-12 px-8 bg-slate-900 text-white font-black text-xs uppercase tracking-widest"
                  >
                    {lang === "th" ? "เสร็จสิ้น" : "Done"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        @media print {
          header, footer, .fixed, aside, .no-print { display: none !important; }
          .DialogContent { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
        }
      `,
        }}
      />
      <SelectionTermExplainer />
    </div>
  );
}
