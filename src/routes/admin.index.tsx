import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  BookOpen,
  DollarSign,
  Activity,
  ShieldCheck,
  LayoutDashboard,
  BarChart2,
  Building2,
  Ban,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Ticket,
  Calendar,
  Trash2,
  Zap,
  Settings,
  Edit3,
  ArrowLeft,
  Sparkles,
  Eye,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  TrendingUp,
  Loader2,
  ChevronDown,
  Clock,
  Download,
  MessageSquare,
  Upload,
  Cpu,
  History,
  AlertTriangle,
  Send,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth, getCurrentSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { mapCourse, type Course, fetchCourses, isSaleActive } from "@/lib/courses";
import { toast } from "sonner";
import { fetchCoupons, createCoupon, deleteCoupon } from "@/lib/coupons";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { COURSE_CATEGORIES } from "@/lib/config";
import { fetchPlatformStats, fetchRevenueByMonth, fetchRevenueByDay } from "@/lib/admin";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

import { fetchAllReports, updateReportStatus, deleteReport } from "@/lib/moderation";
import { deleteCourse, updateCourse } from "@/lib/courses";
import { checkPlagiarism } from "@/lib/plagiarism";
import { fetchAllPayments } from "@/lib/admin";
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
  fetchAllSupportThreads,
  fetchSupportThreadMessages,
  sendSupportMessage,
  updateSupportThreadStatus,
  processRefund,
  deletePaymentRecord,
  deletePaymentRecords,
} from "@/lib/support";
import {
  removeCourseFromMember,
  repairMissingPackages,
  assignCourseToMember,
  provisionFreeCourseToOrg,
  fetchUserOrganizations,
  deleteOrganization,
  inviteMemberToOrg,
} from "@/lib/organizations";

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: "student" | "creator" | "admin";
  status: "active" | "banned";
};

import { z } from "zod";

const adminSearchSchema = z.object({
  tab: z.string().catch("overview").optional(),
});

export const Route = createFileRoute("/admin/")({
  validateSearch: (search) => adminSearchSchema.parse(search),
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
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Admin Workspace — LearnLab" }] }),
});

function AdminDashboard() {
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate();
  const { user, profile, loading, signOut: authSignOut } = useAuth();
  const queryClient = useQueryClient();
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null);
  const isExpanded = isSidebarOpen || isHovered;

  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [usageLimit, setUsageLimit] = useState(0);
  const [expiryDate, setExpiryAt] = useState("");

  const [selectedMonth, setSelectedMonth] = useState<{
    year: number;
    month: number;
    name: string;
  } | null>(null);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchPlatformStats,
  });

  const { data: revenueByMonth = [] } = useQuery({
    queryKey: ["admin-revenue-monthly"],
    queryFn: () => fetchRevenueByMonth(),
  });

  const { data: revenueByDay = [], isLoading: loadingDaily } = useQuery({
    queryKey: ["admin-revenue-daily", selectedMonth?.year, selectedMonth?.month],
    queryFn: () =>
      (fetchRevenueByDay as any)({
        data: { year: selectedMonth!.year, month: selectedMonth!.month },
      }),
    enabled: !!selectedMonth,
  });
  const { data: allPayments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["admin-all-payments"],
    queryFn: () => fetchAllPayments(),
  });

  const { data: platformSettings = [] } = useQuery<any[]>({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const platformFeeRaw = platformSettings?.find((s) => s.key === "platform_revenue_share")?.value;
  const platformFee = platformFeeRaw ? Number(platformFeeRaw) : 30;
  const creatorShareRatio = (100 - platformFee) / 100;
  const platformShareRatio = platformFee / 100;

  const groupedTotals = useMemo(() => {
    const totals: Record<string, { creator: number; platform: number; gross: number }> = {};
    let totalGrossUSD = 0;
    const EXCHANGE_RATE_THB_TO_USD = 1 / 35;

    allPayments
      .filter((p: any) => p.status === "completed")
      .forEach((p: any) => {
        const currency = (p.currency || "usd").toLowerCase();
        const feePercent =
          p.platform_fee_percent !== undefined && p.platform_fee_percent !== null
            ? p.platform_fee_percent
            : platformFee;
        const creatorRatio = (100 - feePercent) / 100;
        const platformRatio = feePercent / 100;

        if (!totals[currency]) totals[currency] = { creator: 0, platform: 0, gross: 0 };
        totals[currency].creator += p.amount * creatorRatio;
        totals[currency].platform += p.amount * platformRatio;
        totals[currency].gross += p.amount;

        if (currency === "thb") {
          totalGrossUSD += p.amount * EXCHANGE_RATE_THB_TO_USD;
        } else {
          totalGrossUSD += p.amount;
        }
      });
    return { breakdown: totals, totalGrossUSD };
  }, [allPayments, platformFee]);

  const { data: coupons = [] } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => fetchCoupons(),
  });

  const { data: allReports = [] } = useQuery({
    queryKey: ["admin-all-reports"],
    queryFn: fetchAllReports,
  });

  const { data: allThreads = [] } = useQuery({
    queryKey: ["admin-support-threads"],
    queryFn: fetchAllSupportThreads,
  });

  const activeCouponsCount = coupons.length;

  // --- INDIVIDUAL THREAD UNREAD LOGIC (ADMIN) ---
  const [threadViews, setThreadViews] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(`admin_support_views`) || "{}");
    } catch {
      return {};
    }
  });

  const markThreadRead = useCallback((threadId: string) => {
    const now = Date.now();
    setThreadViews((prev) => {
      const next = { ...prev, [threadId]: now };
      localStorage.setItem(`admin_support_views`, JSON.stringify(next));
      return next;
    });
  }, []);

  const [lastOpenedModeration, setLastOpenedModeration] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(`admin_moderation_last_opened`) || 0);
  });

  const openSupportCount = useMemo(() => {
    if (!Array.isArray(allThreads) || !user?.id) return 0;

    return allThreads.filter((t: any) => {
      if (t.status === "closed") return false;

      // UX-W025: Only count if last message was NOT from an admin
      if (!t.lastMessage) return false;

      const lastSenderId = String(t.lastMessage.sender_id);
      const myId = String(user.id);
      if (lastSenderId === myId) return false;

      const lastViewed = threadViews[t.id] || 0;
      const lastActivity = new Date(t.lastMessage.created_at).getTime();

      return lastActivity > lastViewed + 2000;
    }).length;
  }, [allThreads, user?.id, threadViews]);

  const pendingReportsCount = allReports.filter(
    (r: any) =>
      r.status === "pending" &&
      r.created_at &&
      new Date(r.created_at).getTime() > lastOpenedModeration,
  ).length;

  useEffect(() => {
    if (tab === "moderation") {
      const now = Date.now();
      setLastOpenedModeration(now);
      localStorage.setItem(`admin_moderation_last_opened`, now.toString());
    }
  }, [tab]);
  // ------------------------------------------

  // UX-W022: Admin Alerts for pending items
  useEffect(() => {
    if (loadingStats) return;

    if (openSupportCount > 0 || pendingReportsCount > 0) {
      toast.message("Attention Required", {
        description: `You have ${openSupportCount} open support tickets and ${pendingReportsCount} pending moderation reports.`,
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        action: {
          label: "View Support",
          onClick: () => navigate({ search: { tab: "support" } as any }),
        },
      });
    }
  }, [openSupportCount, pendingReportsCount, loadingStats, navigate]);

  // UX-W022: Live real-time database alerts for support tickets and course reports
  useEffect(() => {
    const reportsChannel = supabase
      .channel("admin-realtime-reports")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        async (payload) => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          queryClient.invalidateQueries({ queryKey: ["admin-reports"] });

          toast.message("New Course Report", {
            description: `A course has been reported: "${payload.new.reason || "No reason specified"}".`,
            icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
            action: {
              label: "Moderate",
              onClick: () => navigate({ search: { tab: "moderation" } as any }),
            },
          });
        },
      )
      .subscribe();

    const supportChannel = supabase
      .channel("admin-realtime-support")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        async (payload) => {
          queryClient.invalidateQueries({ queryKey: ["admin-support-threads"] });

          toast.message("New Support Message", {
            description: `New support message received.`,
            icon: <MessageSquare className="h-4 w-4 text-blue-500" />,
            action: {
              label: "Reply",
              onClick: () => navigate({ search: { tab: "support" } as any }),
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(supportChannel);
    };
  }, [queryClient, navigate]);

  const couponMutation = useMutation({
    mutationFn: async () => {
      if (discountAmount <= 0) {
        throw new Error("Discount amount must be greater than 0");
      }
      if (discountType === "percentage" && discountAmount > 100) {
        throw new Error("Percentage discount cannot exceed 100%");
      }
      return createCoupon({
        code: couponCode,
        discountAmount,
        discountType,
        usageLimit,
        expiresAt: expiryDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Campaign launched!");
      setCouponCode("");
      setDiscountAmount(0);
      setUsageLimit(0);
      setExpiryAt("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Campaign failed"),
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon revoked");
    },
  });

  const updateProfileTier = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ subscription_tier: tier })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User tier updated");
    },
  });

  const isAdmin = profile?.role === "admin";

  const handleSignOut = async () => {
    try {
      await authSignOut();
      void navigate({ to: "/login", search: { mode: "login" } });
      toast.success("Signed out");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const {
    data: users = [],
    isLoading: loadingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["admin-users"],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return (data || []).map((u) => ({
        id: u.id,
        name: u.name || null,
        email: u.email || `${u.id.slice(0, 8)}@user.lab`,
        role: u.role || "student",
        status: u.status || "active",
        subscription_tier: u.subscription_tier || "free",
      })) as any[];
    },
  });

  const {
    data: courses = [] as Course[],
    isLoading: loadingCourses,
    refetch: refetchCourses,
  } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => fetchCourses(true),
  });

  const handleRefresh = () => {
    void refetchUsers();
    void refetchCourses();
    void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    toast.info("Refreshing system state...");
  };

  const updateCourseStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      isFeatured,
      isOnSale,
      salePrice,
      saleExpiresAt,
      adType,
      isCampaignActive,
    }: {
      id: string;
      status: string;
      isFeatured?: boolean;
      isOnSale?: boolean;
      salePrice?: number;
      saleExpiresAt?: string | null;
      adType?: string | null;
      isCampaignActive?: boolean;
    }) => {
      await (updateCourse as any)({
        data: {
          id,
          updates: {
            status,
            isFeatured,
            isOnSale,
            salePrice,
            saleExpiresAt,
            adType,
            isCampaignActive,
          },
          userId: user?.id,
        },
      });
    },
    onMutate: async (newConfig) => {
      await queryClient.cancelQueries({ queryKey: ["admin-courses"] });
      const previousCourses = queryClient.getQueryData(["admin-courses"]);

      queryClient.setQueryData(["admin-courses"], (old: any) => {
        return (old || []).map((c: any) => {
          if (c.id === newConfig.id) {
            // Create a clean updates object without undefined values
            const updates: any = {};
            (Object.keys(newConfig) as Array<keyof typeof newConfig>).forEach((key) => {
              if (newConfig[key] !== undefined) {
                updates[key] = newConfig[key];
              }
            });
            return { ...c, ...updates };
          }
          return c;
        });
      });

      return { previousCourses };
    },
    onError: (err: any, newConfig, context) => {
      queryClient.setQueryData(["admin-courses"], context?.previousCourses);
      console.error("Course Update Error:", err);
      toast.error(err.message || "Failed to update course");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Course configuration updated");
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated");
    },
  });

  const updateUserStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User status updated");
    },
  });

  const refundMutation = useMutation({
    mutationFn: (paymentId: string) => (processRefund as any)({ data: { paymentId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-revenue-monthly"] });
      toast.success("Payment refunded and access revoked successfully.");
    },
    onError: (err: any) => toast.error(err.message || "Refund failed"),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => (deletePaymentRecord as any)({ data: { paymentId: id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Transaction record deleted");
    },
    onError: (err: any) => toast.error(err.message || "Delete failed"),
  });

  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => (deletePaymentRecords as any)({ data: { paymentIds: ids } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(`${selectedPayments.length} records deleted successfully`);
      setSelectedPayments([]);
    },
    onError: (err: any) => toast.error(err.message || "Bulk delete failed"),
  });

  const toggleSelectPayment = (id: string) => {
    setSelectedPayments((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedPayments.length === allPayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(allPayments.map((p: any) => p.id));
    }
  };

  const [courseSearchTerm, setCourseSearchTerm] = useState("");
  const [courseCategoryFilter, setCourseCategoryFilter] = useState("all");
  const [courseSortBy, setCourseSortBy] = useState<"newest" | "students" | "price">("newest");
  const [courseCurrentPage, setCourseCurrentPage] = useState(1);

  useEffect(() => {
    setCourseCurrentPage(1);
  }, [courseSearchTerm, courseCategoryFilter, courseSortBy]);

  const filteredCoursesList = useMemo(() => {
    const list = (courses as Course[]).filter((c: Course) => {
      const matchesSearch = c.title.toLowerCase().includes(courseSearchTerm.toLowerCase());
      const matchesCategory = courseCategoryFilter === "all" || c.category === courseCategoryFilter;
      return matchesSearch && matchesCategory;
    });

    return [...list].sort((a, b) => {
      if (courseSortBy === "students") return (b.students || 0) - (a.students || 0);
      if (courseSortBy === "price") return (b.price || 0) - (a.price || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [courses, courseSearchTerm, courseCategoryFilter, courseSortBy]);

  const ITEMS_PER_PAGE = 6;
  const paginatedCourses = useMemo(() => {
    const startIndex = (courseCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredCoursesList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCoursesList, courseCurrentPage]);

  const totalCoursePages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredCoursesList.length / ITEMS_PER_PAGE));
  }, [filteredCoursesList]);

  const getSetting = (key: string) => platformSettings?.find((s) => s.key === key)?.value;

  return (
    <div className="flex min-h-screen bg-background font-sans selection:bg-primary/10">
      {/* SIDEBAR */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-350",
          "border-r border-white/5",
          "bg-[#0d0d14]",
          isExpanded ? "w-[240px]" : "w-[72px]",
        )}
        style={{ transition: "width 0.35s cubic-bezier(0.23,1,0.32,1)" }}
        onMouseEnter={() => !isSidebarOpen && setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setTooltip(null);
        }}
      >
        {/* Top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,91,255,0.18),transparent_70%)]" />

        {/* Logo */}
        <div
          className={cn(
            "relative flex h-[72px] flex-shrink-0 items-center px-4",
            isExpanded ? "justify-start" : "justify-center",
          )}
        >
          <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#635bff] to-[#9f6eff] shadow-[0_0_24px_rgba(99,91,255,0.35)]">
            <ShieldCheck className="h-[18px] w-[18px] text-white" />
          </div>
          <div
            className={cn(
              "ml-2.5 overflow-hidden transition-all duration-300",
              isExpanded ? "w-[130px] opacity-100" : "w-0 opacity-0",
            )}
          >
            <p className="whitespace-nowrap text-[13px] font-bold leading-none text-white">
              Admin Core
            </p>
            <p className="mt-[3px] whitespace-nowrap text-[10px] tracking-[0.06em] text-white/30">
              v4.2 · OPTIMIZED
            </p>
          </div>
        </div>

        {/* Divider */}
        <div
          className={cn(
            "mx-auto mb-3 h-px flex-shrink-0 bg-white/[0.07] transition-all duration-300",
            isExpanded ? "w-[calc(100%-32px)]" : "w-8",
          )}
        />

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            {
              section: "Main",
              items: [
                { value: "overview", icon: LayoutDashboard, label: "Overview" },
                { value: "users", icon: Users, label: "Identity" },
                { value: "courses", icon: BookOpen, label: "Catalog" },
              ],
            },
            {
              section: "Revenue",
              items: [
                {
                  value: "coupons",
                  icon: Ticket,
                  label: "Campaigns",
                  tag: activeCouponsCount > 0 ? activeCouponsCount.toString() : null,
                },
                { value: "financials", icon: BarChart2, label: "Financials" },
              ],
            },
            {
              section: "Operations",
              items: [
                { value: "b2b", icon: Building2, label: "Enterprise" },
                {
                  value: "support",
                  icon: MessageSquare,
                  label: "Support",
                  badge: openSupportCount > 0 ? openSupportCount.toString() : null,
                },
                { value: "ai-control", icon: Cpu, label: "AI Cockpit", tag: "β" },
                {
                  value: "moderation",
                  icon: ShieldCheck,
                  label: "Safety",
                  badge: pendingReportsCount > 0 ? pendingReportsCount.toString() : null,
                },
                { value: "settings", icon: Settings, label: "Platform" },
              ],
            },
          ].map(({ section, items }) => (
            <div key={section}>
              {/* Section label */}
              <div
                className={cn(
                  "overflow-hidden px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white/20 transition-all duration-200",
                  isExpanded ? "mb-1 mt-2 h-5 opacity-100" : "h-0 opacity-0",
                )}
              >
                {section}
              </div>

              {items.map((item) => {
                const Icon = item.icon;
                const isActive = tab === item.value;
                return (
                  <div key={item.value} className="relative">
                    <button
                      onClick={() => navigate({ search: { tab: item.value } as any })}
                      onMouseEnter={(e) => {
                        if (!isExpanded) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ label: item.label, y: rect.top + rect.height / 2 });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      className={cn(
                        "relative flex h-[42px] w-full items-center overflow-hidden rounded-[10px] px-[11px] transition-all duration-200",
                        isActive
                          ? "bg-[rgba(99,91,255,0.15)] text-white"
                          : "text-white/40 hover:bg-white/5 hover:text-white/80",
                      )}
                    >
                      {/* Active left bar */}
                      {isActive && (
                        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-[#635bff] to-[#9f6eff]" />
                      )}

                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] flex-shrink-0",
                          isActive && "text-[#7b74ff]",
                        )}
                      />

                      <span
                        className={cn(
                          "ml-2.5 whitespace-nowrap text-[13px] font-medium transition-all duration-300",
                          isExpanded ? "max-w-[120px] opacity-100" : "max-w-0 opacity-0",
                        )}
                      >
                        {item.label}
                      </span>

                      {/* Badge (red) */}
                      {"badge" in item && item.badge && (
                        <span
                          className={cn(
                            "ml-auto flex-shrink-0 overflow-hidden rounded-[5px] bg-red-500/90 px-[5px] py-px text-[9px] font-bold text-white transition-all duration-300",
                            isExpanded ? "max-w-[40px] opacity-100" : "max-w-0 opacity-0",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Tag (purple) */}
                      {"tag" in item && item.tag && (
                        <span
                          className={cn(
                            "ml-auto flex-shrink-0 overflow-hidden rounded-[5px] bg-[rgba(99,91,255,0.25)] px-[6px] py-px text-[9px] font-bold text-[#9f93ff] transition-all duration-300",
                            isExpanded ? "max-w-[40px] opacity-100" : "max-w-0 opacity-0",
                          )}
                        >
                          {item.tag}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom area */}
        <div className="flex flex-shrink-0 flex-col gap-1.5 p-2.5">
          {/* Toggle pin */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex h-9 w-full items-center justify-center gap-2 overflow-hidden rounded-[9px] border border-white/[0.08] bg-white/[0.03] text-white/30 transition-all hover:bg-white/[0.06] hover:text-white/60"
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
            ) : (
              <PanelLeft className="h-4 w-4 flex-shrink-0" />
            )}
            <span
              className={cn(
                "whitespace-nowrap text-[11px] font-semibold transition-all duration-300",
                isExpanded ? "max-w-[120px] opacity-100" : "max-w-0 opacity-0",
              )}
            >
              {isSidebarOpen ? "Collapse" : "Pin open"}
            </span>
          </button>

          {/* Divider */}
          <div className="my-1 h-px w-full bg-white/[0.06]" />

          {/* User row */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2.5 overflow-hidden rounded-[10px] p-2 transition-all hover:bg-white/5",
                  isExpanded ? "w-full" : "justify-center",
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#635bff] to-[#c084fc] text-[12px] font-bold text-white">
                    {profile?.name?.[0] || "A"}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full border-2 border-[#0d0d14] bg-emerald-500" />
                </div>

                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    isExpanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0",
                  )}
                >
                  <p className="whitespace-nowrap text-[12px] font-semibold leading-none text-white">
                    {profile?.name || "Administrator"}
                  </p>
                  <p className="mt-1 whitespace-nowrap text-[10px] text-white/30">Root Access</p>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="right"
              align="end"
              className="w-56 rounded-2xl border border-white/10 bg-[#16161f] p-2 shadow-2xl"
            >
              <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem
                asChild
                className="cursor-pointer rounded-xl px-3 py-2.5 focus:bg-white/5"
              >
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 text-white/60 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-[12px] font-medium">Main Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-xl px-3 py-2.5 text-red-400 focus:bg-red-500/10 focus:text-red-400"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span className="text-[12px] font-medium">Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main
        className={cn(
          "flex-1 transition-all duration-500 min-h-screen",
          isSidebarOpen ? "ml-[240px]" : "ml-[72px]",
        )}
      >
        {tooltip && (
          <div
            className="pointer-events-none fixed left-[82px] z-[999] -translate-y-1/2 rounded-lg border border-white/10 bg-[#1a1a24] px-3 py-1.5 text-[11px] font-semibold text-white/70 shadow-2xl"
            style={{ top: tooltip.y }}
          >
            {tooltip.label}
          </div>
        )}
        <div className="p-4 md:p-12 max-w-7xl mx-auto w-full">
          <Tabs value={tab} className="space-y-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  className="h-12 w-12 rounded-2xl border-border bg-white hover:bg-secondary shadow-sm transition-all group"
                >
                  <Activity
                    className={cn(
                      "h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors",
                      (loadingUsers || loadingCourses || loadingStats) && "animate-spin",
                    )}
                  />
                </Button>
                <div className="hidden lg:flex text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-5 py-2.5 rounded-2xl border border-emerald-500/20 items-center gap-3 shadow-inner">
                  <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse shadow-[0_0_10px_rgba(5,150,105,0.4)]" />
                  SYSTEM CLUSTER: OPTIMIZED
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-border/40 shadow-sm">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 h-10 rounded-xl bg-secondary/50 text-muted-foreground hover:text-foreground font-bold text-[11px] uppercase tracking-widest transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
                </Link>
              </div>
            </div>

            {/* OVERVIEW */}
            <TabsContent value="overview">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12 pb-32"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    Platform Analytics
                  </h2>
                  <p className="text-muted-foreground font-medium">
                    Real-time performance metrics and business intelligence across the ecosystem.
                  </p>
                </div>

                {/* Standalone Gross Revenue Hero Card (UX-W019) */}
                <Card className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white shadow-2xl shadow-emerald-950/20 rounded-3xl p-8 transition-all hover:shadow-emerald-950/30">
                  {/* Decorative glowing blobs */}
                  <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
                  <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />

                  <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                          <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-emerald-400/80">
                            Ecosystem GMV
                          </p>
                          <h3 className="text-xl font-bold tracking-tight text-white">
                            Gross Revenue
                          </h3>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 max-w-md">
                        Total volume generated across all successful credit card, PromptPay, and
                        enterprise seat sales.
                      </p>
                    </div>

                    <div className="flex flex-col items-start md:items-end justify-center space-y-4">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400 block md:text-right">
                          Total (USD Equivalent)
                        </span>
                        <p className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                          $
                          {(stats?.totalRevenue || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      {stats?.revenueByCurrency &&
                        Object.keys(stats.revenueByCurrency).length > 0 && (
                          <div className="flex flex-wrap gap-3 bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                            {Object.entries(stats.revenueByCurrency).map(([curr, amt]) => (
                              <div
                                key={curr}
                                className="flex items-center gap-1.5 px-2 py-0.5 border-r border-white/10 last:border-0 pr-3 last:pr-0"
                              >
                                <span className="text-[10px] font-black uppercase text-emerald-400">
                                  {curr}
                                </span>
                                <span className="text-xs font-bold text-white">
                                  {curr.toUpperCase() === "THB" ? "฿" : "$"}
                                  {(amt as number).toLocaleString(undefined, {
                                    minimumFractionDigits: curr.toUpperCase() === "THB" ? 0 : 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: "Active Members",
                      value: stats?.totalUsers || 0,
                      icon: Users,
                      color: "text-blue-600",
                      bg: "bg-blue-500/10",
                    },
                    {
                      label: "Course Catalog",
                      value: stats?.totalCourses || 0,
                      icon: BookOpen,
                      color: "text-primary",
                      bg: "bg-primary/10",
                    },
                    {
                      label: "Conversion Rate",
                      value: stats?.conversionRate || "0%",
                      icon: TrendingUp,
                      color: "text-indigo-600",
                      bg: "bg-indigo-500/10",
                    },
                    {
                      label: "Avg. Engagement",
                      value: stats?.engagement || "0%",
                      icon: Clock,
                      color: "text-purple-600",
                      bg: "bg-purple-500/10",
                    },
                  ].map((s, i) => (
                    <Card
                      key={i}
                      className={cn(
                        "border-border/40 bg-card shadow-sm rounded-2xl hover:shadow-md transition-all",
                        (s as any).className,
                      )}
                    >
                      <CardContent className="p-6">
                        <div
                          className={cn(
                            "p-2.5 rounded-xl w-fit mb-4 border border-border/50",
                            s.bg,
                            s.color,
                          )}
                        >
                          <s.icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            {s.label}
                          </p>
                          <p className="text-3xl font-bold tracking-tight">{s.value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* REVENUE CHART */}
                <Card className="border-border/40 bg-card shadow-sm rounded-3xl overflow-hidden">
                  <CardHeader className="p-8 border-b border-border flex flex-row items-center justify-between bg-secondary/10">
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">
                        {selectedMonth
                          ? `Revenue: ${selectedMonth.name} ${selectedMonth.year}`
                          : "Revenue Analytics"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground font-medium mt-1">
                        {selectedMonth
                          ? "Daily breakdown of transaction volume"
                          : "Global transaction volume across all creators"}
                      </p>
                    </div>
                    {selectedMonth ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMonth(null)}
                        className="gap-2 rounded-xl font-bold border-border hover:bg-secondary"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back to Monthly
                      </Button>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-7 px-3 rounded-lg bg-background font-black text-[9px] uppercase tracking-widest gap-2"
                      >
                        <TrendingUp className="h-3 w-3 text-emerald-500" /> +12.4% Increase
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-10">
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={
                            selectedMonth
                              ? revenueByDay
                              : revenueByMonth.length > 0
                                ? revenueByMonth
                                : [{ name: "Current", total: stats?.totalRevenue || 0 }]
                          }
                        >
                          <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={10}
                            fontWeight="black"
                            axisLine={false}
                            tickLine={false}
                            label={
                              selectedMonth
                                ? {
                                    value: "Day of Month",
                                    position: "insideBottom",
                                    offset: -5,
                                    fontSize: 10,
                                    fontWeight: "black",
                                  }
                                : undefined
                            }
                          />
                          <YAxis
                            stroke="#888888"
                            fontSize={10}
                            fontWeight="black"
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(99, 102, 241, 0.05)" }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-4 border border-border shadow-2xl rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                      {selectedMonth
                                        ? `Day ${payload[0].payload.name}`
                                        : payload[0].payload.name}
                                    </p>
                                    <p className="text-lg font-black text-primary">
                                      ${payload[0].value?.toLocaleString()}
                                    </p>
                                    {!selectedMonth && (
                                      <p className="text-[8px] font-bold text-muted-foreground mt-2 animate-pulse">
                                        Click to view daily details
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="total"
                            fill="hsl(var(--primary))"
                            radius={[6, 6, 0, 0]}
                            barSize={selectedMonth ? 15 : 40}
                            onClick={(data) => {
                              if (!selectedMonth && data && data.year !== undefined) {
                                setSelectedMonth({
                                  year: data.year,
                                  month: data.month,
                                  name: data.name,
                                });
                              }
                            }}
                            className={cn(
                              !selectedMonth &&
                                "cursor-pointer transition-opacity hover:opacity-80",
                            )}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* IDENTITY / USERS */}
            <TabsContent value="users">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 pb-32"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">
                      User Directory
                    </h2>
                    <p className="text-muted-foreground font-medium">
                      Manage platform access, roles, and security status for all members.
                    </p>
                  </div>
                  <div className="flex gap-2 bg-secondary/30 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm shadow-inner">
                    {["all", "admin", "creator", "student"].map((role) => (
                      <Button
                        key={role}
                        variant={selectedRole === role ? "default" : "ghost"}
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                          "h-10 px-6 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all whitespace-nowrap",
                          selectedRole === role
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm",
                        )}
                      >
                        {role}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search by name, email, or unique ID..."
                    className="pl-14 h-16 bg-white border-border shadow-sm rounded-[1.25rem] text-lg focus-visible:ring-primary/40 focus-visible:ring-offset-0 transition-all border-2 group-hover:border-primary/20"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                </div>

                <Card className="border-border/50 shadow-xl rounded-[2rem] overflow-hidden bg-white/50 backdrop-blur-sm">
                  <Table>
                    <TableHeader className="bg-secondary/20 border-b border-border">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest py-4 px-6">
                          Profile
                        </TableHead>
                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest py-4">
                          Security Role
                        </TableHead>
                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest py-4">
                          Status
                        </TableHead>
                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest py-4">
                          Plan Tier
                        </TableHead>
                        <TableHead className="text-right font-black text-[10px] text-muted-foreground uppercase tracking-widest py-4 px-6">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users
                        .filter((u) => {
                          const matchesSearch = (u.name || u.email || "")
                            .toLowerCase()
                            .includes(userSearchTerm.toLowerCase());
                          const matchesRole = selectedRole === "all" || u.role === selectedRole;
                          return matchesSearch && matchesRole;
                        })
                        .map((u) => (
                          <TableRow
                            key={u.id}
                            className="border-border hover:bg-slate-50 transition-colors cursor-pointer group"
                            onClick={() =>
                              navigate({ to: "/admin/users/$userId", params: { userId: u.id } })
                            }
                          >
                            <TableCell className="py-4 px-6">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-secondary border border-border flex items-center justify-center font-bold text-muted-foreground group-hover:border-primary/40 transition-colors">
                                  {u.name?.[0] || u.email?.[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-sm group-hover:text-primary transition-colors">
                                    {u.name || "Unnamed User"}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground font-medium">
                                    {u.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 px-2.5 rounded-lg border border-border/50 bg-background hover:bg-secondary gap-2 group/role"
                                  >
                                    <Badge
                                      className={cn(
                                        "border-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest transition-colors",
                                        u.role === "admin"
                                          ? "bg-rose-500 text-white shadow-sm shadow-rose-200"
                                          : u.role === "creator"
                                            ? "bg-blue-500 text-white shadow-sm shadow-blue-200"
                                            : "bg-emerald-500 text-white shadow-sm shadow-emerald-200",
                                      )}
                                    >
                                      {u.role}
                                    </Badge>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground group-hover/role:rotate-90 transition-transform" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-40 rounded-xl">
                                  <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Assign Role
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-xs font-bold rounded-lg cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateUserRole.mutate({ id: u.id, role: "student" });
                                    }}
                                  >
                                    Student
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-xs font-bold rounded-lg cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateUserRole.mutate({ id: u.id, role: "creator" });
                                    }}
                                  >
                                    Creator
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-xs font-bold rounded-lg cursor-pointer text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateUserRole.mutate({ id: u.id, role: "admin" });
                                    }}
                                  >
                                    Admin
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  "border-none text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg",
                                  u.status === "active"
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-destructive/10 text-destructive",
                                )}
                              >
                                {u.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 px-2.5 rounded-lg border border-border/50 bg-background hover:bg-secondary gap-2 group/tier"
                                  >
                                    <Badge className="bg-indigo-600 text-white border-none text-[9px] font-black uppercase">
                                      {u.subscription_tier}
                                    </Badge>
                                    <ChevronDown className="h-3 w-3 text-muted-foreground group-hover/tier:translate-y-0.5 transition-transform" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                  {["free", "starter", "growth", "pro"].map((tier) => (
                                    <DropdownMenuItem
                                      key={tier}
                                      className="text-xs font-bold rounded-lg cursor-pointer capitalize"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateProfileTier.mutate({ id: u.id, tier });
                                      }}
                                    >
                                      {tier}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn(
                                    "h-8 w-8 rounded-lg transition-all",
                                    u.status === "active"
                                      ? "text-slate-300 hover:text-destructive"
                                      : "text-destructive hover:text-emerald-600",
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateUserStatus.mutate({
                                      id: u.id,
                                      status: u.status === "active" ? "banned" : "active",
                                    });
                                  }}
                                  title={u.status === "active" ? "Ban User" : "Activate User"}
                                >
                                  {u.status === "active" ? (
                                    <Ban className="h-4 w-4" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-lg text-slate-300 hover:text-primary transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate({
                                      to: "/admin/users/$userId",
                                      params: { userId: u.id },
                                    });
                                  }}
                                  title="View User Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </Card>
              </motion.div>
            </TabsContent>

            {/* CATALOG / COURSES */}
            <TabsContent value="courses">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 pb-32"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">
                      Course Catalog
                    </h2>
                    <p className="text-muted-foreground font-medium">
                      Review submissions, manage featured content, and control platform
                      availability.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative group min-w-[240px]">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder="Search courses..."
                        className="pl-11 h-12 bg-white border-border shadow-sm rounded-xl focus-visible:ring-primary/40 transition-all"
                        value={courseSearchTerm}
                        onChange={(e) => setCourseSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      value={courseCategoryFilter}
                      onChange={(e) => setCourseCategoryFilter(e.target.value)}
                      className="h-12 px-4 rounded-xl border border-border bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 min-w-[180px]"
                    >
                      <option value="all">All Categories</option>
                      {COURSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <select
                      value={courseSortBy}
                      onChange={(e) => setCourseSortBy(e.target.value as any)}
                      className="h-12 px-4 rounded-xl border border-border bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 min-w-[180px]"
                    >
                      <option value="newest">Sort: Newest</option>
                      <option value="students">Sort: Most Students</option>
                      <option value="price">Sort: Price (High to Low)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {paginatedCourses.map((c) => (
                    <Card
                      key={c.id}
                      className="border-border/40 bg-card shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all animate-in fade-in duration-300"
                    >
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {c.imageUrl ? (
                          <img
                            src={c.imageUrl}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                            <BookOpen className="h-10 w-10" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4">
                          <Badge
                            className={cn(
                              "border-none font-black text-[9px] px-3 py-1 rounded-lg uppercase tracking-widest shadow-xl",
                              c.status === "published"
                                ? "bg-emerald-500 text-white"
                                : "bg-amber-500 text-white",
                            )}
                          >
                            {c.status}
                          </Badge>
                        </div>
                      </div>
                      <CardHeader className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-tight">
                            {c.title}
                          </h3>
                          <div className="flex gap-1">
                            {c.isFeatured && (
                              <Badge className="bg-amber-400 text-white border-none p-1 h-5 w-5 rounded-full flex items-center justify-center">
                                <Zap className="h-3 w-3" />
                              </Badge>
                            )}
                            {c.isOnSale && (
                              <Badge className="bg-rose-500 text-white border-none p-1 h-5 w-5 rounded-full flex items-center justify-center">
                                <DollarSign className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium line-clamp-2 leading-relaxed">
                          {c.description}
                        </p>
                      </CardHeader>
                      <CardContent className="px-6 pb-6 pt-0 mt-auto flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          {c.status?.toLowerCase() === "draft" ? (
                            <Button
                              className="flex-1 rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2"
                              onClick={() =>
                                updateCourseStatus.mutate({ id: c.id, status: "published" })
                              }
                            >
                              <CheckCircle className="h-4 w-4" /> Approve
                            </Button>
                          ) : (
                            <Button
                              className="flex-1 rounded-xl h-10 border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 font-bold text-xs gap-2"
                              onClick={() =>
                                updateCourseStatus.mutate({ id: c.id, status: "draft" })
                              }
                            >
                              <XCircle className="h-4 w-4" /> Reject
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-xl border-border bg-background text-muted-foreground hover:text-foreground shadow-sm"
                            asChild
                          >
                            <Link to="/courses/$courseId" params={{ courseId: c.id }}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>

                        <div
                          className="flex flex-col gap-3 pt-4 border-t border-border cursor-default"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={c.adType === "featured"}
                                onCheckedChange={(checked) => {
                                  updateCourseStatus.mutate({
                                    id: c.id,
                                    status: c.status!,
                                    adType: checked ? "featured" : "none",
                                    isFeatured: checked, // AUTO-FEATURE on home if ad is on
                                  });
                                }}
                              />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                  Featured Placement
                                </span>
                                <p className="text-[8px] text-muted-foreground/60 italic leading-none">
                                  Home + Top 5 Browse
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={c.isCampaignActive}
                                onCheckedChange={(checked) => {
                                  updateCourseStatus.mutate({
                                    id: c.id,
                                    status: c.status!,
                                    isCampaignActive: checked,
                                  });
                                }}
                              />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                  Campaign Boost
                                </span>
                                <p className="text-[8px] text-muted-foreground/60 italic leading-none">
                                  Front Page Deal (+15%)
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-dashed border-border">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={isSaleActive(c)}
                                onCheckedChange={(checked) => {
                                  updateCourseStatus.mutate({
                                    id: c.id,
                                    status: c.status!,
                                    isOnSale: checked,
                                  });
                                }}
                              />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                                  Flash Sale Mode
                                </span>
                                {c.saleExpiresAt && !isSaleActive(c) && (
                                  <p className="text-[7px] text-rose-400 font-bold uppercase leading-none">
                                    EXPIRED
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pr-2">
                              <Badge
                                className={cn(
                                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-none shadow-none",
                                  c.status?.toLowerCase() === "published"
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-slate-100 text-slate-400",
                                )}
                              >
                                {c.status}
                              </Badge>
                            </div>
                          </div>
                          {c.isOnSale && (
                            <>
                              <div className="flex items-center gap-3 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                                <div className="flex-1">
                                  <Label className="text-[9px] font-black uppercase text-rose-600">
                                    Sale Price ($)
                                  </Label>
                                  <Input
                                    type="number"
                                    defaultValue={c.salePrice}
                                    onBlur={(e) => {
                                      updateCourseStatus.mutate({
                                        id: c.id,
                                        status: c.status!,
                                        salePrice: Number(e.target.value),
                                      });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 bg-transparent border-none p-0 font-bold text-sm focus-visible:ring-0"
                                  />
                                </div>
                                <div className="flex-1 border-l border-rose-500/20 pl-3">
                                  <Label className="text-[9px] font-black uppercase text-rose-600">
                                    Sale Expiry
                                  </Label>
                                  <Input
                                    type="datetime-local"
                                    defaultValue={
                                      c.saleExpiresAt
                                        ? new Date(c.saleExpiresAt).toISOString().slice(0, 16)
                                        : ""
                                    }
                                    onChange={(e) => {
                                      updateCourseStatus.mutate({
                                        id: c.id,
                                        status: c.status!,
                                        saleExpiresAt: e.target.value
                                          ? new Date(e.target.value).toISOString()
                                          : null,
                                      });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 bg-transparent border-none p-0 font-bold text-[10px] focus-visible:ring-0"
                                  />
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black uppercase text-muted-foreground">
                                  Original
                                </p>
                                <p className="text-xs font-bold line-through text-muted-foreground/50">
                                  ${c.price}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalCoursePages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/60">
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Showing Page {courseCurrentPage} of {totalCoursePages} (
                      {filteredCoursesList.length} Total Courses)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={courseCurrentPage === 1}
                        onClick={() => setCourseCurrentPage((prev) => Math.max(1, prev - 1))}
                        className="h-10 px-4 rounded-xl border-border hover:bg-slate-100 font-bold text-xs gap-1.5 transition-all shadow-sm"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-border/50 rounded-xl text-xs font-black text-slate-700">
                        {courseCurrentPage}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={courseCurrentPage === totalCoursePages}
                        onClick={() =>
                          setCourseCurrentPage((prev) => Math.min(totalCoursePages, prev + 1))
                        }
                        className="h-10 px-4 rounded-xl border-border hover:bg-slate-100 font-bold text-xs gap-1.5 transition-all shadow-sm"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* CAMPAIGNS / MARKETING */}
            <TabsContent value="coupons">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 pb-32"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    Marketing & Campaigns
                  </h2>
                  <p className="text-muted-foreground font-medium">
                    Drive growth with promotional codes and system-wide broadcast messages.
                  </p>
                </div>

                <Tabs defaultValue="list" className="space-y-10">
                  <TabsList className="bg-secondary/30 p-1.5 border border-border rounded-2xl w-fit">
                    <TabsTrigger
                      value="list"
                      className="rounded-xl gap-2 h-9 px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm text-muted-foreground transition-all"
                    >
                      <Ticket className="h-3.5 w-3.5" /> Coupons
                    </TabsTrigger>
                    <TabsTrigger
                      value="broadcast"
                      className="rounded-xl gap-2 h-9 px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm text-muted-foreground transition-all"
                    >
                      <Send className="h-3.5 w-3.5" /> Broadcast
                    </TabsTrigger>
                    <TabsTrigger
                      value="bundles"
                      className="rounded-xl gap-2 h-9 px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm text-muted-foreground transition-all"
                    >
                      <Zap className="h-3.5 w-3.5" /> Bundles
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="list">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                      <Card className="lg:col-span-4 border-border/40 bg-card shadow-sm rounded-[2rem] h-fit">
                        <CardHeader className="p-8 border-b border-border text-left">
                          <CardTitle className="text-lg font-bold">Launch Campaign</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6 text-left">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Promo Code
                            </Label>
                            <Input
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              className="h-12 bg-secondary/30 border-border rounded-xl font-mono text-base uppercase"
                              placeholder="SALE50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Discount Type
                            </Label>
                            <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl border border-border">
                              <Button
                                variant={discountType === "fixed" ? "default" : "ghost"}
                                size="sm"
                                className={cn(
                                  "flex-1 rounded-lg font-bold text-[10px] uppercase",
                                  discountType === "fixed" && "bg-white text-slate-900 shadow-sm",
                                )}
                                onClick={() => setDiscountType("fixed")}
                              >
                                Fixed ($)
                              </Button>
                              <Button
                                variant={discountType === "percentage" ? "default" : "ghost"}
                                size="sm"
                                className={cn(
                                  "flex-1 rounded-lg font-bold text-[10px] uppercase",
                                  discountType === "percentage" &&
                                    "bg-white text-slate-900 shadow-sm",
                                )}
                                onClick={() => setDiscountType("percentage")}
                              >
                                Percent (%)
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              {discountType === "fixed"
                                ? "Credit Amount (USD)"
                                : "Discount Percentage (%)"}
                            </Label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={discountAmount}
                                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                className="h-12 bg-secondary/30 border-border rounded-xl pr-10"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                                {discountType === "fixed" ? "$" : "%"}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              User Limit
                            </Label>
                            <Input
                              type="number"
                              value={usageLimit}
                              onChange={(e) => setUsageLimit(Number(e.target.value))}
                              className="h-12 bg-secondary/30 border-border rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Expiration
                            </Label>
                            <Input
                              type="date"
                              value={expiryDate}
                              onChange={(e) => setExpiryAt(e.target.value)}
                              className="h-12 bg-secondary/30 border-border rounded-xl text-muted-foreground"
                            />
                          </div>
                          <Button
                            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base shadow-xl shadow-primary/20 mt-4"
                            onClick={() => couponMutation.mutate()}
                            disabled={couponMutation.isPending || !couponCode}
                          >
                            Activate Campaign
                          </Button>
                        </CardContent>
                      </Card>

                      <div className="lg:col-span-8 space-y-8 text-left">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                          <h3 className="font-bold text-slate-800 flex items-center gap-3">
                            <Ticket className="h-5 w-5 text-primary" /> Active Promotions
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {coupons.map((coupon) => (
                            <Card
                              key={coupon.id}
                              className="border-border bg-white shadow-sm rounded-[2rem] p-8 space-y-6 relative overflow-hidden group"
                            >
                              <div className="flex justify-between items-start relative z-10">
                                <div className="bg-primary text-white font-mono font-black px-4 py-2 rounded-xl text-lg shadow-lg shadow-primary/20">
                                  {coupon.code}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 text-slate-300 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                  onClick={() => deleteCouponMutation.mutate(coupon.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-6 relative z-10 pt-4 border-t border-slate-100">
                                <div>
                                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">
                                    {coupon.discountType === "percentage"
                                      ? "Discount %"
                                      : "Credit Value"}
                                  </p>
                                  <p
                                    className={cn(
                                      "text-3xl font-bold",
                                      coupon.discountType === "percentage"
                                        ? "text-indigo-600"
                                        : "text-emerald-600",
                                    )}
                                  >
                                    {coupon.discountType === "percentage" ? "" : "$"}
                                    {coupon.discountAmount}
                                    {coupon.discountType === "percentage" ? "%" : ""}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">
                                    Used
                                  </p>
                                  <p className="text-3xl font-bold text-slate-800">
                                    {coupon.usedCount}
                                    <span className="text-sm font-medium text-slate-300">
                                      {" "}
                                      / {coupon.usageLimit || "∞"}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 relative z-10">
                                <Calendar className="h-3.5 w-3.5" /> Expiry:{" "}
                                {coupon.expiresAt
                                  ? new Date(coupon.expiresAt).toLocaleDateString()
                                  : "Lifetime"}
                              </div>
                              <div className="absolute -right-8 -bottom-8 h-40 w-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="broadcast">
                    <AdminBroadcastView />
                  </TabsContent>

                  <TabsContent value="bundles">
                    <AdminBundleView />
                  </TabsContent>
                </Tabs>
              </motion.div>
            </TabsContent>
            {/* FINANCIALS */}
            <TabsContent value="financials">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 pb-32"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">
                      Financial Intelligence
                    </h2>
                    <p className="text-muted-foreground font-medium">
                      Monitor global transactions, revenue distribution, and platform health.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    {selectedPayments.length > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-destructive/20 animate-in fade-in slide-in-from-left-4"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete Selected ({selectedPayments.length})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white rounded-[2rem] border-border p-8 shadow-2xl max-w-md">
                          <AlertDialogHeader className="space-y-3">
                            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/10">
                              <Trash2 className="h-6 w-6" />
                            </div>
                            <AlertDialogTitle className="text-2xl font-black tracking-tight">
                              Bulk Delete Records?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-medium text-slate-500">
                              Are you sure you want to permanently delete{" "}
                              <strong>{selectedPayments.length}</strong> transaction records? This
                              action cannot be reversed and history will be lost.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="pt-6 flex gap-3">
                            <AlertDialogCancel className="rounded-xl h-12 flex-1 font-bold">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="rounded-xl h-12 flex-1 font-bold bg-destructive hover:bg-destructive/90 text-white shadow-xl shadow-destructive/20"
                              onClick={() => bulkDeleteMutation.mutate(selectedPayments)}
                              disabled={bulkDeleteMutation.isPending}
                            >
                              {bulkDeleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Delete Forever"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-xl font-bold gap-2 border-border hover:bg-secondary"
                      onClick={() => {
                        const headers = [
                          "ID",
                          "Student",
                          "Email",
                          "Item",
                          "Amount",
                          "Currency",
                          "Platform Fee %",
                          "Net (Creator)",
                          "Method",
                          "Status",
                          "Date",
                          "Time",
                        ];
                        const rows = allPayments.map((p: any) => {
                          const feePercent =
                            p.platform_fee_percent !== undefined && p.platform_fee_percent !== null
                              ? p.platform_fee_percent
                              : platformFee;
                          const creatorRatio = (100 - feePercent) / 100;
                          return [
                            p.transaction_id,
                            p.profiles?.name || "Unnamed",
                            p.profiles?.email || "N/A",
                            p.courses?.title ||
                              p.bundles?.title ||
                              (p.organization_id ? "B2B Licenses" : "Premium Content"),
                            p.amount,
                            (p.currency || "usd").toUpperCase(),
                            feePercent + "%",
                            (p.amount * creatorRatio).toFixed(2),
                            p.payment_method,
                            p.status,
                            new Date(p.created_at).toLocaleDateString(),
                            new Date(p.created_at).toLocaleTimeString(),
                          ];
                        });
                        const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
                        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                        const link = document.createElement("a");
                        const url = URL.createObjectURL(blob);
                        link.setAttribute("href", url);
                        const branding = (getSetting("site_branding") as any) || {
                          name: "LearnLab",
                        };
                        const safeSiteName = ((branding as any)?.name || "platform")
                          .toLowerCase()
                          .replace(/\s+/g, "-");
                        link.setAttribute(
                          "download",
                          `${safeSiteName}-financials-${new Date().toISOString().split("T")[0]}.csv`,
                        );
                        link.style.visibility = "hidden";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success("Financial report generated!");
                      }}
                    >
                      <Download className="h-4 w-4" /> Export CSV
                    </Button>
                    <Card className="px-6 py-3 border-none bg-slate-500/10 rounded-2xl min-w-[160px]">
                      <p className="text-[10px] font-black uppercase text-slate-600 mb-1">
                        Gross Revenue
                      </p>
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-slate-700">
                          $
                          {groupedTotals.totalGrossUSD.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-500/10">
                          {(
                            Object.entries(groupedTotals.breakdown) as [
                              string,
                              { creator: number; platform: number; gross: number },
                            ][]
                          ).map(([currency, total]) => (
                            <p
                              key={currency}
                              className="text-[9px] font-bold text-slate-500 uppercase"
                            >
                              {currency}: {currency.toUpperCase() === "THB" ? "฿" : "$"}
                              {total.gross.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          ))}
                        </div>
                      </div>
                    </Card>
                    <Card className="px-6 py-3 border-none bg-emerald-500/10 rounded-2xl min-w-[160px]">
                      <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">
                        Creator Total
                      </p>
                      <div className="space-y-1">
                        {Object.keys(groupedTotals.breakdown).length === 0 ? (
                          <p className="text-xl font-bold text-emerald-700">$0.00</p>
                        ) : (
                          (
                            Object.entries(groupedTotals.breakdown) as [
                              string,
                              { creator: number; platform: number },
                            ][]
                          ).map(([currency, total]) => (
                            <p key={currency} className="text-xl font-bold text-emerald-700">
                              {currency.toUpperCase() === "THB" ? "฿" : "$"}
                              {total.creator.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          ))
                        )}
                      </div>
                    </Card>
                    <Card className="px-6 py-3 border-none bg-indigo-500/10 rounded-2xl relative group min-w-[160px]">
                      <p className="text-[10px] font-black uppercase text-indigo-600 mb-1">
                        Platform Total
                      </p>
                      <div className="space-y-1">
                        {Object.keys(groupedTotals.breakdown).length === 0 ? (
                          <p className="text-xl font-bold text-indigo-700">$0.00</p>
                        ) : (
                          (
                            Object.entries(groupedTotals.breakdown) as [
                              string,
                              { creator: number; platform: number },
                            ][]
                          ).map(([currency, total]) => (
                            <p key={currency} className="text-xl font-bold text-indigo-700">
                              {currency.toUpperCase() === "THB" ? "฿" : "$"}
                              {total.platform.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          ))
                        )}
                      </div>
                      <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[8px] p-2 rounded-lg z-50 w-48 pointer-events-none">
                        Note: Platform revenue is before Stripe transaction fees (~3.6% + 11 THB).
                      </div>
                    </Card>
                  </div>
                </div>

                <Card className="border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-secondary/20 border-b border-border">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="w-12 px-6">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              checked={
                                selectedPayments.length === allPayments.length &&
                                allPayments.length > 0
                              }
                              onChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="font-black text-[10px] uppercase py-4 text-muted-foreground">
                            Transaction / Student
                          </TableHead>
                          <TableHead className="font-black text-[10px] uppercase py-4 text-muted-foreground">
                            Date / Time
                          </TableHead>
                          <TableHead className="font-black text-[10px] uppercase py-4 text-muted-foreground">
                            Course Access
                          </TableHead>
                          <TableHead className="font-black text-[10px] uppercase py-4 text-muted-foreground">
                            Gross
                          </TableHead>
                          <TableHead className="font-black text-[10px] uppercase py-4 text-muted-foreground">
                            Net (Creator)
                          </TableHead>
                          <TableHead className="font-black text-[10px] uppercase py-4 text-muted-foreground">
                            Method
                          </TableHead>
                          <TableHead className="font-black text-[10px] uppercase py-4 text-muted-foreground">
                            Status
                          </TableHead>
                          <TableHead className="text-right font-black text-[10px] uppercase py-4 px-6 text-muted-foreground">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allPayments.map((payment: any) => (
                          <TableRow
                            key={payment.id}
                            className={cn(
                              "border-border/50 transition-colors",
                              selectedPayments.includes(payment.id)
                                ? "bg-primary/[0.03] hover:bg-primary/[0.05]"
                                : "hover:bg-slate-50/50",
                            )}
                          >
                            <TableCell className="px-6">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                checked={selectedPayments.includes(payment.id)}
                                onChange={() => toggleSelectPayment(payment.id)}
                              />
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-mono font-black text-slate-400 uppercase">
                                  {payment.payment_intent_id
                                    ? `PI: ${payment.payment_intent_id.slice(0, 12)}`
                                    : payment.transaction_id?.slice(0, 12) || "TX-PENDING"}
                                </span>
                                <span className="text-sm font-bold text-slate-900">
                                  {payment.profiles?.name || "Premium Student"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {payment.profiles?.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700">
                                  {new Date(payment.created_at).toLocaleDateString()}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {new Date(payment.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700">
                                  {payment.courses?.title ||
                                    payment.bundles?.title ||
                                    (payment.organization_id
                                      ? `License: ${payment.organizations?.name}`
                                      : "Premium Content")}
                                </span>
                                <div className="flex gap-1 mt-1">
                                  {payment.bundle_id && (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">
                                      Bundle
                                    </Badge>
                                  )}
                                  {payment.organization_id && (
                                    <Badge className="bg-indigo-50 text-indigo-600 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">
                                      Organization
                                    </Badge>
                                  )}
                                </div>
                                {!payment.courses?.title &&
                                  !payment.bundles?.title &&
                                  !payment.organization_id && (
                                    <Badge
                                      variant="outline"
                                      className="w-fit text-[8px] font-black uppercase text-rose-500 border-rose-100 bg-rose-50 px-1 py-0 mt-1"
                                    >
                                      Access Lost / Deleted
                                    </Badge>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-black text-slate-900">
                                {payment.currency?.toLowerCase() === "thb" ? "฿" : "$"}
                                {payment.amount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-black text-emerald-600">
                                {payment.currency?.toLowerCase() === "thb" ? "฿" : "$"}
                                {(
                                  (payment.amount *
                                    (100 - (payment.platform_fee_percent ?? platformFee))) /
                                  100
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-slate-100 text-[9px] font-black uppercase border-none"
                              >
                                {payment.payment_method}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge
                                  className={cn(
                                    "border-none text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg w-fit",
                                    payment.status === "completed"
                                      ? "bg-emerald-500 text-white"
                                      : payment.status === "refunded"
                                        ? "bg-slate-400 text-white"
                                        : payment.status === "disputed"
                                          ? "bg-rose-500 text-white"
                                          : "bg-amber-500 text-white",
                                  )}
                                >
                                  {payment.status}
                                </Badge>
                                {!payment.courses?.title && (
                                  <span className="text-[9px] font-bold text-rose-600 uppercase tracking-tighter ml-0.5">
                                    Course Deleted
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <div className="flex justify-end gap-2">
                                {payment.status === "completed" && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold text-[10px] uppercase tracking-widest gap-2"
                                      >
                                        <Zap className="h-3 w-3" /> Refund
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-white rounded-[2rem] border-border p-8 shadow-2xl max-w-md">
                                      <AlertDialogHeader className="space-y-3">
                                        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-500/10">
                                          <Zap className="h-6 w-6" />
                                        </div>
                                        <AlertDialogTitle className="text-2xl font-black tracking-tight">
                                          Initiate Full Refund?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-sm font-medium text-slate-500">
                                          This will return <strong>${payment.amount}</strong> to the
                                          student via Stripe and <strong>immediately revoke</strong>{" "}
                                          their course access. This action cannot be reversed.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="pt-6 flex gap-3">
                                        <AlertDialogCancel className="rounded-xl h-12 flex-1 font-bold">
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          className="rounded-xl h-12 flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-200"
                                          onClick={() => refundMutation.mutate(payment.id)}
                                        >
                                          Proceed with Refund
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 rounded-lg text-slate-300 hover:text-destructive transition-all"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-white rounded-[2rem] border-border p-8 shadow-2xl max-w-md">
                                    <AlertDialogHeader className="space-y-3">
                                      <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/10">
                                        <Trash2 className="h-6 w-6" />
                                      </div>
                                      <AlertDialogTitle className="text-2xl font-black tracking-tight">
                                        Delete Transaction?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-sm font-medium text-slate-500">
                                        Are you sure you want to <strong>permanently delete</strong>{" "}
                                        this record? This will remove the transaction from history
                                        but <strong>will not</strong> refund money or revoke access.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="pt-6 flex gap-3">
                                      <AlertDialogCancel className="rounded-xl h-12 flex-1 font-bold">
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="rounded-xl h-12 flex-1 font-bold bg-destructive hover:bg-destructive/90 text-white shadow-xl shadow-destructive/20"
                                        onClick={() => deletePaymentMutation.mutate(payment.id)}
                                      >
                                        Delete Record
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
                  </div>
                </Card>
              </motion.div>
            </TabsContent>

            {/* SUPPORT */}
            <TabsContent value="support">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 pb-32"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    Support Terminal
                  </h2>
                  <p className="text-muted-foreground font-medium">
                    Coordinate resolution for user inquiries and technical assistance requests.
                  </p>
                </div>

                <AdminSupportView markThreadRead={markThreadRead} />
              </motion.div>
            </TabsContent>

            {/* AI COCKPIT */}
            <TabsContent value="ai-control">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 pb-32"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">
                      AI Control Cockpit
                    </h2>
                    <p className="text-muted-foreground font-medium">
                      Oversee enterprise intelligence, manage usage quotas, and audit system traces.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant="outline"
                      className="h-10 rounded-xl border-border bg-slate-50 text-[10px] font-black uppercase tracking-widest px-5 shadow-sm"
                    >
                      Server-Side RLS Enforcement: Active
                    </Badge>
                  </div>
                </div>

                <AdminAIControlView />
              </motion.div>
            </TabsContent>

            {/* MODERATION */}
            <TabsContent value="moderation">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 pb-32"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    Safety & Compliance
                  </h2>
                  <p className="text-muted-foreground font-medium">
                    Review community reports, enforce platform policies, and sanitize ecosystem
                    content.
                  </p>
                </div>

                <AdminModerationView />
              </motion.div>
            </TabsContent>

            {/* B2B / ENTERPRISE */}
            <TabsContent value="b2b">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 pb-32"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    Enterprise Solutions
                  </h2>
                  <p className="text-muted-foreground font-medium">
                    Manage corporate organizations, team members, and bulk course license packages.
                  </p>
                </div>

                <AdminB2BView user={user} />
              </motion.div>
            </TabsContent>

            {/* PLATFORM SETTINGS */}
            <TabsContent value="settings">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 pb-32"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    Platform Infrastructure
                  </h2>
                  <p className="text-muted-foreground font-medium">
                    Configure global business logic, platform branding, and legal frameworks.
                  </p>
                </div>

                <AdminPlatformSettingsView />
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function AdminPlatformSettingsView() {
  const queryClient = useQueryClient();
  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] });
      toast.success("Settings updated successfully");
    },
    onError: (err: any) => toast.error(`Failed to update settings: ${err.message}`),
  });

  const getSetting = useCallback(
    (key: string) => settings?.find((s) => s.key === key)?.value,
    [settings],
  );

  // Local state for debounced/manual saving
  const [localRevenue, setLocalRevenue] = useState<string>("");
  const [localBranding, setLocalBranding] = useState<any>(null);
  const [localPolicies, setLocalPolicies] = useState<any>(null);
  const [localStripe, setLocalStripe] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Sync local state when query finishes
  useEffect(() => {
    if (settings.length > 0) {
      setLocalRevenue(getSetting("platform_revenue_share") || "30");
      setLocalBranding(
        getSetting("site_branding") || {
          name: "AI Spark Learn",
          logo_url: "",
          primary_color: "#6366f1",
        },
      );
      setLocalPolicies(getSetting("policies") || { terms: "", privacy: "" });
      setLocalStripe(
        getSetting("stripe_config") || { mode: "test", publishable_key: "", secret_key: "" },
      );
    }
  }, [settings, getSetting]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileName = `logo-${Date.now()}.${file.name.split(".").pop()}`;
      const path = `branding/${fileName}`;
      const { data, error } = await supabase.storage.from("course-images").upload(path, file);
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("course-images").getPublicUrl(data.path);
      setLocalBranding({ ...localBranding, logo_url: publicUrl });
      toast.success("Logo uploaded successfully. Don't forget to save changes.");
    } catch (err: any) {
      toast.error("Logo upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading || !localBranding)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-border shadow-sm rounded-2xl p-8 space-y-6 flex flex-col">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg font-bold">Revenue Model</CardTitle>
            <CardDescription>Configure the platform's cut from every sale.</CardDescription>
          </CardHeader>
          <div className="space-y-4 flex-1">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Platform Fee (%)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={localRevenue}
                  onChange={(e) => setLocalRevenue(e.target.value)}
                  className="h-12 bg-secondary/30 border-border rounded-xl font-bold"
                />
                <Badge variant="outline" className="h-12 rounded-xl px-4 border-border font-black">
                  PERCENT
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Creator receives {100 - Number(localRevenue)}% of the gross amount.
              </p>
            </div>
          </div>
          <Button
            onClick={() =>
              updateSettingMutation.mutate({ key: "platform_revenue_share", value: localRevenue })
            }
            disabled={
              updateSettingMutation.isPending ||
              localRevenue === getSetting("platform_revenue_share")
            }
            className="w-full h-12 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Revenue Model"
            )}
          </Button>
        </Card>

        <Card className="border-border shadow-sm rounded-2xl p-8 space-y-6 text-left flex flex-col">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg font-bold">Payment Gateway (Stripe)</CardTitle>
            <CardDescription>Manage your transaction environment.</CardDescription>
          </CardHeader>
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900">Live Production Mode</p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Switch between Test and Live environments.
                </p>
              </div>
              <Switch
                checked={localStripe.mode === "live"}
                onCheckedChange={(checked) =>
                  setLocalStripe({ ...localStripe, mode: checked ? "live" : "test" })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Publishable Key
              </Label>
              <Input
                value={localStripe.publishable_key}
                onChange={(e) =>
                  setLocalStripe({ ...localStripe, publishable_key: e.target.value })
                }
                className="h-10 bg-secondary/30 border-border rounded-xl font-mono text-xs"
                placeholder="pk_test_..."
              />
            </div>
          </div>
          <Button
            onClick={() =>
              updateSettingMutation.mutate({ key: "stripe_config", value: localStripe })
            }
            disabled={
              updateSettingMutation.isPending ||
              JSON.stringify(localStripe) === JSON.stringify(getSetting("stripe_config"))
            }
            className="w-full h-12 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Stripe Config"
            )}
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-border shadow-sm rounded-2xl p-8 space-y-6 flex flex-col">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg font-bold">Branding & Identity</CardTitle>
            <CardDescription>Customize the look and feel of the platform.</CardDescription>
          </CardHeader>
          <div className="space-y-4 text-left flex-1">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Site Name
              </Label>
              <Input
                value={localBranding.name}
                onChange={(e) => setLocalBranding({ ...localBranding, name: e.target.value })}
                className="h-12 bg-secondary/30 border-border rounded-xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Logo URL / Upload
              </Label>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-secondary/30 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                  {localBranding.logo_url ? (
                    <img
                      src={localBranding.logo_url}
                      alt="Logo Preview"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Sparkles className="h-6 w-6 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    value={localBranding.logo_url}
                    onChange={(e) =>
                      setLocalBranding({ ...localBranding, logo_url: e.target.value })
                    }
                    className="h-10 bg-secondary/30 border-border rounded-xl text-xs"
                    placeholder="https://..."
                  />
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploading}
                      className="hidden"
                      id="logo-upload-input"
                    />
                    <Label
                      htmlFor="logo-upload-input"
                      className="inline-flex items-center justify-center px-4 py-2 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-primary/20 transition-all"
                    >
                      {isUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-3 w-3 mr-2" />
                      )}
                      Upload New Image
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={() =>
              updateSettingMutation.mutate({ key: "site_branding", value: localBranding })
            }
            disabled={
              updateSettingMutation.isPending ||
              JSON.stringify(localBranding) === JSON.stringify(getSetting("site_branding"))
            }
            className="w-full h-12 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Branding"
            )}
          </Button>
        </Card>

        <Card className="border-border shadow-sm rounded-2xl p-8 flex flex-col">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-lg font-bold">Legal & Policies</CardTitle>
            <CardDescription>
              Manage your Terms of Service and Privacy Policy content.
            </CardDescription>
          </CardHeader>
          <Tabs defaultValue="terms" className="space-y-6 flex-1 flex flex-col">
            <TabsList className="bg-secondary/30 p-1 rounded-xl w-fit">
              <TabsTrigger value="terms" className="rounded-lg px-6 font-bold">
                Terms of Service
              </TabsTrigger>
              <TabsTrigger value="privacy" className="rounded-lg px-6 font-bold">
                Privacy Policy
              </TabsTrigger>
            </TabsList>
            <TabsContent value="terms" className="space-y-4 text-left flex-1 flex flex-col">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Terms Content (Markdown/HTML)
              </Label>
              <textarea
                className="w-full flex-1 min-h-[150px] p-4 rounded-xl bg-secondary/30 border border-border font-mono text-xs focus:outline-none"
                value={localPolicies.terms}
                onChange={(e) => setLocalPolicies({ ...localPolicies, terms: e.target.value })}
              />
            </TabsContent>
            <TabsContent value="privacy" className="space-y-4 text-left flex-1 flex flex-col">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Privacy Content (Markdown/HTML)
              </Label>
              <textarea
                className="w-full flex-1 min-h-[150px] p-4 rounded-xl bg-secondary/30 border border-border font-mono text-xs focus:outline-none"
                value={localPolicies.privacy}
                onChange={(e) => setLocalPolicies({ ...localPolicies, privacy: e.target.value })}
              />
            </TabsContent>
          </Tabs>
          <Button
            onClick={() => updateSettingMutation.mutate({ key: "policies", value: localPolicies })}
            disabled={
              updateSettingMutation.isPending ||
              JSON.stringify(localPolicies) === JSON.stringify(getSetting("policies"))
            }
            className="w-full h-12 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 mt-6"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Legal Policies"
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function AdminSupportView({ markThreadRead }: { markThreadRead: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["admin-support-threads"],
    queryFn: fetchAllSupportThreads,
    refetchInterval: 10000, // UX-W024: Auto-refresh thread list every 10s to keep latest activity at top
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) =>
      updateSupportThreadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-threads"] });
      toast.success("Ticket status updated");
    },
  });

  if (isLoading)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[700px]">
      <Card className="lg:col-span-4 border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden flex flex-col">
        <CardHeader className="bg-secondary/20 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Support Queue
            </CardTitle>
            <Badge variant="outline" className="bg-white/50 text-[10px] font-bold">
              {threads.length} Tickets
            </Badge>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {threads.map((thread: any) => (
              <button
                key={thread.id}
                onClick={() => {
                  setSelectedThreadId(thread.id);
                  markThreadRead(thread.id);
                }}
                className={cn(
                  "w-full text-left p-5 hover:bg-slate-50 transition-all flex flex-col gap-2 group relative",
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
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[9px] text-primary font-black uppercase tracking-tighter">
                      Last Msg
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
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
                </div>
                <h4 className="font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors pr-4">
                  {thread.subject}
                </h4>
                {thread.lastMessage && (
                  <p className="text-[10px] text-slate-400 line-clamp-1 italic mb-1">
                    "{thread.lastMessage.message}"
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] font-black text-primary uppercase italic">
                      {thread.profiles?.name?.[0] || "?"}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[100px]">
                      {thread.profiles?.name}
                    </span>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 text-slate-300 transition-transform duration-300",
                      selectedThreadId === thread.id
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                    )}
                  />
                </div>
              </button>
            ))}
            {threads.length === 0 && (
              <div className="p-8 text-center text-muted-foreground italic text-xs">
                No active support tickets.
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      <Card className="lg:col-span-8 border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden flex flex-col">
        {selectedThreadId ? (
          <SupportChat
            threadId={selectedThreadId}
            subject={threads.find((t: any) => t.id === selectedThreadId)?.subject}
            status={threads.find((t: any) => t.id === selectedThreadId)?.status || undefined}
            onRead={markThreadRead}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <MessageSquare className="h-12 w-12 opacity-10" />
            <p className="font-bold text-sm">Select a ticket to start responding.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function SupportChat({
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["admin-support-messages", threadId],
    queryFn: () => fetchSupportThreadMessages(threadId),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (msgToSend: string) => sendSupportMessage(threadId, profile!.id, msgToSend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-messages", threadId] });
      setMessage("");
      toast.success("Message sent");
      // UX-W026: Clear badge locally
      if (onRead) onRead(threadId);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed && !sendMutation.isPending) {
      sendMutation.mutate(trimmed);
    }
  };

  const statusMutation = useMutation({
    mutationFn: (status: "resolved" | "closed") => updateSupportThreadStatus(threadId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-threads"] });
      toast.success("Ticket updated");
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <h3 className="text-sm font-black text-slate-900 line-clamp-1 uppercase tracking-tight italic">
            {subject || "Support Thread"}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge
              className={cn(
                "border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                status === "open"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-slate-400 text-white",
              )}
            >
              {status}
            </Badge>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">
              Ref: {threadId.slice(0, 8)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status !== "resolved" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl font-bold text-[9px] uppercase tracking-widest border-emerald-100 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100 transition-all px-4 shadow-none"
              onClick={() => statusMutation.mutate("resolved")}
            >
              Resolve
            </Button>
          )}
          {status !== "closed" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-xl font-bold text-[9px] uppercase tracking-widest text-rose-500 hover:bg-rose-50 px-4 transition-all"
              onClick={() => statusMutation.mutate("closed")}
            >
              Close
            </Button>
          )}
        </div>
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
                      isMe
                        ? "bg-primary border-primary/20 shadow-primary/10"
                        : "bg-white border-slate-200",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[9px] font-black uppercase italic tracking-tighter",
                        isMe ? "text-white" : "text-slate-400",
                      )}
                    >
                      {isMe ? "AD" : msg.profiles?.name?.[0] || "U"}
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
                    {/* UI Polish: Always show time for clarity */}
                    <span className="text-[8px] font-black text-slate-300 mt-2 uppercase tracking-widest px-1 italic">
                      {isMe ? "Admin" : msg.profiles?.name} •{" "}
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
          <div ref={messagesEndRef} className="h-px w-full" />
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50/30 shrink-0">
        <form className="flex gap-3" onSubmit={handleSend}>
          <Input
            placeholder="Type admin response..."
            className="h-14 rounded-2xl bg-white border-slate-200 text-slate-900 shadow-sm focus-visible:ring-primary/20 text-sm font-medium transition-all"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sendMutation.isPending}
          />
          <Button
            type="submit"
            className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all shrink-0 group"
            disabled={sendMutation.isPending || !message.trim()}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function AdminAIControlView() {
  const queryClient = useQueryClient();
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: settings = [], isLoading: loadingSettings } = useQuery<any[]>({
    queryKey: ["admin-ai-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["admin-ai-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_logs")
        .select("*, profiles:user_id(name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      // Use upsert to handle case where key might not exist yet
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-settings"] });
      toast.success("System status synchronized");
    },
    onError: (err: any) => toast.error(err.message || "Sync failed"),
  });

  const aiEnabled = settings?.find((s: any) => s.key === "ai_enabled")?.value === true;
  const aiQuotas = (settings?.find((s: any) => s.key === "ai_quotas")?.value as any) || {};

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-border/40 bg-card shadow-sm rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">Global AI Kill-switch</h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Immediately disable all AI features.
              </p>
            </div>
            <Switch
              checked={aiEnabled}
              onCheckedChange={(checked) =>
                updateSettingMutation.mutate({ key: "ai_enabled", value: checked })
              }
            />
          </div>
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-[10px] font-medium text-amber-700 leading-relaxed">
              Disabling this will block Course Gen, Quiz Gen, and Image Lab for all users.
            </p>
          </div>
        </Card>

        <Card className="md:col-span-2 border-border/40 bg-card shadow-sm rounded-2xl p-8">
          <h3 className="font-bold text-slate-900 mb-6">Feature Quotas (Daily)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {Object.entries(aiQuotas)
              .filter(([feature]) => ["course_gen", "quiz_gen", "image_gen"].includes(feature))
              .map(([feature, limit]: [string, any]) => (
                <div key={feature} className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {feature.replace("_", " ")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={limit}
                      onChange={(e) => {
                        const newQuotas = { ...aiQuotas, [feature]: Number(e.target.value) };
                        updateSettingMutation.mutate({ key: "ai_quotas", value: newQuotas });
                      }}
                      className="h-10 bg-secondary/30 border-border rounded-xl text-sm font-bold"
                    />
                    <Badge
                      variant="outline"
                      className="h-10 rounded-xl px-3 border-border font-black text-[9px]"
                    >
                      LMT
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <Card className="border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-secondary/20 border-b border-border px-8 py-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            AI Intelligence Logs (Last 100)
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-black text-[10px] uppercase px-8 py-4">Status</TableHead>
                <TableHead className="font-black text-[10px] uppercase py-4">Feature</TableHead>
                <TableHead className="font-black text-[10px] uppercase py-4">User</TableHead>
                <TableHead className="font-black text-[10px] uppercase py-4">
                  Execution Time
                </TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase px-8 py-4">
                  Quality
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow
                  key={log.id}
                  className="border-border hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell className="px-8 py-4">
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
                  <TableCell>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                      {log.feature}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">
                        {log.profiles?.name || "AI System"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {log.profiles?.email || "internal@core"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right px-8 py-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-slate-300 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-[2rem] p-8 border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">AI Trace Analysis</DialogTitle>
            <DialogDescription className="text-xs font-medium uppercase tracking-widest">
              Payload & Response Debugger
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Request Prompt (Partial)
              </Label>
              <div className="p-4 rounded-xl bg-slate-900 text-slate-50 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                {selectedLog?.prompt || "No prompt data recorded."}
              </div>
            </div>
            {selectedLog?.error_message && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                  Error Payload
                </Label>
                <div className="p-4 rounded-xl bg-rose-50 text-rose-600 font-mono text-[11px] border border-rose-100">
                  {selectedLog.error_message}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">
                  Status Code
                </p>
                <p className="text-lg font-bold">{selectedLog?.response_status}</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">
                  Execution ID
                </p>
                <p className="text-lg font-bold truncate">{selectedLog?.id.slice(0, 12)}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 rounded-xl font-bold"
              onClick={() => setSelectedLog(null)}
            >
              Close Trace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlagiarismCheckDialog({ courseId }: { courseId: string }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const results = await checkPlagiarism(courseId);
      setMatches(results);
    } catch (err) {
      toast.error("Plagiarism check failed");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className="rounded-lg font-bold text-xs text-indigo-600"
        >
          Scan for Plagiarism
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-white rounded-[2.5rem] border-slate-200 p-8 shadow-2xl text-slate-900 font-sans">
        <DialogHeader className="space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/10">
            <Search className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">
            Plagiarism Analysis
          </DialogTitle>
          <DialogDescription className="text-base font-medium text-slate-500">
            Comparing course content against the platform database.
          </DialogDescription>
        </DialogHeader>

        <div className="py-8 space-y-6">
          <Button
            onClick={handleCheck}
            disabled={isChecking}
            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200/50"
          >
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run Deep Scan"}
          </Button>

          {matches.length > 0 ? (
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                <ShieldCheck className="h-3 w-3" /> Potential Matches Found
              </p>
              <div className="space-y-3">
                {matches.map((match, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-xl bg-rose-50/50 border border-rose-100"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{match.title}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Similarity: {(match.similarity * 100).toFixed(1)}%
                      </p>
                    </div>
                    <Badge className="bg-rose-500 text-white border-none text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shrink-0">
                      High Match
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !isChecking && (
              <div className="h-32 flex flex-col items-center justify-center bg-slate-50/50 border border-dashed rounded-2xl text-muted-foreground">
                <p className="text-xs font-medium italic">
                  No matches detected or scan not started.
                </p>
              </div>
            )
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            className="w-full h-12 rounded-xl font-bold"
            onClick={() => setIsOpen(false)}
          >
            Close Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminModerationView() {
  const queryClient = useQueryClient();
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: fetchAllReports,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: string }) => (updateReportStatus as any)({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Report status updated");
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => (deleteReport as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Report dismissed");
    },
  });

  const banCreatorMutation = useMutation({
    mutationFn: async (creatorId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "banned" })
        .eq("id", creatorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Creator has been banned");
    },
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
          userId: session?.user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Course deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete course"),
  });

  if (isLoading)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );

  if (reports.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-50/50 border border-dashed rounded-[2rem] text-muted-foreground space-y-4">
        <ShieldCheck className="h-12 w-12 opacity-10" />
        <p className="font-bold text-sm">Platform is clean. No active reports.</p>
      </div>
    );
  }

  return (
    <Card className="border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden">
      <Table>
        <TableHeader className="bg-secondary/20 border-b border-border">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="font-black text-[10px] uppercase py-4 px-6 text-muted-foreground">
              Course / Reason
            </TableHead>
            <TableHead className="font-black text-[10px] uppercase py-4 text-muted-foreground">
              Reporter
            </TableHead>
            <TableHead className="font-black text-[10px] uppercase py-4 text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-right font-black text-[10px] uppercase py-4 px-6 text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report: any) => (
            <TableRow
              key={report.id}
              className="border-border/50 hover:bg-slate-50/50 transition-colors"
            >
              <TableCell className="py-4 px-6">
                <div className="space-y-1">
                  <Link
                    to="/courses/$courseId"
                    params={{ courseId: report.course_id }}
                    className="font-bold text-slate-900 hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {report.courses?.title} <ExternalLink className="h-3 w-3" />
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border-rose-100"
                    >
                      {report.reason}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-medium line-clamp-1">
                      {report.description}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700">
                    {report.profiles?.name || "Anonymous"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {report.profiles?.email}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    "border-none text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg",
                    report.status === "pending"
                      ? "bg-amber-500 text-white"
                      : report.status === "reviewed"
                        ? "bg-blue-500 text-white"
                        : report.status === "resolved"
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-400 text-white",
                  )}
                >
                  {report.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right px-6">
                <div className="flex justify-end gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg font-bold text-[10px] uppercase tracking-widest gap-2"
                      >
                        Handle <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-2xl">
                      <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        Take Action
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <PlagiarismCheckDialog courseId={report.course_id} />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="rounded-lg font-bold text-xs"
                        onClick={() =>
                          updateStatusMutation.mutate({ id: report.id, status: "reviewed" })
                        }
                      >
                        Mark as Reviewed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-lg font-bold text-xs text-emerald-600"
                        onClick={() =>
                          updateStatusMutation.mutate({ id: report.id, status: "resolved" })
                        }
                      >
                        Mark as Resolved
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="rounded-lg font-bold text-xs text-rose-600"
                        onClick={() => banCreatorMutation.mutate(report.courses.creator_id)}
                      >
                        Ban Creator
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-lg font-bold text-xs text-destructive"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this course entirely? This action cannot be undone.",
                            )
                          ) {
                            deleteCourseMutation.mutate(report.course_id);
                          }
                        }}
                      >
                        Delete Course
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="rounded-lg font-bold text-xs"
                        onClick={() => deleteReportMutation.mutate(report.id)}
                      >
                        Dismiss Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function AdminB2BView({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [packageCourseId, setPackageCourseId] = useState("");
  const [packageSeats, setPackageSeats] = useState(10);

  // 1. Fetch Organizations
  const { data: orgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("*, profiles(name, email)");
        if (error) {
          if (error.code === "42P01") return [];
          throw error;
        }
        return data || [];
      } catch (err) {
        console.error("Org fetch failed:", err);
        return [];
      }
    },
  });

  // 2. Fetch Pending Requests
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-org-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("org_request_status", "pending");
      if (error) throw error;
      return data || [];
    },
  });
  const requestActionMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "approved" | "rejected" }) => {
      const { error } = await (supabase.from("profiles") as any)
        .update({ org_request_status: status })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-org-requests"] });
      toast.success("Enterprise request updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["admin-org-members", selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("organization_members")
          .select("*, profiles(name, email)")
          .eq("organization_id", selectedOrgId!);
        if (error) {
          if (error.code === "42P01") return [];
          throw error;
        }
        return data || [];
      } catch (err) {
        console.error("Member fetch failed:", err);
        return [];
      }
    },
  });

  const { data: packages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ["admin-org-packages", selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("organization_packages")
          .select("*, courses(title)")
          .eq("organization_id", selectedOrgId!);
        if (error) {
          if (error.code === "42P01") return [];
          throw error;
        }
        return data || [];
      } catch (err) {
        console.error("Package fetch failed:", err);
        return [];
      }
    },
  });

  const { data: engagement, isLoading: loadingEngagement } = useQuery({
    queryKey: ["admin-org-engagement", selectedOrgId],
    enabled: !!selectedOrgId && members.length > 0 && packages.length > 0,
    queryFn: async () => {
      const memberIds = members.map((m: any) => m.user_id);
      const courseIds = packages.map((p: any) => p.course_id);

      // Get total completed lessons for these members in these courses
      const { count: completedCount } = await supabase
        .from("lesson_progress")
        .select("*", { count: "exact", head: true })
        .in("user_id", memberIds)
        .in("course_id", courseIds);

      // Get total lessons count in these courses
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("id")
        .in("course_id", courseIds);

      const totalLessonsPerMember = lessonsData?.length || 0;
      const totalLessonsPossible = totalLessonsPerMember * memberIds.length;

      return {
        avgProgress:
          totalLessonsPossible > 0
            ? Math.round(((completedCount || 0) / totalLessonsPossible) * 100)
            : 0,
        totalCompleted: completedCount || 0,
        totalLessonsPossible,
      };
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-all-courses-minimal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data || [];
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase.from("organizations") as any)
        .insert({
          name: orgName,
          owner_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("organization_members").insert({
        organization_id: data.id,
        user_id: user.id,
        role: "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      toast.success("Organization created");
      setOrgName("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrgId) throw new Error("No organization selected");
      return (inviteMemberToOrg as any)({
        data: {
          email: memberEmail,
          orgId: selectedOrgId,
          invitedBy: user?.id,
        },
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-org-members"] });
      toast.success(`${res.name || "User"} added to organization successfully.`);
      setMemberEmail("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to add member"),
  });

  const addPackageMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("organization_packages").insert({
        organization_id: selectedOrgId!,
        course_id: packageCourseId,
        max_seats: packageSeats,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-org-packages"] });
      toast.success("License package assigned");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteOrgMutation = useMutation({
    mutationFn: (orgId: string) => (deleteOrganization as any)({ data: { orgId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setSelectedOrgId(null);
      toast.success("Organization deleted successfully");
    },
    onError: (err: any) => {
      console.error("Delete failed:", err);
      toast.error(`Delete failed: ${err.message}`);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-org-members"] });
      toast.success("Member removed from organization");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (pkgId: string) => {
      const { error } = await supabase.from("organization_packages").delete().eq("id", pkgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-org-packages"] });
      toast.success("License package deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (loadingOrgs)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 text-left">
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-border shadow-sm rounded-2xl p-6 bg-secondary/10">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-base font-bold">New Organization</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              placeholder="Organization Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="h-10 bg-white border-border rounded-xl"
            />
            <Button
              className="w-full h-10 rounded-xl bg-primary font-bold text-xs"
              onClick={() => createOrgMutation.mutate()}
              disabled={!orgName || createOrgMutation.isPending}
            >
              Create Org
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">
            Select Organization
          </Label>
          {[...orgs]
            .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
            .map((org: any) => (
              <div key={org.id} className="group relative">
                <button
                  onClick={() => setSelectedOrgId(org.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all text-left relative overflow-hidden",
                    selectedOrgId === org.id
                      ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                      : "bg-white border-border text-slate-900 hover:border-primary/30",
                  )}
                >
                  <p className="font-bold text-sm mb-1">{org.name}</p>
                  <p
                    className={cn(
                      "text-[10px] font-medium",
                      selectedOrgId === org.id ? "text-white/60" : "text-muted-foreground",
                    )}
                  >
                    Owner: {org.profiles?.name || "System Admin"}
                  </p>
                  {selectedOrgId === org.id && (
                    <div className="absolute -right-4 -bottom-4 h-12 w-12 bg-white/10 rounded-full blur-xl" />
                  )}
                </button>

                <div
                  className={cn(
                    "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity",
                    selectedOrgId === org.id && "opacity-100",
                  )}
                >
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "h-7 w-7 rounded-lg",
                          selectedOrgId === org.id
                            ? "text-white/40 hover:text-white hover:bg-white/10"
                            : "text-slate-300 hover:text-destructive hover:bg-destructive/5",
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white rounded-[2rem] border-border p-8 shadow-2xl max-w-md">
                      <AlertDialogHeader className="space-y-3">
                        <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/10">
                          <Trash2 className="h-6 w-6" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-black tracking-tight">
                          Delete Organization?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-slate-500">
                          Are you sure you want to permanently delete <strong>{org.name}</strong>?
                          All members and license packages will be removed from this organization.
                          This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="pt-6 flex gap-3">
                        <AlertDialogCancel className="rounded-xl h-12 flex-1 font-bold">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-xl h-12 flex-1 font-bold bg-destructive hover:bg-destructive/90 text-white shadow-xl shadow-destructive/20"
                          onClick={() => deleteOrgMutation.mutate(org.id)}
                        >
                          Delete Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="lg:col-span-8 space-y-10">
        {!selectedOrgId ? (
          <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2rem] text-muted-foreground space-y-4">
            <Building2 className="h-12 w-12 opacity-10" />
            <p className="font-bold text-sm">Select an organization to manage</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-border shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 border-b border-border bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">Team Members</CardTitle>
                      <CardDescription className="text-xs">
                        Manage employees and admins.
                      </CardDescription>
                    </div>
                    <Users className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                  <div className="flex gap-2">
                    <Input
                      placeholder="user@company.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="h-10 bg-secondary/30 border-border rounded-xl flex-1"
                    />
                    <Button
                      size="sm"
                      className="rounded-xl h-10 px-4 font-bold"
                      onClick={() => addMemberMutation.mutate()}
                      disabled={!memberEmail || addMemberMutation.isPending}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {members.map((m: any) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group/member"
                      >
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-900">{m.profiles?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{m.profiles?.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[8px] font-black uppercase px-2 py-0 border-slate-200"
                          >
                            {m.role}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-md text-slate-300 hover:text-destructive opacity-0 group-hover/member:opacity-100 transition-all"
                            onClick={() => {
                              if (confirm(`Remove ${m.profiles?.name} from organization?`)) {
                                removeMemberMutation.mutate(m.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 border-b border-border bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">Course Licenses</CardTitle>
                      <CardDescription className="text-xs">
                        Assign bulk seats for courses.
                      </CardDescription>
                    </div>
                    <Ticket className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-left">
                  <div className="space-y-4">
                    <select
                      value={packageCourseId}
                      onChange={(e) => setPackageCourseId(e.target.value)}
                      className="w-full h-10 px-4 rounded-xl bg-secondary/30 border-border text-sm font-bold appearance-none outline-none"
                    >
                      <option value="">Select Course</option>
                      {courses.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={packageSeats}
                        onChange={(e) => setPackageSeats(Number(e.target.value))}
                        className="h-10 bg-secondary/30 border-border rounded-xl w-24"
                      />
                      <Button
                        className="flex-1 rounded-xl h-10 font-bold"
                        onClick={() => addPackageMutation.mutate()}
                        disabled={!packageCourseId || addPackageMutation.isPending}
                      >
                        Assign Seats
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {packages.map((p: any) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-left group/pkg relative"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold text-slate-900 truncate pr-8">
                            {p.courses?.title}
                          </p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-md text-slate-300 hover:text-destructive opacity-0 group-hover/pkg:opacity-100 transition-all absolute right-2 top-2"
                            onClick={() => {
                              if (confirm(`Revoke all licenses for ${p.courses?.title}?`)) {
                                deletePackageMutation.mutate(p.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-medium text-muted-foreground">
                            Seats: {p.used_seats} / {p.max_seats}
                          </p>
                          <div className="h-1.5 flex-1 mx-3 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${(p.used_seats / (p.max_seats || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border shadow-sm rounded-[2rem] p-8 bg-indigo-900 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Corporate Activity</h3>
                <p className="text-indigo-200 text-sm mb-6">
                  Real-time engagement tracking for this organization.
                </p>
                <div className="grid grid-cols-3 gap-8">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">
                      Total Employees
                    </p>
                    <p className="text-3xl font-black">{members.length}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">
                      Active Licenses
                    </p>
                    <p className="text-3xl font-black">{packages.length}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">
                      Avg. Progress
                    </p>
                    <p className="text-3xl font-black">
                      {loadingEngagement ? "..." : `${engagement?.avgProgress || 0}%`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <BarChart2 className="h-32 w-32" />
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function AdminBroadcastView() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<any>("info");
  const [targetRole, setTargetRole] = useState<any>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("system_notifications")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          if (error.code === "42P01") return [];
          throw error;
        }
        return data || [];
      } catch (err) {
        console.error("Notification fetch failed:", err);
        return [];
      }
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        message,
        type,
        target_role: targetRole,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from("system_notifications")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("system_notifications").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["active-ticker-notifications"] });
      toast.success(editingId ? "Broadcast updated!" : "Broadcast sent to users!");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Broadcast failed"),
  });

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setType("info");
    setTargetRole("all");
    setEditingId(null);
  };

  const handleEdit = (n: any) => {
    setTitle(n.title);
    setMessage(n.message);
    setType(n.type);
    setTargetRole(n.target_role);
    setEditingId(n.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("system_notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["active-ticker-notifications"] });
      toast.success("Notification retracted");
    },
  });

  if (isLoading)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      <Card className="lg:col-span-5 border-border shadow-sm rounded-[2rem] p-8 space-y-6 sticky top-8">
        <CardHeader className="p-0 mb-4 text-left">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-bold">
              {editingId ? "Edit Broadcast" : "New Broadcast"}
            </CardTitle>
            {editingId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >
                Cancel
              </Button>
            )}
          </div>
          <CardDescription>Send a system-wide notification to selected roles.</CardDescription>
        </CardHeader>
        <div className="space-y-4 text-left">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Notification Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 bg-secondary/30 border-border rounded-xl font-bold"
              placeholder="System Maintenance / New Feature!"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Message
            </Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-32 p-4 rounded-xl bg-secondary/30 border-border font-medium text-sm focus:outline-none"
              placeholder="Write your message here..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Type
              </Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-secondary/30 border-border text-sm font-bold appearance-none outline-none"
              >
                <option value="info">Information</option>
                <option value="promotion">Promotion</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Target Audience
              </Label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-secondary/30 border-border text-sm font-bold appearance-none outline-none"
              >
                <option value="all">Everyone</option>
                <option value="student">Students Only</option>
                <option value="creator">Creators Only</option>
              </select>
            </div>
          </div>
          <Button
            className={cn(
              "w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl mt-4",
              editingId
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 text-white",
            )}
            onClick={() => broadcastMutation.mutate()}
            disabled={broadcastMutation.isPending || !title || !message}
          >
            {editingId ? "Update Broadcast" : "Send Broadcast"}
          </Button>
        </div>
      </Card>

      <div className="lg:col-span-7 space-y-6 text-left">
        <h3 className="font-bold text-slate-800 flex items-center gap-3">
          <Activity className="h-5 w-5 text-indigo-600" /> Recent Broadcasts
        </h3>
        <div className="space-y-4">
          {notifications.map((n: any) => (
            <Card
              key={n.id}
              className="border-border shadow-sm rounded-2xl p-6 relative group overflow-hidden bg-white hover:border-primary/30 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                      n.type === "info"
                        ? "bg-blue-500 text-white"
                        : n.type === "promotion"
                          ? "bg-amber-500 text-white"
                          : n.type === "warning"
                            ? "bg-rose-500 text-white"
                            : "bg-emerald-500 text-white",
                    )}
                  >
                    {n.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                    Target: {n.target_role}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary transition-all"
                    onClick={() => handleEdit(n)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-300 hover:text-destructive transition-opacity"
                    onClick={() => deleteNotificationMutation.mutate(n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h4 className="font-bold text-slate-900 mb-1">{n.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {new Date(n.created_at).toLocaleString()}
                </span>
                {n.is_active ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                    Live
                  </Badge>
                ) : (
                  <Badge className="bg-slate-500/10 text-slate-600 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                    Expired
                  </Badge>
                )}
              </div>
            </Card>
          ))}
          {notifications.length === 0 && (
            <div className="h-32 flex items-center justify-center border-2 border-dashed border-border rounded-2xl text-muted-foreground italic text-xs">
              No previous broadcasts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminBundleView() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);

  const { data: bundles = [], isLoading: loadingBundles } = useQuery({
    queryKey: ["admin-bundles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bundles")
        .select("*, bundle_courses(course_id, courses(title))");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ["admin-all-courses-minimal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredCourses = allCourses.filter((c: any) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice(0);
    setSelectedCourses([]);
    setSearchTerm("");
    setEditingBundleId(null);
  };

  const createBundleMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let bundle;
      if (editingBundleId) {
        const { data, error: updateError } = await (supabase as any)
          .from("bundles")
          .update({ title, description, price })
          .eq("id", editingBundleId)
          .select()
          .single();
        if (updateError) throw updateError;
        bundle = data;

        // Clear existing links
        await (supabase as any).from("bundle_courses").delete().eq("bundle_id", editingBundleId);
      } else {
        const { data, error: insertError } = await (supabase as any)
          .from("bundles")
          .insert({ title, description, price })
          .select()
          .single();
        if (insertError) throw insertError;
        bundle = data;
      }

      if (selectedCourses.length > 0) {
        const bundleCourses = selectedCourses.map((courseId) => ({
          bundle_id: bundle.id,
          course_id: courseId,
        }));
        const { error: linkError } = await (supabase as any)
          .from("bundle_courses")
          .insert(bundleCourses);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bundles"] });
      toast.success(
        editingBundleId ? "Bundle updated successfully" : "Bundle created successfully",
      );
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleEdit = (b: any) => {
    setTitle(b.title);
    setDescription(b.description || "");
    setPrice(b.price || 0);
    setSelectedCourses(b.bundle_courses?.map((bc: any) => bc.course_id) || []);
    setEditingBundleId(b.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteBundleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bundles"] });
      toast.success("Bundle deleted");
    },
  });

  if (loadingBundles)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      <Card className="lg:col-span-5 border-border shadow-sm rounded-[2rem] p-8 space-y-6 sticky top-8">
        <CardHeader className="p-0 mb-4 text-left">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-bold">
              {editingBundleId ? "Edit Bundle" : "Create Bundle"}
            </CardTitle>
            {editingBundleId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            )}
          </div>
          <CardDescription>Group multiple courses into a single purchase package.</CardDescription>
        </CardHeader>
        <div className="space-y-4 text-left">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Bundle Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 bg-secondary/30 border-border rounded-xl font-bold"
              placeholder="Mastering AI Bundle"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Description
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 p-4 rounded-xl bg-secondary/30 border-border font-medium text-sm"
              placeholder="Get all our AI courses for one low price..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Bundle Price ($)
            </Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="h-12 bg-secondary/30 border-border rounded-xl font-bold"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Select Courses
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search courses..."
                className="h-10 pl-9 bg-secondary/20 border-border rounded-xl text-xs"
              />
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto p-2 bg-secondary/10 rounded-xl border border-border/50">
              {filteredCourses.map((c: any) => (
                <label
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all",
                    selectedCourses.includes(c.id)
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-white border border-transparent",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedCourses([...selectedCourses, c.id]);
                      else setSelectedCourses(selectedCourses.filter((id) => id !== c.id));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span
                    className={cn(
                      "text-xs font-bold",
                      selectedCourses.includes(c.id) ? "text-primary" : "text-slate-700",
                    )}
                  >
                    {c.title}
                  </span>
                </label>
              ))}
              {filteredCourses.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4 italic">
                  No courses found matching "{searchTerm}"
                </p>
              )}
            </div>
          </div>
          <Button
            className={cn(
              "w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl mt-4 transition-all",
              editingBundleId
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 text-white",
            )}
            onClick={() => createBundleMutation.mutate()}
            disabled={createBundleMutation.isPending || !title || selectedCourses.length === 0}
          >
            {editingBundleId ? "Update Bundle" : "Launch Bundle"}
          </Button>
        </div>
      </Card>

      <div className="lg:col-span-7 space-y-6 text-left">
        <h3 className="font-bold text-slate-800 flex items-center gap-3">
          <Zap className="h-5 w-5 text-indigo-600" /> Active Bundles
        </h3>
        <div className="grid grid-cols-1 gap-6">
          {bundles.map((b: any) => (
            <Card
              key={b.id}
              className="border-border shadow-sm rounded-[2rem] p-8 relative group overflow-hidden bg-white hover:border-primary/30 transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <h4 className="font-black text-xl text-slate-900 tracking-tight">{b.title}</h4>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-md">
                    {b.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-all"
                    onClick={() => handleEdit(b)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl text-slate-300 hover:text-destructive transition-all"
                    onClick={() => deleteBundleMutation.mutate(b.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Included Courses ({b.bundle_courses?.length || 0})
                </p>
                <div className="flex flex-wrap gap-2">
                  {b.bundle_courses?.map((bc: any, idx: number) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-slate-100 text-slate-600 border-none px-3 py-1 rounded-lg text-[10px] font-bold"
                    >
                      {bc.courses?.title}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      Pricing Model
                    </span>
                    <span className="text-2xl font-black text-indigo-600">${b.price}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-100" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      Access
                    </span>
                    <span className="text-sm font-bold text-slate-700">Lifetime</span>
                  </div>
                </div>
                <div className="flex -space-x-3">
                  {b.bundle_courses?.slice(0, 4).map((bc: any, i: number) => (
                    <div
                      key={i}
                      className="h-10 w-10 rounded-xl bg-indigo-100 border-4 border-white flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm"
                      title={bc.courses?.title}
                    >
                      {bc.courses?.title[0]}
                    </div>
                  ))}
                  {b.bundle_courses?.length > 4 && (
                    <div className="h-10 w-10 rounded-xl bg-slate-900 border-4 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                      +{b.bundle_courses.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {bundles.length === 0 && (
            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2.5rem] text-muted-foreground space-y-4">
              <Zap className="h-8 w-8 opacity-10" />
              <p className="italic text-xs font-bold">No active bundles created yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
