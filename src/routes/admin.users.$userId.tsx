import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Shield,
  Calendar,
  BookOpen,
  ArrowLeft,
  Activity,
  CheckCircle2,
  DollarSign,
  Clock,
  ExternalLink,
  Loader2,
  Zap,
  Users,
  Ban,
  CheckCircle,
  Cpu,
  History,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { fetchUserEnrollments, deleteEnrollment } from "@/lib/enrollments";
import { fetchUserPayments, fetchCreatorSales } from "@/lib/payments";
import { fetchCoursesByCreator } from "@/lib/courses";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getCurrentSession } from "@/lib/auth";
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
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users/$userId")({
  beforeLoad: async ({ location }) => {
    const session = await getCurrentSession();
    if (!session)
      throw redirect({
        to: "/login",
        search: { mode: "login", redirect: location.href },
      });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: UserDetail,
  head: () => ({ meta: [{ title: "User Intelligence — Admin" }] }),
});

function UserDetail() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetch Basic Profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["admin-user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch Enrollments (User as Student)
  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ["admin-user-enrollments", userId],
    queryFn: () => fetchUserEnrollments(userId),
  });

  // 3. Fetch Created Courses (User as Creator)
  const { data: createdCourses = [], isLoading: loadingCreated } = useQuery({
    queryKey: ["admin-user-created-courses", userId],
    queryFn: () => fetchCoursesByCreator(userId),
    enabled: profile?.role === "creator" || profile?.role === "admin",
  });

  // 4. Fetch Payments (Personal Purchases)
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["admin-user-payments", userId],
    queryFn: () => fetchUserPayments(userId),
  });

  // 5. Fetch Sales (Money earned from students)
  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["admin-user-sales", userId],
    queryFn: () => fetchCreatorSales(userId),
    enabled: profile?.role === "creator" || profile?.role === "admin",
  });

  const { data: aiLogs = [], isLoading: loadingAI } = useQuery({
    queryKey: ["admin-user-ai-logs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lessonProgress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ["admin-user-progress", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });

  const updateUserStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-profile", userId] });
      toast.success(`User is now ${status}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action failed"),
  });

  const removeEnrollment = useMutation({
    mutationFn: async (enrollmentId: string) => {
      return await (deleteEnrollment as any)({ data: { enrollmentId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-enrollments", userId] });
      toast.success("Enrollment revoked successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (loadingProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-xl font-bold">User identity not found.</h2>
        <Button asChild variant="link" className="mt-4">
          <Link to="/admin">Back to Registry</Link>
        </Button>
      </div>
    );
  }

  const completedPayments = (Array.isArray(payments) ? payments : []).filter(
    (p) => p.status === "completed",
  );
  const totalSpent = completedPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const completedSales = (Array.isArray(sales) ? sales : []).filter(
    (s) => s.status === "completed",
  );
  const totalEarned = completedSales.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const isCreator = profile.role === "creator" || profile.role === "admin";
  const userStatus = (profile as any).status || "active";

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/10">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              search={{ tab: "users" }}
              className="h-9 w-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-sm">
                {profile.name?.[0] || profile.email?.[0]}
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-foreground">
                  {profile.name || "System User"}
                </h1>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                  Global ID: {profile.id}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userStatus === "active" ? (
              <Button
                variant="destructive"
                className="rounded-xl h-10 px-6 font-bold gap-2 shadow-lg shadow-destructive/20"
                onClick={() => updateUserStatus.mutate("banned")}
                disabled={updateUserStatus.isPending}
              >
                {updateUserStatus.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Ban Account
              </Button>
            ) : (
              <Button
                className="rounded-xl h-10 px-6 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
                onClick={() => updateUserStatus.mutate("active")}
                disabled={updateUserStatus.isPending}
              >
                {updateUserStatus.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Activate Account
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 lg:p-12 space-y-12 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* PROFILE CARD */}
          <Card className="lg:col-span-1 border-border bg-card shadow-sm rounded-[2rem] overflow-hidden h-fit">
            <CardHeader className="bg-secondary/20 p-8 border-b border-border">
              <CardTitle className="text-lg font-bold">Identity Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary/60" /> {profile.email}
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary/60" /> Role:{" "}
                  <Badge
                    className={cn(
                      "ml-1 border-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow-sm",
                      profile.role === "admin"
                        ? "bg-rose-500 shadow-rose-200"
                        : profile.role === "creator"
                          ? "bg-blue-500 shadow-blue-200"
                          : "bg-emerald-500 shadow-emerald-200",
                    )}
                  >
                    {profile.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                  <Activity className="h-4 w-4 text-primary/60" /> Status:{" "}
                  <Badge
                    className={cn(
                      "ml-1 border-none text-[10px] font-black uppercase",
                      (profile as any).status === "active"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {(profile as any).status || "active"}
                  </Badge>
                </div>
              </div>

              <div className="pt-6 border-t border-border space-y-4">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                    {isCreator ? "Lifetime Revenue" : "Lifetime Spending"}
                  </p>
                  <p className="text-3xl font-bold text-foreground tracking-tight">
                    ${(isCreator ? totalEarned : totalSpent).toLocaleString()}
                  </p>
                </div>
                {isCreator && (
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Personal Spending
                    </p>
                    <p className="text-3xl font-bold text-foreground tracking-tight">
                      ${totalSpent.toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                    Courses Enrolled
                  </p>
                  <p className="text-3xl font-bold text-foreground tracking-tight">
                    {enrollments?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                    Completed Lessons
                  </p>
                  <p className="text-3xl font-bold text-foreground tracking-tight">
                    {lessonProgress?.length || 0}
                  </p>
                </div>
                {isCreator && (
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Published Artifacts
                    </p>
                    <p className="text-3xl font-bold text-primary tracking-tight">
                      {createdCourses?.length || 0}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* DATA VIEW */}
          <div className="lg:col-span-2 space-y-10">
            {/* AI ACTIVITY */}
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600/70 flex items-center gap-2">
                <Cpu className="h-4 w-4" /> AI Operations History
              </h3>
              <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-indigo-50/50 border-b border-border">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-black text-[9px] uppercase px-6 py-4">
                          Status
                        </TableHead>
                        <TableHead className="font-black text-[9px] uppercase py-4">
                          Feature
                        </TableHead>
                        <TableHead className="font-black text-[9px] uppercase py-4">
                          Timestamp
                        </TableHead>
                        <TableHead className="font-black text-[9px] uppercase py-4">
                          Trace
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingAI ? (
                        <TableRow>
                          <TableCell colSpan={4} className="p-12 text-center animate-pulse">
                            Loading intelligence logs...
                          </TableCell>
                        </TableRow>
                      ) : (
                        aiLogs.map((log: any) => (
                          <TableRow
                            key={log.id}
                            className="border-border hover:bg-slate-50 transition-colors"
                          >
                            <TableCell className="px-6 py-4">
                              <Badge
                                className={cn(
                                  "border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                  log.response_status === 200
                                    ? "bg-emerald-500 text-white"
                                    : "bg-rose-500 text-white",
                                )}
                              >
                                {log.response_status === 200 ? "OK" : "ERR"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[10px] font-bold uppercase">
                              {log.feature}
                            </TableCell>
                            <TableCell className="text-[10px] font-medium text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-[10px] font-medium text-slate-500 line-clamp-1 max-w-[200px]">
                              {log.prompt}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {aiLogs.length === 0 && !loadingAI && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="p-8 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest"
                          >
                            No AI activity recorded.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </section>
            {/* CREATED COURSES (IF CREATOR) */}
            ...
            {isCreator && (
              <section className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/70 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Authored Content
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loadingCreated
                    ? [1, 2].map((i) => (
                        <div key={i} className="h-24 bg-secondary/50 rounded-2xl animate-pulse" />
                      ))
                    : (createdCourses || []).map((c: any) => (
                        <Card
                          key={c.id}
                          className="border-border bg-card shadow-sm rounded-2xl hover:bg-slate-50 transition-colors"
                        >
                          <CardContent className="p-5 flex gap-4 items-center">
                            <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10">
                              {c.imageUrl ? (
                                <img src={c.imageUrl} className="h-full w-full object-cover" />
                              ) : (
                                <BookOpen className="h-5 w-5 text-primary/30" />
                              )}
                            </div>
                            <div className="min-0 flex-1">
                              <p className="font-bold text-sm text-foreground truncate">
                                {c.title}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge className="bg-secondary text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2 py-0.5 rounded-md">
                                  {c.status}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                  <Users className="h-3 w-3" /> {c.students}
                                </span>
                              </div>
                            </div>
                            <Link
                              to="/courses/$courseId"
                              params={{ courseId: c.id }}
                              className="text-slate-300 hover:text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                  {(!createdCourses || createdCourses.length === 0) && !loadingCreated && (
                    <div className="col-span-full p-12 text-center border-2 border-dashed rounded-3xl bg-primary/5 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                      No authored content found.
                    </div>
                  )}
                </div>
              </section>
            )}
            {/* ENROLLMENTS */}
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Active Enrollments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loadingEnrollments
                  ? [1, 2].map((i) => (
                      <div key={i} className="h-24 bg-secondary/50 rounded-2xl animate-pulse" />
                    ))
                  : (enrollments || []).map((en: any) => (
                      <Card
                        key={en.id}
                        className="border-border bg-card shadow-sm rounded-2xl hover:bg-slate-50 transition-colors"
                      >
                        <CardContent className="p-5 flex gap-4 items-center">
                          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                            {en.course?.imageUrl ? (
                              <img
                                src={en.course.imageUrl}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.src = "/avatars/LEARNLAB.png";
                                }}
                              />
                            ) : (
                              <img
                                src="/avatars/LEARNLAB.png"
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-0 flex-1">
                            <p className="font-bold text-sm text-foreground truncate">
                              {en.course?.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">
                              Enrolled: {new Date(en.enrolled_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-300 hover:text-destructive transition-colors"
                                  disabled={removeEnrollment.isPending}
                                >
                                  {removeEnrollment.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-[2rem] border-none p-10 shadow-2xl">
                                <AlertDialogHeader>
                                  <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                                    <AlertCircle className="h-6 w-6" />
                                  </div>
                                  <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic">
                                    Revoke <span className="text-destructive">Access</span>
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-base font-medium text-slate-500 mt-2">
                                    Are you sure you want to revoke access to{" "}
                                    <span className="font-bold text-slate-900">
                                      "{en.course?.title}"
                                    </span>
                                    ? This user will lose all access to the curriculum immediately.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-8 gap-3">
                                  <AlertDialogCancel className="h-12 rounded-xl font-bold border-slate-100 hover:bg-slate-50">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="h-12 rounded-xl bg-destructive text-white hover:bg-destructive/90 font-bold px-8"
                                    onClick={() => removeEnrollment.mutate(en.id)}
                                  >
                                    Confirm Revocation
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Link
                              to="/courses/$courseId"
                              params={{ courseId: en.course?.id }}
                              className="text-slate-300 hover:text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                {(!enrollments || enrollments.length === 0) && !loadingEnrollments && (
                  <div className="col-span-full p-12 text-center border-2 border-dashed rounded-3xl bg-secondary/10 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                    No active learning paths.
                  </div>
                )}
              </div>
            </section>
            {/* TRANSACTIONS */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Financial Activity
                </h3>
                {isCreator && (
                  <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest">
                    Showing Purchases & Sales
                  </Badge>
                )}
              </div>

              <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-secondary/30 border-b border-border">
                      <tr>
                        <th className="font-black text-[9px] uppercase text-muted-foreground p-4 px-6">
                          Date
                        </th>
                        <th className="font-black text-[9px] uppercase text-muted-foreground p-4">
                          Type
                        </th>
                        <th className="font-black text-[9px] uppercase text-muted-foreground p-4">
                          Course
                        </th>
                        <th className="font-black text-[9px] uppercase text-muted-foreground p-4">
                          Amount
                        </th>
                        <th className="font-black text-[9px] uppercase text-muted-foreground p-4">
                          User
                        </th>
                        <th className="font-black text-[9px] uppercase text-muted-foreground p-4">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loadingPayments || loadingSales
                        ? [1, 2, 3].map((i) => (
                            <tr key={i}>
                              <td colSpan={6} className="p-4 animate-pulse bg-secondary/20 h-12" />
                            </tr>
                          ))
                        : (() => {
                            const allTransactions = [
                              ...(payments || []).map((p: any) => ({
                                ...p,
                                transactionType: "PURCHASE",
                              })),
                              ...(sales || []).map((s: any) => ({
                                ...s,
                                transactionType: "SALE",
                              })),
                            ].sort(
                              (a, b) =>
                                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                            );

                            if (allTransactions.length === 0) {
                              return (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="p-12 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest"
                                  >
                                    No financial activity recorded.
                                  </td>
                                </tr>
                              );
                            }

                            return allTransactions.map((tx: any) => (
                              <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 px-6 text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                                  {new Date(tx.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-4">
                                  <Badge
                                    className={cn(
                                      "border-none text-[8px] font-black uppercase px-2 py-0.5",
                                      tx.transactionType === "PURCHASE"
                                        ? "bg-slate-100 text-slate-600"
                                        : "bg-primary/10 text-primary",
                                    )}
                                  >
                                    {tx.transactionType}
                                  </Badge>
                                </td>
                                <td className="p-4 text-sm font-bold text-slate-700 truncate max-w-[200px]">
                                  {tx.courses?.title || tx.course?.title || "License"}
                                </td>
                                <td
                                  className={cn(
                                    "p-4 text-sm font-black",
                                    tx.transactionType === "PURCHASE"
                                      ? "text-slate-600"
                                      : "text-emerald-600",
                                  )}
                                >
                                  {tx.transactionType === "PURCHASE" ? "-" : "+"}${tx.amount}
                                </td>
                                <td className="p-4 text-[10px] font-bold text-muted-foreground">
                                  {tx.transactionType === "PURCHASE"
                                    ? "Self"
                                    : tx.profiles?.name || tx.profiles?.email || "Student"}
                                </td>
                                <td className="p-4">
                                  <Badge
                                    className={cn(
                                      "border-none text-[9px] font-black uppercase",
                                      tx.status === "completed"
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : "bg-amber-500/10 text-amber-600",
                                    )}
                                  >
                                    {tx.status}
                                  </Badge>
                                </td>
                              </tr>
                            ));
                          })()}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
