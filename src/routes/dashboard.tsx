import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteCourse, fetchCoursesByCreator, type Course } from "@/lib/courses";
import { fetchUserEnrollments, type EnrollmentWithCourse } from "@/lib/enrollments";
import { fetchCreatorRevenue } from "@/lib/payments";
import { getCurrentSession, useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { fetchUserCertificates } from "@/lib/certificates";
import { getPersonalizedLearningPath } from "@/lib/ai";
import {
  HistoryIcon,
  MessageSquare,
  Send,
  Sparkles,
  User,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Plus,
  BookOpen,
  Trophy,
  ExternalLink,
  Share2,
  Calendar,
  Users2,
  Users,
  Building2,
  Activity,
  ChevronRight,
  Loader2,
  BrainCircuit,
  MousePointer2,
  Search,
  DollarSign,
  Target,
  Clock,
  UserCircle,
  PlusCircle,
  Star,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  Home,
  Edit,
  Trash2,
  Zap,
  ArrowLeft,
} from "lucide-react";
import {
  fetchUserThreads,
  fetchSupportThreadMessages,
  sendSupportMessage,
  createSupportThread,
} from "@/lib/support";
import { fetchUserPayments } from "@/lib/payments";
import { toast } from "sonner";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFile } from "@/lib/storage";
import { motion, AnimatePresence } from "framer-motion";
import { UserPurchaseHistory, CreatorSalesHistory } from "@/components/dashboard-finance";
import {
  fetchStudentsProgressForCreator,
  fetchPlatformStats,
  type StudentProgress,
} from "@/lib/admin";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CertificateCard } from "@/components/certificate-card";
import { fetchUserOrganizations, repairMissingPackages } from "@/lib/organizations";

// --- HELPER COMPONENT: Stat Card ---
function StatCard({ label, value, icon: Icon, trend, colorClass, delay = 0 }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card
        className={cn(
          "border-border/40 shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-all text-slate-900 font-sans",
          colorClass === "text-emerald-600"
            ? "bg-emerald-50/30"
            : colorClass === "text-blue-600"
              ? "bg-blue-50/30"
              : colorClass === "text-amber-600"
                ? "bg-amber-50/30"
                : colorClass === "text-primary"
                  ? "bg-primary/5"
                  : "bg-card",
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center border border-border/50 bg-secondary/50",
                colorClass,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            {trend && (
              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                <ArrowUpRight className="h-3 w-3" /> {trend}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
              {label}
            </p>
            <h4 className="text-2xl font-bold text-foreground tracking-tight leading-none">
              {value}
            </h4>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// --- COMPONENT: Individual Student Journey ---
function StudentProgressDetail({ progress }: { progress: StudentProgress }) {
  return (
    <div className="space-y-8 pt-4 text-slate-900 font-sans">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Completion
          </p>
          <p className="text-xl font-black text-primary">{progress.progress_percent}%</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Lessons
          </p>
          <p className="text-xl font-black text-slate-900">
            {progress.completed_lessons}/{progress.total_lessons}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Status
          </p>
          {progress.has_certificate ? (
            <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase tracking-widest">
              Certified
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-slate-400 border-slate-200 text-[9px] font-black uppercase tracking-widest"
            >
              Learning
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 px-1 flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-primary" /> Assessment History
        </h4>
        <ScrollArea className="max-h-[160px] rounded-2xl border border-slate-100 bg-white">
          <div className="p-4 space-y-3">
            {(progress?.quiz_scores?.length || 0) > 0 ? (
              (progress.quiz_scores || []).map((q: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{q.quiz_title}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(q.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-lg font-black",
                        q.passed ? "text-emerald-500" : "text-red-500",
                      )}
                    >
                      {q.score}%
                    </p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                      {q.passed ? "Passed" : "Failed"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-xs text-slate-400 italic">
                No assessments completed yet.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-indigo-500" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 leading-none mb-1">
              Last Active
            </p>
            <p className="text-sm font-bold text-indigo-900 leading-none">
              {progress.last_active
                ? new Date(progress.last_active).toLocaleString()
                : "New Student"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENT: View Course Students (RESTYLED TO PRO TABLE) ---
function CourseStudentsDialog({
  courseId,
  courseTitle,
  creatorId,
}: {
  courseId: string;
  courseTitle: string;
  creatorId: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["course-students", courseId],
    queryFn: () => fetchStudentsProgressForCreator(creatorId, courseId),
  });

  const filteredStudents = useMemo(() => {
    return students.filter((s) =>
      (s.student.name || s.student.email || "").toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [students, searchTerm]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Users2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl bg-white border-slate-200 text-slate-900 rounded-[2.5rem] p-0 shadow-2xl overflow-hidden flex flex-col h-[85vh] font-sans">
        <div className="p-8 pb-6 bg-slate-50/50 border-b border-slate-100">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                  Roster: {courseTitle}
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                  Managing {students?.length || 0} enrolled learners.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Performance
                </span>
                <div className="h-4 w-px bg-slate-100 mx-2" />
                <span className="text-sm font-black text-primary">
                  Avg.{" "}
                  {Math.round(
                    (students?.reduce((acc, s) => acc + (s.progress_percent || 0), 0) || 0) /
                      (students?.length || 1),
                  )}
                  %
                </span>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search students by name or email..."
                className="pl-12 h-14 bg-white border-slate-200 rounded-2xl text-sm shadow-sm focus-visible:ring-primary/20 placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden p-8 pt-0">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Syncing database state...
              </p>
            </div>
          ) : (filteredStudents?.length || 0) === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 text-center">
              <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-2">
                <Search className="h-10 w-10 opacity-10" />
              </div>
              <p className="italic text-sm font-medium">No results matching your search.</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="rounded-3xl border border-slate-100 overflow-hidden bg-white shadow-sm mt-6">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="py-4 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400">
                        Student Identity
                      </TableHead>
                      <TableHead className="py-4 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">
                        Course Progress
                      </TableHead>
                      <TableHead className="py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">
                        Last Activity
                      </TableHead>
                      <TableHead className="py-4 font-black text-[10px] uppercase tracking-widest text-slate-400">
                        Cert.
                      </TableHead>
                      <TableHead className="py-4 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(filteredStudents || []).map((progress, idx) => (
                      <TableRow
                        key={idx}
                        className="group/row hover:bg-slate-50/30 border-slate-50 transition-colors"
                      >
                        <TableCell className="py-5 px-6">
                          <div className="flex items-center gap-4">
                            <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-xs shrink-0 overflow-hidden border border-slate-200 shadow-inner">
                              {progress.student?.avatar_url ? (
                                <img
                                  src={progress.student.avatar_url}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                progress.student?.name?.[0] || progress.student?.email?.[0]
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate leading-none mb-1.5">
                                {progress.student?.name || "Anonymous Learner"}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium truncate leading-none">
                                {progress.student?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[11px] font-black text-slate-900 leading-none">
                              {progress.progress_percent}%
                            </span>
                            <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  progress.progress_percent === 100
                                    ? "bg-emerald-500"
                                    : "bg-primary",
                                )}
                                style={{ width: `${progress.progress_percent}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] font-bold text-slate-600">
                          {progress.last_active
                            ? new Date(progress.last_active).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {progress.has_certificate ? (
                            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/10">
                              <Trophy className="h-3.5 w-3.5" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-black tracking-widest">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-4 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-white border border-transparent hover:border-slate-200 shadow-none hover:shadow-sm text-slate-500 hover:text-primary transition-all"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Analyze
                              </Button>
                            </DialogTrigger>
                            <DialogContent
                              className="max-w-xl bg-white rounded-[2.5rem] border-slate-200 p-8 shadow-2xl text-slate-900"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DialogHeader className="pb-4 border-b border-slate-50">
                                <DialogTitle className="text-2xl font-black tracking-tight">
                                  Performance Audit
                                </DialogTitle>
                                <DialogDescription className="text-base font-medium text-slate-500">
                                  Breakdown for {progress.student?.name || progress.student?.email}
                                </DialogDescription>
                              </DialogHeader>
                              <StudentProgressDetail progress={progress} />
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="p-8 pt-6 border-t border-slate-100 bg-slate-50/50">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-white shadow-sm hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-[0.98]"
            >
              Exit Management View
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- COMPONENT: Personalized Learning Path Tab ---
function PersonalizedLearningPathTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["personalized-learning-path", user?.id],
    queryFn: () => (getPersonalizedLearningPath as any)({ data: { userId: user!.id } }),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      queryClient.setQueryData(["personalized-learning-path", user?.id], null);
      await refetch();
    },
    onSuccess: () => {
      toast.success("อัปเดตเส้นทางการเรียนรู้ส่วนบุคคลเรียบร้อยแล้ว!");
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการอัปเดตเส้นทางการเรียนรู้");
    },
  });

  if (isLoading || regenerateMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <BrainCircuit className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">
            กำลังวิเคราะห์พฤติกรรมการเรียนของคุณ...
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm">
            AI กำลังประเมินระดับคะแนน ความคืบหน้า และวิเคราะห์ Skill Gap
            เพื่อสร้างแนวทางการศึกษาเฉพาะคุณ
          </p>
        </div>
      </div>
    );
  }

  if (error || !data || data.hasData === false) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="h-20 w-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
          <BrainCircuit className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">ไม่พบบริบทการเรียนรู้</h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            {data?.message ||
              "คุณจำเป็นต้องลงเรียนคอร์สในระบบอย่างน้อย 1 คอร์สเพื่อให้ AI เริ่มทำการวิเคราะห์และให้คำแนะนำ"}
          </p>
        </div>
        <Button
          asChild
          className="rounded-xl h-12 px-8 bg-slate-900 font-bold uppercase tracking-widest text-[10px]"
        >
          <Link to="/browse">ไปที่หน้าคอร์สเรียน</Link>
        </Button>
      </div>
    );
  }

  const path = data.data;

  return (
    <div className="space-y-10">
      {/* HEADER BANNER */}
      <div className="relative rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-12 text-white overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BrainCircuit className="h-32 w-32 rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <Badge className="bg-primary/20 text-primary border-none font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md">
              AI Personalized Tutor
            </Badge>
            <h2 className="text-white text-3xl md:text-4xl font-black tracking-tight leading-tight">
              เส้นทางการเรียนรู้เฉพาะบุคคลของคุณ
            </h2>
            <p className="text-slate-300 font-medium text-sm leading-relaxed">
              วิเคราะห์แบบเรียลไทม์ตามคะแนนสอบ คะแนนความคืบหน้า และพฤติกรรมการเรียน
              เพื่อสร้างคำแนะนำบทเรียนและทบทวนความรู้ที่ดีที่สุดสำหรับคุณ
            </p>
          </div>
          <Button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="rounded-xl h-12 px-6 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-widest shrink-0 shadow-lg transition-all active:scale-95 gap-2"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            อัปเดตคำแนะนำ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SKILL GAP & DIFFICULTY PROFILE */}
        <div className="lg:col-span-2 space-y-8">
          {/* Skill Gap Card */}
          <Card className="border-border bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-100 border-2">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    วิเคราะห์ความคืบหน้าและ Skill Gap
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    AI Feedback Report
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-600 leading-relaxed bg-slate-50/50 p-6 rounded-2xl border border-slate-100 whitespace-pre-line">
                {path.skillGapAnalysis}
              </p>
            </div>
          </Card>

          {/* Next Recommended Lessons */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> แนะนำบทเรียนถัดไปสำหรับคุณ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {path.nextLessons?.map((lesson: any, idx: number) => (
                <Card
                  key={idx}
                  className="border-indigo-100 bg-white rounded-[2.5rem] p-6 shadow-xl border-2 hover:border-indigo-400 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                        บทเรียนที่ {idx + 1}
                      </span>
                      <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none font-bold text-[9px] px-2 py-0.5 rounded-md">
                        {lesson.difficulty || "Recommended"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {lesson.courseTitle}
                      </p>
                      <h4 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                        {lesson.lessonTitle}
                      </h4>
                    </div>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">
                      {lesson.reason}
                    </p>
                  </div>
                  <div className="pt-6">
                    {lesson.lessonId ? (
                      <Button
                        asChild
                        className="w-full rounded-xl h-11 bg-slate-900 text-white font-bold text-xs"
                      >
                        <Link
                          to="/courses/$courseId/lessons/$lessonId"
                          params={{
                            courseId: lesson.courseId || "current",
                            lessonId: lesson.lessonId,
                          }}
                        >
                          เริ่มเรียนบทนี้
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        className="w-full rounded-xl h-11 bg-slate-900 text-white font-bold text-xs"
                      >
                        <Link to="/browse">ไปที่บทเรียน</Link>
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* METRICS & SIDE REVIEWS */}
        <div className="space-y-8">
          {/* Difficulty & Motivation */}
          <Card className="border-border bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-100 border-2">
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  ระดับความยากที่แนะนำ
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-indigo-600 tracking-tight">
                    {path.difficultyRecommendation}
                  </span>
                  <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full">
                    Optimal Mode
                  </Badge>
                </div>
                <p className="text-xs font-medium text-slate-500 leading-relaxed mt-2">
                  {path.difficultyExplanation}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-3 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Motivational Tip
                </h4>
                <p className="text-xs font-semibold text-slate-700 italic leading-relaxed">
                  "{path.motivationTip}"
                </p>
              </div>
            </div>
          </Card>

          {/* Areas to Review */}
          <Card className="border-border bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-100 border-2">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    จุดทบทวนแนะนำ
                  </h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Areas for Improvement
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {path.reviewAreas && path.reviewAreas.length > 0 ? (
                  path.reviewAreas.map((area: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100"
                    >
                      <div className="h-5 w-5 shrink-0 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 text-xs font-black">
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {area.topic}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                          {area.reason}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    ไม่มีจุดทบทวนแนะนำในขณะนี้ คุณทำคะแนนและเรียนได้ดีเยี่ยม!
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ROADMAP STEPS */}
      {path.learningPathSteps && path.learningPathSteps.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-indigo-600" /> แผนผัง Roadmap ก้าวสู่ความสำเร็จ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {path.learningPathSteps.map((step: any, idx: number) => (
              <Card
                key={idx}
                className="border-slate-100 bg-white rounded-[2rem] p-6 shadow-md border relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 font-black text-slate-100 text-6xl select-none leading-none">
                  {idx + 1}
                </div>
                <div className="relative z-10 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    Step {step.step || idx + 1}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 tracking-tight pt-2 leading-tight">
                    {step.title}
                  </h4>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENT: Certificates Gallery ---
function CertificatesGallery({ certificates }: { certificates: any[] }) {
  const { profile } = useAuth();
  const [selectedCert, setSelectedCert] = useState<any>(null);

  if (!certificates || certificates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="h-24 w-24 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200">
          <Trophy className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">No Certificates Yet</h3>
          <p className="text-slate-500 max-w-xs mx-auto text-sm">
            Complete your courses to earn professional certificates and showcase your skills.
          </p>
        </div>
        <Button
          asChild
          className="rounded-xl h-12 px-8 bg-slate-900 font-bold uppercase tracking-widest text-[10px]"
        >
          <Link to="/browse">Browse Programs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {certificates.map((cert) => (
          <motion.div
            key={cert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8 }}
            className="group"
          >
            <Card className="border-amber-200/50 bg-white shadow-xl shadow-amber-500/5 rounded-[2.5rem] p-8 relative overflow-hidden border-2 hover:border-amber-500 transition-all text-slate-900 h-full flex flex-col">
              <div className="relative z-10 space-y-6 flex-1">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/30">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full">
                    Verified ID: {cert.id.slice(0, 8)}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
                    {cert.course?.title || "Mastery Certification"}
                  </p>
                  <h4 className="text-xl font-black leading-tight text-slate-900">
                    Certificate of Achievement
                  </h4>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                        Issued On
                      </p>
                      <p className="text-xs font-bold text-slate-700">
                        {new Date(cert.issuedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-8 pt-6 border-t border-slate-50 flex items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      className="flex-1 h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] uppercase tracking-widest shadow-lg transition-all"
                      onClick={() => setSelectedCert(cert)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> View Certificate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl bg-slate-50 border-none p-0 rounded-[3.5rem] overflow-hidden">
                    <div className="p-8 md:p-12 max-h-[90vh] overflow-y-auto custom-scrollbar">
                      {selectedCert && (
                        <CertificateCard
                          cert={{
                            id: selectedCert.id,
                            issued_at: selectedCert.issuedAt,
                            recipient_name: selectedCert.recipientName,
                            course: selectedCert.course,
                            user: {
                              name: profile?.name || null,
                              avatar_url: profile?.avatar_url || null,
                            },
                          }}
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/verify/${cert.id}`;
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Verification link copied!");
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldCheck className="h-24 w-24 -rotate-12" />
              </div>
              <Trophy className="absolute -right-6 -bottom-6 h-40 w-40 text-amber-500/[0.03] -rotate-12 group-hover:scale-110 transition-transform duration-700" />
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --- COMPONENT: Support Chat for All Roles ---
function SupportChatView({
  threadId,
  subject,
  status,
  onRead,
}: {
  threadId: string;
  subject?: string;
  status?: string;
  onRead?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["support-messages", threadId],
    queryFn: () => fetchSupportThreadMessages(threadId),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (msgToSend: string) => sendSupportMessage(threadId, profile!.id, msgToSend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-messages", threadId] });
      setMessage("");
      // UX-W026: Mark as read immediately when sending
      if (onRead) onRead(threadId);
    },
    onError: (err: any) => {
      toast.error("Failed to send: " + err.message);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed && !sendMutation.isPending && status !== "closed") {
      sendMutation.mutate(trimmed);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }
  }, [messages.length]);

  if (isLoading && messages.length === 0)
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            Syncing Messages...
          </p>
        </div>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col h-full bg-white relative min-h-0">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <h3 className="text-sm font-black text-slate-900 line-clamp-1 uppercase tracking-tight italic">
            {subject || "Support Thread"}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full animate-pulse",
                status === "open" ? "bg-emerald-500" : "bg-slate-300",
              )}
            />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {status === "open" ? "Active Now" : "Ticket Closed"}
            </span>
          </div>
        </div>
        <Badge className="bg-slate-50 text-slate-400 border-slate-100 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 shadow-none">
          Ref: {threadId.slice(0, 8)}
        </Badge>
      </div>

      {/* Message List - Use native scroll for reliability */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0 bg-white">
        <div className="space-y-8 pb-4">
          <AnimatePresence initial={false}>
            {messages.map((msg: any, idx: number) => {
              if (!msg.message || msg.message.trim() === "") return null;

              const isMe = msg.sender_id === profile?.id;
              const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex items-end gap-3", isMe ? "flex-row-reverse" : "flex-row")}
                >
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center shrink-0 border shadow-sm transition-opacity",
                      !showAvatar && "opacity-0",
                      isMe ? "bg-primary border-primary/20" : "bg-white border-slate-200",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[9px] font-black uppercase tracking-tighter italic",
                        isMe ? "text-white" : "text-slate-400",
                      )}
                    >
                      {isMe
                        ? "ME"
                        : msg.profiles?.role === "admin"
                          ? "ST"
                          : msg.profiles?.name?.[0] || "U"}
                    </span>
                  </div>

                  <div
                    className={cn("flex flex-col max-w-[80%]", isMe ? "items-end" : "items-start")}
                  >
                    <div
                      className={cn(
                        "p-4 rounded-[1.25rem] text-sm font-medium shadow-sm leading-relaxed break-words",
                        isMe
                          ? "bg-slate-900 text-white rounded-br-none"
                          : "bg-slate-50 text-slate-700 rounded-bl-none border border-slate-100",
                      )}
                    >
                      {msg.message}
                    </div>
                    {/* UI Polish: Always show time for clarity (Requested) */}
                    <span className="text-[8px] font-black text-slate-300 mt-2 uppercase tracking-widest px-1 italic">
                      {isMe
                        ? "Sent"
                        : msg.profiles?.role === "admin"
                          ? "Support"
                          : msg.profiles?.name}{" "}
                      •{" "}
                      {new Date(msg.created_at).toLocaleString("th-TH", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={scrollRef} className="h-px w-full" />
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50/30 backdrop-blur-sm shrink-0">
        <form className="flex gap-3 items-end" onSubmit={handleSend}>
          <div className="relative flex-1 group">
            <Input
              placeholder={
                status === "closed"
                  ? "This ticket is closed"
                  : "Explain your issue or ask a question..."
              }
              className="h-14 pr-12 rounded-2xl bg-white border-slate-200 text-slate-900 shadow-sm focus-visible:ring-primary/20 transition-all text-sm font-medium"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendMutation.isPending || status === "closed"}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-200 group-focus-within:text-primary/20 transition-colors uppercase tracking-widest hidden sm:block">
              LearnLab
            </div>
          </div>
          <Button
            type="submit"
            className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all shrink-0 group"
            disabled={sendMutation.isPending || !message.trim() || status === "closed"}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
          </Button>
        </form>
        {status === "closed" && (
          <p className="text-[9px] font-bold text-center text-slate-400 mt-3 uppercase tracking-widest">
            Replies are disabled for closed tickets.
          </p>
        )}
      </div>
    </div>
  );
}

function UserThreadsDialog({
  unreadCount,
  onOpenChange,
  onThreadClick,
}: {
  unreadCount: number;
  onOpenChange: (open: boolean) => void;
  onThreadClick: (id: string) => void;
}) {
  const { profile } = useAuth();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["user-support-threads", profile?.id],
    queryFn: () => fetchUserThreads(profile!.id),
    enabled: !!profile?.id,
  });

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="rounded-xl h-10 px-4 font-bold text-muted-foreground hover:text-foreground gap-2 text-xs relative"
        >
          <HistoryIcon className="h-4 w-4" />
          Tickets
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[8px] font-black flex items-center justify-center rounded-full border-2 border-background animate-in zoom-in duration-300 shadow-lg shadow-primary/20">
              {unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-white rounded-[2.5rem] p-0 border-border text-slate-900 shadow-2xl overflow-hidden flex flex-col h-[70vh]">
        <div className="grid grid-cols-1 md:grid-cols-12 h-full">
          <div className="md:col-span-4 border-r border-border flex flex-col">
            <div className="p-6 border-b border-border bg-secondary/10 shrink-0">
              <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">
                Support History
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="divide-y divide-border">
                {threads.map((thread: any) => (
                  <button
                    key={thread.id}
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      onThreadClick(thread.id);
                    }}
                    className={cn(
                      "w-full text-left p-6 hover:bg-slate-50 transition-colors flex flex-col gap-2 relative group",
                      selectedThreadId === thread.id &&
                        "bg-slate-50 border-l-4 border-l-primary shadow-inner",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        className={cn(
                          "border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                          thread.status === "open"
                            ? "bg-emerald-500 text-white"
                            : thread.status === "resolved"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-400 text-white",
                        )}
                      >
                        {thread.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-bold">
                        {thread.lastMessage
                          ? new Date(thread.lastMessage.created_at).toLocaleString("th-TH", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : new Date(thread.updated_at).toLocaleString("th-TH", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors italic">
                      {thread.subject}
                    </h4>
                    {thread.lastMessage && (
                      <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                        "{thread.lastMessage.message}"
                      </p>
                    )}
                  </button>
                ))}
                {threads.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground italic text-xs">
                    No active tickets.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="md:col-span-8 flex flex-col">
            {selectedThreadId ? (
              <SupportChatView
                threadId={selectedThreadId}
                subject={threads.find((t) => t.id === selectedThreadId)?.subject}
                status={threads.find((t) => t.id === selectedThreadId)?.status || undefined}
                onRead={onThreadClick}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <MessageSquare className="h-12 w-12 opacity-10" />
                <p className="font-bold text-sm text-slate-400">
                  Select a ticket to start chatting.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserSupportDialog({ showRefund = true }: { showRefund?: boolean }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isRefundRequest, setIsRefundRequest] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ["user-payments-for-refund", profile?.id],
    queryFn: () => fetchUserPayments(profile!.id),
    enabled: !!profile?.id && isRefundRequest && showRefund,
  });

  const createTicketMutation = useMutation({
    mutationFn: () => {
      const finalSubject = isRefundRequest
        ? `Refund Request: ${payments.find((p: any) => p.course_id === selectedCourseId)?.courses?.title || "Course"}`
        : subject;
      return createSupportThread(profile!.id, finalSubject, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-support-threads", profile?.id] });
      toast.success("Support ticket created! Our team will respond soon.");
      setIsOpen(false);
      setSubject("");
      setMessage("");
      setSelectedCourseId(null);
      setIsRefundRequest(false);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-xl h-10 px-4 font-bold border-border bg-background hover:bg-secondary gap-2 text-xs"
        >
          <MessageSquare className="h-4 w-4" /> Support
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-white rounded-[2.5rem] p-0 border-border text-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-8 pb-4 border-b border-border bg-secondary/10 shrink-0">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                Support Desk
              </DialogTitle>
              <Badge
                variant="outline"
                className="bg-white border-border text-[9px] font-black uppercase"
              >
                Help Desk
              </Badge>
            </div>
            <DialogDescription className="text-sm font-medium text-slate-500">
              Need help? Message our team directly.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 space-y-8">
            {showRefund && (
              <div className="flex p-1 bg-secondary/50 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsRefundRequest(false);
                    setSelectedCourseId(null);
                  }}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    !isRefundRequest
                      ? "bg-white text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  General Issue
                </button>
                <button
                  type="button"
                  onClick={() => setIsRefundRequest(true)}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    isRefundRequest
                      ? "bg-white text-rose-500 shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Refund Request
                </button>
              </div>
            )}

            {isRefundRequest && showRefund ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Select Course
                  </Label>
                  {selectedCourseId && (
                    <span className="text-[10px] font-bold text-emerald-600">Selected</span>
                  )}
                </div>
                <div className="grid gap-2">
                  {payments
                    .filter((p: any) => p.status === "completed")
                    .map((payment: any) => (
                      <button
                        key={payment.id}
                        type="button"
                        onClick={() => setSelectedCourseId(payment.course_id)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group/course",
                          selectedCourseId === payment.course_id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border bg-secondary/20 hover:border-primary/40",
                        )}
                      >
                        <div className="min-w-0 pr-4">
                          <p className="text-xs font-bold truncate">{payment.courses?.title}</p>
                          <p className="text-[9px] text-muted-foreground mt-1">
                            Transaction: {payment.transaction_id?.slice(0, 8)}
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-primary shrink-0">
                          ${payment.amount}
                        </span>
                      </button>
                    ))}
                  {payments.filter((p: any) => p.status === "completed").length === 0 && (
                    <div className="text-center py-10 border border-dashed rounded-2xl bg-slate-50/50">
                      <p className="text-xs text-muted-foreground italic font-medium">
                        No eligible courses found for refund.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Subject
                </Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Cannot access course content"
                  className="h-12 rounded-xl bg-secondary/30 border-border focus-visible:ring-primary/20 text-slate-900 font-bold"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Message Details
              </Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail. Please provide as much information as possible."
                className="w-full min-h-[140px] p-4 rounded-xl bg-secondary/30 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 placeholder:text-muted-foreground/50 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="p-8 pt-4 border-t border-border bg-slate-50/50 shrink-0">
          <DialogFooter>
            <Button
              className={cn(
                "w-full h-14 rounded-2xl font-black text-base transition-all",
                createTicketMutation.isPending ? "opacity-70" : "shadow-xl shadow-primary/20",
              )}
              disabled={
                createTicketMutation.isPending ||
                (!isRefundRequest && !subject) ||
                !message ||
                (isRefundRequest && !selectedCourseId)
              }
              onClick={() => createTicketMutation.mutate()}
            >
              {createTicketMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Send className="h-5 w-5 mr-2" />
              )}
              {createTicketMutation.isPending ? "Submitting..." : "Submit Support Ticket"}
            </Button>
          </DialogFooter>
          <p className="text-[9px] text-center text-muted-foreground mt-4 font-medium uppercase tracking-widest">
            {!isRefundRequest && !subject
              ? "Please enter a subject"
              : isRefundRequest && !selectedCourseId
                ? "Please select a course"
                : !message
                  ? "Please enter a message"
                  : "Ready to submit"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- MAIN DASHBOARD COMPONENT ---
function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang } = useI18n();
  const search = Route.useSearch() as any;
  const { user, profile, loading, signOut: authSignOut, updateProfile } = useAuth();

  const isCreator = profile?.role === "creator";
  const isAdmin = profile?.role === "admin";

  // Auto-check fulfillment on success
  useEffect(() => {
    if (search.success === "true" && user?.id) {
      (repairMissingPackages as any)({ data: { orgId: null, userId: user.id } }).then(
        (result: any) => {
          if (result && (result as any).count > 0) {
            toast.success(`Successfully recovered ${(result as any).count} curricula!`);
            queryClient.invalidateQueries();
          }
        },
      );
    }
  }, [search.success, user?.id, queryClient]);

  const { data: myOrgsData = [] } = useQuery({
    queryKey: ["user-organizations", user?.id],
    queryFn: () => fetchUserOrganizations(user!.id),
    enabled: !!user?.id,
  });

  const myOrgs = useMemo(() => {
    if (!myOrgsData) return [];
    return [...myOrgsData].sort((a, b) => {
      // 1. Prioritize organizations where user is owner
      const isOwnerA = a.organizations?.owner_id === user?.id;
      const isOwnerB = b.organizations?.owner_id === user?.id;
      if (isOwnerA && !isOwnerB) return -1;
      if (!isOwnerA && isOwnerB) return 1;

      // 2. Then prioritize admin role
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (a.role !== "admin" && b.role === "admin") return 1;

      // 3. Tie breaker: Newest organization first (created_at)
      const dateA = new Date(a.organizations?.created_at || 0).getTime();
      const dateB = new Date(b.organizations?.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [myOrgsData, user?.id]);

  const [activeTab, setActiveTab] = useState<
    "overview" | "certificates" | "learning-path" | "sales" | "students"
  >("overview");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // --- INDIVIDUAL THREAD UNREAD LOGIC ---
  const [threadViews, setThreadViews] = useState<Record<string, number>>({});

  // Robust Load Views
  useEffect(() => {
    if (profile?.id && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`support_views_${profile.id}`);
        if (stored) setThreadViews(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load thread views", e);
      }
    }
  }, [profile?.id]);

  const markThreadRead = useCallback(
    (threadId: string) => {
      if (!profile?.id) return;
      const now = Date.now();
      setThreadViews((prev) => {
        const next = { ...prev, [threadId]: now };
        localStorage.setItem(`support_views_${profile.id}`, JSON.stringify(next));
        return next;
      });
    },
    [profile?.id],
  );

  const { data: threads = [] } = useQuery({
    queryKey: ["user-support-threads", profile?.id],
    queryFn: () => fetchUserThreads(profile!.id),
    enabled: !!profile?.id,
    refetchInterval: 10000,
  });

  const unreadCount = useMemo(() => {
    if (!Array.isArray(threads) || !profile?.id) return 0;

    return threads.filter((t: any) => {
      if (t.status === "closed") return false;

      // UX-W025: Don't count as unread if the last meaningful message was from me
      // t.lastMessage is already filtered for non-empty content in support.ts
      if (!t.lastMessage) return false;

      // Strict string-based ID comparison
      const lastSenderId = String(t.lastMessage.sender_id);
      const myId = String(profile.id);
      if (lastSenderId === myId) return false;

      const lastViewed = threadViews[t.id] || 0;
      const lastActivity = new Date(t.lastMessage.created_at).getTime();

      // Use a 2s buffer for extra safety against DB vs Client time drift
      return lastActivity > lastViewed + 2000;
    }).length;
  }, [threads, profile?.id, threadViews]);

  const handleSupportOpen = (open: boolean) => {
    // Handled via onThreadClick
  };
  // --------------------------------

  const [profileName, setProfileName] = useState(profile?.name || "");
  const [isUploading, setIsUploading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ name: profileName });
      toast.success("Profile updated");
      setIsEditingProfile(false);
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;
      const publicUrl = await uploadFile("profile-pictures", filePath, file);
      await updateProfile({ avatar_url: publicUrl } as any);
      toast.success("Avatar updated");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authSignOut();
      void navigate({ to: "/login", search: { mode: "login" } });
      toast.success("Signed out");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const verifyMembershipMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      // 1. Check for completed payments for enterprise plans
      const { data: payments, error: pError } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .is("course_id", null); // Enterprise/Bundle payments usually have null course_id

      if (pError) throw pError;

      if (payments && payments.length > 0) {
        // 2. If payment found, update status manually
        await updateProfile({ org_request_status: "approved" });
        return true;
      }
      return false;
    },
    onSuccess: (found) => {
      if (found) {
        toast.success("Membership verified! Welcome Pro.");
        queryClient.invalidateQueries();
      } else {
        toast.error("No active enterprise subscription found. Please check your payment.");
      }
    },
    onError: (err: any) => toast.error("Verification failed: " + err.message),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return (deleteCourse as any)({
        data: {
          id,
          token: session?.access_token,
          userId: user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-courses"] });
      toast.success("Course deleted permanently");
    },
  });

  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ["creator-courses", user?.id],
    queryFn: () => fetchCoursesByCreator(user!.id),
    enabled: Boolean(user?.id && isCreator),
  });

  const { data: revenueData } = useQuery({
    queryKey: ["creator-revenue", user?.id],
    queryFn: () => fetchCreatorRevenue(user!.id),
    enabled: Boolean(user?.id && isCreator),
  });

  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ["student-enrollments", user?.id],
    queryFn: () => fetchUserEnrollments(user!.id),
    enabled: Boolean(user?.id && !isCreator && !isAdmin),
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["user-certificates", user?.id],
    queryFn: () => fetchUserCertificates(user!.id),
    enabled: !!user?.id,
  });

  const { data: platformStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: fetchPlatformStats,
    enabled: isAdmin,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  if (!user) {
    void navigate({ to: "/login", search: { mode: "login" } });
    return null;
  }

  // --- ROLE SELECTION MODAL (FOR FIRST-TIME GOOGLE USERS) ---
  // Fix: Don't show if they have already selected a role, or if they are a legacy user with an existing role.
  const showRoleModal =
    profile &&
    profile.role !== "admin" &&
    !profile.has_selected_role &&
    // If they are a student but haven't "selected" it via the modal, we ask.
    // BUT if they are a creator, they clearly have a role assigned, so we don't ask.
    profile.role === "student";

  const handleSelectRole = async (selectedRole: "student" | "creator") => {
    try {
      await updateProfile({
        role: selectedRole,
        has_selected_role: true,
      });
      toast.success(`Account set as ${selectedRole}!`);
      // Force refresh data to update UI tabs
      await queryClient.invalidateQueries();
    } catch (err) {
      toast.error("Failed to set role");
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/10">
      {/* ROLE SELECTION OVERLAY */}
      <AnimatePresence>
        {showRoleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-indigo-500/10 flex flex-col md:flex-row border border-white/5"
            >
              {/* Left Side: Visual/Brand - REFINED LUXURY THEME */}
              <div className="w-full md:w-2/5 bg-zinc-950 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                {/* Animated Background Gradients */}
                <div className="absolute top-[-20%] right-[-20%] w-80 h-80 bg-indigo-600/20 blur-[100px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-20%] left-[-20%] w-80 h-80 bg-purple-600/20 blur-[100px] rounded-full animate-pulse [animation-delay:1s]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  <motion.div
                    initial={{ rotate: -10, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl"
                  >
                    <Sparkles className="h-7 w-7 text-indigo-400 fill-indigo-400/20" />
                  </motion.div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-[0.9] text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40">
                      Welcome to <br /> LearnLab
                    </h2>
                    <div className="h-1 w-12 bg-indigo-500 rounded-full" />
                  </div>
                </div>

                <div className="relative z-10 space-y-6">
                  <p className="text-sm font-medium text-zinc-400 leading-relaxed italic border-l-2 border-indigo-500/30 pl-4">
                    "The future of education is personalized, fast, and driven by your choices."
                  </p>

                  <div className="flex items-center gap-4 opacity-40 grayscale invert">
                    <span className="text-[10px] font-black tracking-widest uppercase">
                      Trusted Tech
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                </div>
              </div>

              {/* Right Side: Selection */}
              <div className="flex-1 p-12 lg:p-16 bg-white space-y-12">
                <div className="space-y-3">
                  <h3 className="text-3xl font-black text-zinc-900 tracking-tight leading-none">
                    How will you use the lab?
                  </h3>
                  <p className="text-zinc-500 font-medium">
                    Choose your primary path to customize your experience.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Student Option */}
                  <button
                    onClick={() => handleSelectRole("student")}
                    className="group relative flex flex-col p-8 rounded-[2rem] bg-zinc-50 border-2 border-transparent hover:border-indigo-500 hover:bg-white transition-all text-left"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                      <UserCircle className="h-7 w-7" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-zinc-900">Student</h4>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                        Learn new skills, complete assignments, and earn verified certificates.
                      </p>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Select Path <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </button>

                  {/* Creator Option */}
                  <button
                    onClick={() => handleSelectRole("creator")}
                    className="group relative flex flex-col p-8 rounded-[2rem] bg-zinc-50 border-2 border-transparent hover:border-purple-500 hover:bg-white transition-all text-left"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                      <PlusCircle className="h-7 w-7" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-zinc-900">Creator</h4>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                        Build courses, teach global students, and manage your educational business.
                      </p>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Select Path <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                </div>

                <p className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Secure Choice • Path can be changed later in settings
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex z-30">
        <div className="flex items-center gap-3 px-6 h-14 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4 fill-current" />
            </div>
            <span className="text-[14px] font-bold tracking-tight text-foreground uppercase italic tracking-widest leading-none">
              LearnLab
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">
              Menu
            </p>
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <Home className="h-4 w-4 opacity-70" /> Home
            </Link>
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-bold transition-all text-left",
                activeTab === "overview"
                  ? "bg-primary/10 text-primary border border-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
              )}
            >
              <LayoutDashboard className="h-4 w-4" /> {t("overview")}
            </button>
            {!isAdmin && !isCreator && (
              <button
                onClick={() => setActiveTab("certificates")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-bold transition-all text-left",
                  activeTab === "certificates"
                    ? "bg-primary/10 text-primary border border-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent",
                )}
              >
                <Trophy className="h-4 w-4" /> {t("certificates")}
              </button>
            )}
            {isAdmin && (
              <Link
                to={"/admin" as any}
                className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
              >
                <ShieldCheck className="h-4 w-4 opacity-70" /> {t("administration")}
              </Link>
            )}
          </div>

        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-background">
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8 text-muted-foreground hover:text-foreground mr-1"
              title="กลับหน้าหลัก"
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            
            <div className="flex items-center gap-2">
              <Link to="/" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                {lang === "th" ? "หน้าหลัก" : "Home"}
              </Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[11px] font-black uppercase tracking-widest text-foreground">
                {lang === "th" ? "แดชบอร์ด" : "Dashboard"}
              </span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <h2 className="text-[11px] font-black tracking-tight text-primary uppercase italic tracking-widest leading-none">
                {activeTab === "overview"
                  ? t("overview")
                  : activeTab === "certificates"
                    ? t("credentials")
                    : activeTab === "learning-path"
                      ? "AI Learning Path"
                      : t("analytics")}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {!isAdmin && (
                <>
                  <UserThreadsDialog
                    unreadCount={unreadCount}
                    onOpenChange={handleSupportOpen}
                    onThreadClick={markThreadRead}
                  />
                  <UserSupportDialog showRefund={!isCreator} />
                </>
              )}
            </div>

            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[9px]">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  profile?.name?.[0] || "U"
                )}
              </div>
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black text-slate-900 leading-none">
                    {profile?.name || "Member"}
                  </span>
                  {profile?.org_request_status === "approved" && (
                    <Badge className="h-3.5 px-1 bg-indigo-600 text-[7px] font-black text-white border-none rounded-[4px] uppercase tracking-widest flex items-center gap-0.5">
                      <Zap className="h-2 w-2 fill-current text-amber-300" /> PRO
                    </Badge>
                  )}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none">
                  {profile?.role === "admin" ? "Admin" : profile?.role === "creator" ? "Creator" : "Student"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-12">
            {activeTab === "certificates" ? (
              <CertificatesGallery certificates={certificates} />
            ) : activeTab === "learning-path" ? (
              <PersonalizedLearningPathTab />
            ) : (
              <>
                {/* GREETING */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-1.5">
                    <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic leading-none text-slate-900 font-sans">
                      {isAdmin
                        ? t("adminConsole")
                        : isCreator
                          ? t("creatorStudio")
                          : `${t("welcomeBack")}, ${profile?.name?.split(" ")[0] || "Learner"}`}
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                      {isAdmin
                        ? "Manage and monitor platform health."
                        : isCreator
                          ? "Manage your courses and student growth."
                          : "Ready to continue your learning journey?"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {isCreator && (
                      <>
                        <Button
                          asChild
                          variant="outline"
                          className="h-11 px-6 rounded-xl border-indigo-200 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 font-black text-[11px] uppercase tracking-widest gap-2 shadow-sm transition-all active:scale-95"
                        >
                          <Link to="/generate" search={{ mode: "login" } as any}>
                            <Sparkles className="h-4 w-4" />
                            {lang === "th" ? "สร้างคอร์สด้วย AI" : "Generate with AI"}
                          </Link>
                        </Button>
                        <Button
                          asChild
                          className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-6 shadow-lg shadow-primary/20 gap-2 transition-all active:scale-95"
                        >
                          <Link to="/create" search={{ mode: "login" } as any}>
                            <Plus className="h-4 w-4" /> {lang === "th" ? "สร้างด้วยตัวเอง" : "Manual Create"}
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* METRICS */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {isAdmin ? (
                    <>
                      <StatCard
                        label={t("platformRevenue")}
                        value={`$${(platformStats?.totalRevenue || 0).toLocaleString()}`}
                        icon={DollarSign}
                        trend="System Wide"
                        colorClass="text-emerald-600"
                      />
                      <StatCard
                        label={t("totalPlatformUsers")}
                        value={(platformStats?.totalUsers || 0).toLocaleString()}
                        icon={Users}
                        trend="Active Accounts"
                        colorClass="text-blue-600"
                        delay={0.05}
                      />
                      <StatCard
                        label={t("activeCourses")}
                        value={(platformStats?.totalCourses || 0).toLocaleString()}
                        icon={BookOpen}
                        trend={`${platformStats?.draftCourses || 0} Drafts`}
                        colorClass="text-primary"
                        delay={0.1}
                      />
                      <StatCard
                        label={t("serverStatus")}
                        value="Optimal"
                        icon={Activity}
                        trend="100% Uptime"
                        colorClass="text-rose-600"
                        delay={0.15}
                      />
                    </>
                  ) : isCreator ? (
                    <>
                      <StatCard
                        label={t("totalRevenue")}
                        value={`$${(revenueData?.total || 0).toLocaleString()}`}
                        icon={DollarSign}
                        trend="+8.2%"
                        colorClass="text-emerald-600"
                      />
                      <StatCard
                        label={t("activeStudents")}
                        value={(revenueData?.transactions || 0).toLocaleString()}
                        icon={Users}
                        trend="+12"
                        colorClass="text-blue-600"
                        delay={0.05}
                      />
                      <StatCard
                        label={t("ratingAverage")}
                        value={
                          revenueData?.averageRating && revenueData.averageRating > 0
                            ? revenueData.averageRating.toFixed(1)
                            : "N/A"
                        }
                        icon={Star}
                        trend="Stable"
                        colorClass="text-amber-600"
                        delay={0.1}
                      />
                      <StatCard
                        label={t("totalCourses")}
                        value={courses?.length || 0}
                        icon={BookOpen}
                        colorClass="text-primary"
                        delay={0.15}
                      />
                    </>
                  ) : (
                    <>
                      <StatCard
                        label={t("courseCompletion")}
                        value={
                          enrollments?.length > 0
                            ? `${Math.round(
                                enrollments.reduce(
                                  (acc, en) => acc + (en.progress_percent || 0),
                                  0,
                                ) / enrollments.length,
                              )}%`
                            : "0%"
                        }
                        icon={Target}
                        trend="Average Progress"
                        colorClass="text-emerald-600"
                      />
                      <StatCard
                        label={t("coursesEnrolled")}
                        value={enrollments?.length || 0}
                        icon={BookOpen}
                        colorClass="text-primary"
                        delay={0.05}
                      />
                      <StatCard
                        label={t("certificates")}
                        value={certificates?.length || 0}
                        icon={ShieldCheck}
                        trend="Earned"
                        colorClass="text-blue-600"
                        delay={0.1}
                      />
                      {myOrgs && myOrgs.length > 0 && (
                        <StatCard
                          label="Institutional Role"
                          value={myOrgs[0].organizations?.name}
                          icon={Building2}
                          trend="Org Owner"
                          colorClass="text-indigo-600"
                          delay={0.15}
                        />
                      )}
                    </>
                  )}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32">
                  <div className="lg:col-span-2 space-y-12">
                    {isAdmin ? (
                      <>
                        <section className="space-y-6">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-2">
                            System Management
                          </h3>
                          <Card className="border-border/40 bg-card shadow-sm rounded-2xl p-8 text-slate-900">
                            <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                              <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                                <ShieldCheck className="h-8 w-8" />
                              </div>
                              <div>
                                <h4 className="text-xl font-bold">Admin Control Center</h4>
                                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                                  You have full access to the platform. Manage users, monitor
                                  courses, and oversee financial operations from the central
                                  administration.
                                </p>
                              </div>
                              <Button asChild className="h-12 rounded-xl bg-primary px-8 font-bold">
                                <Link to="/admin">Open Admin Workspace</Link>
                              </Button>
                            </div>
                          </Card>
                        </section>
                      </>
                    ) : !isCreator ? (
                      <>
                        <section className="space-y-8">
                          <div className="flex items-center justify-between px-2">
                            <div className="space-y-1">
                              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                                {t("myLearningJourney")}
                              </h3>
                              <p className="text-2xl font-black text-slate-900">{t("myCourses")}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className="rounded-lg border-slate-200 font-bold text-[10px] text-slate-500 bg-slate-50"
                            >
                              {enrollments?.length || 0} Enrolled
                            </Badge>
                          </div>

                          {/* --- RESUME LEARNING HERO (compact) --- */}
                          {enrollments?.length > 0 && !isLoadingEnrollments && (
                            <motion.div
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="group relative"
                            >
                              <Card className="border-none bg-slate-900 text-white shadow-xl rounded-2xl overflow-hidden">
                                <div className="p-6 flex items-center justify-between gap-6">
                                  <div className="space-y-3 flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">
                                        {t("recentlyActive")}
                                      </span>
                                    </div>
                                    <h2 className="text-lg font-black tracking-tight leading-tight line-clamp-1">
                                      {enrollments[0].course.title}
                                    </h2>
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                          {t("courseProgress")}
                                        </span>
                                        <span className="text-sm font-black text-white">
                                          {enrollments[0].progress_percent}%
                                        </span>
                                      </div>
                                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${enrollments[0].progress_percent}%` }}
                                          transition={{ duration: 1, delay: 0.5 }}
                                          className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    asChild
                                    className="h-10 px-5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 shrink-0"
                                  >
                                    <Link
                                      to="/courses/$courseId/learn"
                                      params={{ courseId: enrollments[0].course.id }}
                                      search={{
                                        lessonId: enrollments[0].last_lesson_id || undefined,
                                      }}
                                    >
                                      {t("continueLearning")} <ChevronRight className="h-3 w-3 ml-1" />
                                    </Link>
                                  </Button>
                                </div>
                              </Card>
                            </motion.div>
                          )}

                          <Card className="border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden text-slate-900">
                            <Table>
                              <TableHeader className="bg-secondary/30 border-b border-border">
                                <TableRow className="hover:bg-transparent border-none">
                                  <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest py-4 px-6">
                                    Course
                                  </TableHead>
                                  <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">
                                    Progress
                                  </TableHead>
                                  <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">
                                    Instructor
                                  </TableHead>
                                  <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest text-right px-6">
                                    Action
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {isLoadingEnrollments ? (
                                  <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center">
                                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto opacity-20" />
                                    </TableCell>
                                  </TableRow>
                                ) : (enrollments?.length || 0) > 0 ? (
                                  enrollments.map((en) => (
                                    <TableRow
                                      key={en.id}
                                      className="border-border hover:bg-accent/30 transition-colors group"
                                    >
                                      <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                          <div className="h-12 w-20 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                                            {en.course.imageUrl ? (
                                              <img
                                                src={en.course.imageUrl}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement;
                                                  if (target.src.includes("pollinations.ai")) {
                                                    const sep = target.src.includes("?")
                                                      ? "&"
                                                      : "?";
                                                    setTimeout(() => {
                                                      target.src = `${target.src}${sep}retry=${Date.now()}`;
                                                    }, 2000);
                                                  }
                                                }}
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                                                <BookOpen className="h-5 w-5" />
                                              </div>
                                            )}
                                          </div>
                                          <div>
                                            <p className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                              {en.course.title}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                              Enrolled{" "}
                                              {new Date(en.enrolled_at || "").toLocaleDateString()}
                                            </p>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="space-y-1.5 w-32">
                                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            <span>{en.progress_percent}%</span>
                                          </div>
                                          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-primary rounded-full transition-all duration-1000"
                                              style={{ width: `${en.progress_percent}%` }}
                                            />
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <div className="h-6 w-6 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center text-[10px] font-bold">
                                            {en.course.instructor?.avatar_url ? (
                                              <img
                                                src={en.course.instructor.avatar_url}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              en.course.instructor?.name?.[0] || "I"
                                            )}
                                          </div>
                                          <span className="text-xs font-semibold text-muted-foreground">
                                            {en.course.instructor?.name || "Instructor"}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right px-6">
                                        <Button
                                          size="sm"
                                          className="h-8 rounded-lg font-black uppercase tracking-widest text-[9px] px-4"
                                          asChild
                                        >
                                          <Link
                                            to="/courses/$courseId/learn"
                                            params={{ courseId: en.course.id }}
                                            search={{ lessonId: en.last_lesson_id || undefined }}
                                          >
                                            Continue <ChevronRight className="h-3 w-3 ml-1" />
                                          </Link>
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell
                                      colSpan={4}
                                      className="h-32 text-center text-muted-foreground font-medium"
                                    >
                                      You haven't enrolled in any courses yet.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </Card>
                        </section>
                      </>
                    ) : (
                      <>
                        <section className="space-y-6">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-2">
                            Inventory Control
                          </h3>
                          <Card className="border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden text-slate-900">
                            <Table>
                              <TableHeader className="bg-secondary/30 border-b border-border">
                                <TableRow className="hover:bg-transparent border-none">
                                  <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest py-4 px-6">
                                    Course Title
                                  </TableHead>
                                  <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">
                                    Status
                                  </TableHead>
                                  <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">
                                    Students
                                  </TableHead>
                                  <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest text-right px-6">
                                    Actions
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(courses || []).map((c) => (
                                  <TableRow
                                    key={c.id}
                                    className="border-border hover:bg-accent/30 transition-colors cursor-pointer group"
                                  >
                                    <TableCell
                                      className="py-4 px-6 font-bold text-foreground group-hover:text-primary transition-colors"
                                      onClick={() =>
                                        navigate({
                                          to: "/courses/$courseId",
                                          params: { courseId: c.id },
                                        })
                                      }
                                    >
                                      {c.title}
                                    </TableCell>
                                    <TableCell
                                      onClick={() =>
                                        navigate({
                                          to: "/courses/$courseId",
                                          params: { courseId: c.id },
                                        })
                                      }
                                    >
                                      <Badge
                                        className={cn(
                                          "bg-background border border-border/50 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg shadow-sm",
                                          c.status?.toLowerCase() === "published"
                                            ? "text-emerald-600"
                                            : "text-muted-foreground",
                                        )}
                                      >
                                        {c.status || "Draft"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell
                                      className="font-mono text-muted-foreground font-bold"
                                      onClick={() =>
                                        navigate({
                                          to: "/courses/$courseId",
                                          params: { courseId: c.id },
                                        })
                                      }
                                    >
                                      {c.students || 0}
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                      <div
                                        className="flex items-center justify-end gap-2"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <CourseStudentsDialog
                                          courseId={c.id}
                                          courseTitle={c.title}
                                          creatorId={user.id}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"
                                          asChild
                                        >
                                          <Link to="/courses/$courseId" params={{ courseId: c.id }}>
                                            <Edit className="h-4 w-4" />
                                          </Link>
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent className="bg-white rounded-[2rem] border-slate-200 p-10 text-slate-900 shadow-2xl">
                                            <AlertDialogHeader>
                                              <AlertDialogTitle className="text-2xl font-black tracking-tight">
                                                Delete Course?
                                              </AlertDialogTitle>
                                              <AlertDialogDescription className="text-slate-500 font-medium text-base">
                                                This action is permanent and will remove all student
                                                data for this course.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="mt-8 gap-3">
                                              <AlertDialogCancel className="rounded-xl h-12 font-bold border-slate-200">
                                                Cancel
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                className="rounded-xl h-12 font-bold bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/20 transition-all active:scale-95"
                                                onClick={() => deleteCourseMutation.mutate(c.id)}
                                              >
                                                Delete Permanently
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Card>
                        </section>

                        <section className="space-y-6 text-slate-900">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-2">
                            Sales Insights
                          </h3>
                          <CreatorSalesHistory creatorId={user.id} />
                        </section>
                      </>
                    )}
                  </div>

                  {/* SECONDARY COLUMN */}
                  <div className="space-y-8">
                    {/* isCreator Quick Links moved to header */}

                    {false && !isCreator && !isAdmin && (
                      <section className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-2">
                          Corporate
                        </h3>
                        {myOrgs.length > 0 ? (
                          <div className="space-y-3">
                            {myOrgs.map((uo: any) => (
                              <Card
                                key={uo.id}
                                className="border-indigo-100 bg-indigo-50/50 shadow-none rounded-2xl p-6 border-l-2 border-l-indigo-500 text-slate-900"
                              >
                                <div className="space-y-4">
                                  <div className="flex items-center gap-3">
                                    <Building2 className="h-5 w-5 text-indigo-600" />
                                    <p className="text-sm font-bold text-indigo-900">
                                      {uo.organizations?.name}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-widest">
                                    Role: {uo.role}
                                  </p>
                                  <div className="pt-2 border-t border-indigo-100">
                                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                      Your organization provides you with premium access to selected
                                      courses. Check the library for licensed content.
                                    </p>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card className="border-border bg-secondary/10 shadow-none rounded-2xl p-6 text-slate-900">
                            <div className="space-y-3 text-center">
                              <Building2 className="h-8 w-8 text-muted-foreground/20 mx-auto" />
                              <p className="text-[10px] text-muted-foreground font-medium">
                                Not part of an organization.
                              </p>
                            </div>
                          </Card>
                        )}
                      </section>
                    )}

                    {false && !isCreator && !isAdmin && (
                      <section className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-2">
                          Discover
                        </h3>
                        <Card className="border-primary/20 bg-primary/[0.02] shadow-none rounded-2xl p-6 border-l-2 border-l-primary text-slate-900">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <BookOpen className="h-5 w-5 text-primary" />
                              <p className="text-sm font-bold text-foreground">Explore Catalog</p>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                              Find your next challenge in our curated library of expert-led courses.
                            </p>
                            <Button asChild size="sm" className="w-full rounded-lg h-9 font-bold">
                              <Link to="/browse">Browse Courses</Link>
                            </Button>
                          </div>
                        </Card>
                      </section>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* SETTINGS MODAL */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="max-w-md bg-card border-border text-foreground rounded-3xl p-0 overflow-hidden shadow-2xl font-sans">
          <div className="p-8 bg-secondary/20 border-b border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                Account Settings
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium">
                Manage your identity.
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full bg-secondary border-2 border-border overflow-hidden flex items-center justify-center group-hover:border-primary/50 transition-colors shadow-inner">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="h-12 w-12 text-muted-foreground/30" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground cursor-pointer shadow-lg hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all">
                  <Plus className="h-5 w-5" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-slate-900">
                Full Display Name
              </Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="h-12 bg-secondary/30 border-border rounded-xl focus-visible:ring-primary/50 text-slate-900 font-bold"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base shadow-xl shadow-primary/20 transition-all active:scale-95"
              >
                Update Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export const Route = createFileRoute("/dashboard")({
  beforeLoad: async ({ location }) => {
    const session = await getCurrentSession();
    if (!session)
      throw redirect({
        to: "/login",
        search: { mode: "login", redirect: location.href },
      });
  },
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — LearnLab" }] }),
});
