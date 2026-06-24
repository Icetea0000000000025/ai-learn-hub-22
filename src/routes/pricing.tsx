import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Building2,
  Users,
  BarChart2,
  ShieldCheck,
  Zap,
  Globe,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { createSubscriptionCheckoutSession, createAdCheckoutSession } from "@/lib/stripe";
import { updateCourse } from "@/lib/courses";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
  head: () => ({ meta: [{ title: "Institutional Pricing — LearnLab" }] }),
});

function Pricing() {
  const { lang, t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for Ad/Campaign Modals
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [selectedAdPackage, setSelectedAdPackage] = useState<{
    days: number;
    price: number;
  } | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's courses for the selection modal
  const { data: myCourses = [] } = useQuery({
    queryKey: ["my-courses-for-ads", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, status, ad_type, is_campaign_active")
        .eq("creator_id", user.id)
        .eq("status", "published");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSubscriptionPurchase = async (tierId: string, amount: string | number) => {
    if (!user) {
      toast.info(lang === "th" ? "กรุณาเข้าสู่ระบบก่อน" : "Please login first");
      navigate({ to: "/login", search: { mode: "login" } });
      return;
    }

    // Free tier is just a conceptual tier, we don't buy it.
    if (amount === "0" || amount === 0) {
      toast.success(
        lang === "th" ? "คุณอยู่ในแพลนฟรีอยู่แล้ว" : "You are already on the free plan",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      // Remove commas from amount (e.g. "2,499" -> 2499)
      const numericAmount =
        typeof amount === "string" ? parseInt(amount.replace(/,/g, "")) : amount;

      const result = await (createSubscriptionCheckoutSession as any)({
        data: {
          tier: tierId.split(" ")[0].toLowerCase(), // e.g., "Starter" -> "starter"
          userId: user.id,
          amount: numericAmount,
        },
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyAd = async (courseId: string, courseTitle: string) => {
    if (!selectedAdPackage || !user) return;
    try {
      setIsSubmitting(true);
      const result = await (createAdCheckoutSession as any)({
        data: {
          courseId,
          courseTitle,
          userId: user.id,
          durationDays: selectedAdPackage.days,
          amount: selectedAdPackage.price,
          adType: "featured",
        },
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, isCampaignActive }: { id: string; isCampaignActive: boolean }) => {
      await (updateCourse as any)({
        data: { id, updates: { isCampaignActive }, userId: user?.id },
      });
    },
    onSuccess: (_, variables) => {
      const msg = variables.isCampaignActive
        ? lang === "th"
          ? "เข้าร่วมแคมเปญสำเร็จ!"
          : "Successfully joined campaign!"
        : lang === "th"
          ? "ยกเลิกการเข้าร่วมสำเร็จ"
          : "Successfully left campaign";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["my-courses-for-ads", user?.id] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update campaign status"),
  });

  const handleToggleCampaign = (courseId: string, currentStatus: boolean) => {
    updateCourseMutation.mutate({ id: courseId, isCampaignActive: !currentStatus });
  };

  const individualTiers = [
    {
      name: lang === "th" ? "Free (ฟรี)" : "Free",
      price: "0",
      desc:
        lang === "th"
          ? "ทดลองระบบและสร้างคอร์สแรก"
          : "Test the system and create your first course",
      features:
        lang === "th"
          ? ["ส่วนแบ่งรายได้ 20%", "สร้างคอร์สด้วย AI ฟรี 2 ครั้ง", "เครื่องมือจัดการพื้นฐาน"]
          : ["20% Revenue Share", "2 Free AI Course Creations", "Basic Management Tools"],
    },
    {
      name: lang === "th" ? "Starter (เริ่มต้น)" : "Starter",
      price: "299",
      desc: lang === "th" ? "สำหรับผู้เริ่มต้นสร้างรายได้" : "For growing creators",
      features:
        lang === "th"
          ? [
              "ส่วนแบ่งรายได้ 12%",
              "สร้างคอร์สด้วย AI 10 ครั้ง/เดือน",
              "ฟีเจอร์ดันคอร์ส (Boost)",
              "วิเคราะห์ข้อมูลเบื้องต้น",
            ]
          : [
              "12% Revenue Share",
              "10 AI Course Creations / mo",
              "Course Boost Options",
              "Basic Analytics",
            ],
      featured: true,
    },
    {
      name: lang === "th" ? "Growth (เติบโต)" : "Growth",
      price: "879",
      desc: lang === "th" ? "สำหรับมืออาชีพและเอเจนซี่" : "For professionals & agencies",
      features:
        lang === "th"
          ? [
              "ส่วนแบ่งรายได้ 10%",
              "สร้างคอร์สด้วย AI 30 ครั้ง/เดือน",
              "การวิเคราะห์ขั้นสูง",
              "สิทธิ์เข้าถึงฟีเจอร์ใหม่ก่อนใคร",
            ]
          : [
              "10% Revenue Share",
              "30 AI Course Creations / mo",
              "Advanced Analytics",
              "Priority Feature Access",
            ],
    },
    {
      name: lang === "th" ? "Pro (โปร)" : "Pro",
      price: "2,499",
      desc: lang === "th" ? "ขีดสุดของการสร้างคอร์ส" : "Ultimate creation power",
      features:
        lang === "th"
          ? [
              "ส่วนแบ่งรายได้ 5%",
              "สร้างคอร์สด้วย AI ไม่จำกัด*",
              "White-label (เร็วๆ นี้)",
              "ผู้ช่วยส่วนตัวดูแลบัญชี",
            ]
          : [
              "5% Revenue Share",
              "Unlimited AI Course Creations*",
              "White-label (Coming Soon)",
              "Dedicated Account Support",
            ],
    },
  ];

  const enterpriseTiers = [
    {
      name: lang === "th" ? "Team Starter (เริ่มต้นทีม)" : "Team Starter",
      price: lang === "th" ? "1,790" : "1,790",
      suffix: lang === "th" ? "/ เดือน" : "/ Month",
      desc: lang === "th" ? "สร้างทีมผู้เรียนทีมแรกของคุณ" : "Build your first workforce",
      features:
        lang === "th"
          ? [
              "ที่นั่งสมาชิกสูงสุด 10 ที่นั่ง",
              "การจัดการที่นั่งขั้นพื้นฐาน",
              "รายงานทีมมาตรฐาน",
              "หน้าตาองค์กรเดี่ยว",
            ]
          : [
              "Up to 10 Member Seats",
              "Basic Seat Management",
              "Standard Team Reports",
              "Single Org Identity",
            ],
      cta: lang === "th" ? "เริ่มต้นใช้งานสำหรับทีม" : "Initialize Team",
      icon: Users,
    },
    {
      name: lang === "th" ? "Enterprise Elite (องค์กร)" : "Enterprise Elite",
      price: lang === "th" ? "3,590" : "3,590",
      suffix: lang === "th" ? "/ เดือน" : "/ Month",
      desc: lang === "th" ? "การฝึกอบรมระดับสถาบันขนาดใหญ่" : "Institutional scale training",
      features:
        lang === "th"
          ? [
              "จัดสรรที่นั่งได้ไม่จำกัด",
              "รายงานผลการเรียนของพนักงาน (CSV/PDF)",
              "ระบบวิเคราะห์การเรียนรู้ด้วย AI",
              "White-label พอร์ทัลเฉพาะแบรนด์ (เร็วๆ นี้)",
              "ผู้ดูแลบัญชีส่วนตัวตลอด 24/7",
            ]
          : [
              "Unlimited Seat Allocation",
              "Workforce Audit (CSV/PDF)",
              "AI Learning Intelligence",
              "White-label Portal (Coming Soon)",
              "24/7 Account Manager",
            ],
      cta: lang === "th" ? "เริ่มต้นระดับองค์กร" : "Launch Enterprise",
      highlight: true,
      icon: Building2,
    },
  ];

  return (
    <SiteLayout>
      <div className="min-h-screen bg-[#f8fafc] pb-32">
        {/* Header Section */}
        <div className="bg-white border-b border-slate-200 pt-32 pb-16">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4"
            >
              <ShieldCheck className="h-3 w-3" />{" "}
              {lang === "th" ? "การลงทุนระดับมืออาชีพ" : "Professional Investment"}
            </motion.div>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 uppercase italic">
              {lang === "th" ? "ยกระดับ" : "Scale your"}{" "}
              <span className="text-indigo-600">
                {lang === "th" ? "ความรู้และความสามารถ" : "Intelligence."}
              </span>
            </h1>
            <p className="mt-4 text-slate-500 font-medium text-lg max-w-2xl mx-auto">
              {lang === "th"
                ? "เลือกเส้นทางที่เหมาะสมสำหรับการเติบโตส่วนบุคคลหรือการฝึกอบรมทีมงานระดับโลกของคุณ"
                : "Choose the right path for your personal growth or global workforce training."}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 -mt-12 space-y-24">
          {/* Individual Section */}
          <section className="space-y-10">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                {lang === "th" ? "ความเชี่ยวชาญเฉพาะบุคคล" : "Individual Mastery"}
              </h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {individualTiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={cn(
                    "border-none shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden group",
                    tier.featured
                      ? "bg-slate-900 text-white shadow-indigo-200/50 scale-105 z-10"
                      : "bg-white text-slate-900",
                  )}
                >
                  <CardContent className="p-10 space-y-10">
                    <div className="space-y-2">
                      <p
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          tier.featured ? "text-indigo-400" : "text-slate-400",
                        )}
                      >
                        {tier.name}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black tracking-tighter">{tier.price}</span>
                        <span
                          className={cn("text-xs font-bold uppercase tracking-widest opacity-40")}
                        >
                          THB
                        </span>
                      </div>
                      <p className="text-sm font-medium opacity-60">{tier.desc}</p>
                    </div>

                    <ul className="space-y-4">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <Check
                            className={cn(
                              "h-4 w-4 mt-0.5 shrink-0",
                              tier.featured ? "text-indigo-400" : "text-indigo-600",
                            )}
                          />
                          <span className="text-sm font-medium leading-none">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        "w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95",
                        tier.featured
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200",
                      )}
                      onClick={() => handleSubscriptionPurchase(tier.name, tier.price)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : lang === "th" ? (
                        "เริ่มต้นใช้งาน"
                      ) : (
                        "Start Now"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Ads Section */}
          <section className="space-y-12">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                {lang === "th" ? "โปรโมตหลักสูตรของคุณ" : "Promote Your Courses"}
              </h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <Card className="bg-white border-2 border-dashed border-indigo-200 p-10 rounded-[2.5rem] shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">
                      {lang === "th" ? "Featured Placement (ดันคอร์ส)" : "Featured Placement"}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {lang === "th"
                        ? "ขึ้นหน้าแรกและอันดับต้นๆ ของหมวดหมู่"
                        : "Top spots in home and categories"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { days: 3, price: 89 },
                    { days: 7, price: 199 },
                    { days: 14, price: 349 },
                    { days: 30, price: 699 },
                  ].map((ad) => (
                    <button
                      key={ad.days}
                      onClick={() => {
                        if (!user) {
                          toast.info(lang === "th" ? "กรุณาเข้าสู่ระบบก่อน" : "Please login first");
                          navigate({ to: "/login", search: { mode: "login" } });
                          return;
                        }
                        setSelectedAdPackage(ad);
                        setIsAdModalOpen(true);
                      }}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-95 cursor-pointer text-left w-full"
                    >
                      <span className="text-xs font-black uppercase tracking-tighter text-slate-500">
                        {ad.days} {lang === "th" ? "วัน" : "Days"}
                      </span>
                      <span className="text-lg font-black text-indigo-600">
                        {ad.price} <small className="text-[8px] opacity-60">THB</small>
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="bg-indigo-600 p-10 rounded-[2.5rem] shadow-xl text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                    <BarChart2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">
                      {lang === "th" ? "Revenue-share Ads (แคมเปญ)" : "Revenue-share Ads"}
                    </h3>
                    <p className="text-sm text-indigo-100 font-medium">
                      {lang === "th" ? "จ่ายเฉพาะเมื่อขายได้จริง" : "Pay only when you sell"}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium leading-relaxed mb-8 opacity-80">
                  {lang === "th"
                    ? "เข้าร่วมแคมเปญโปรโมตหน้าแรกฟรี! โดยมอบส่วนลด 10% ให้ลูกค้า และเพิ่มส่วนแบ่งให้แพลตฟอร์ม 5% (รวมหักเพิ่ม 15% จากเรตปกติ) เพื่อขยายฐานผู้เรียนให้กว้างขวางขึ้น"
                    : "Join homepage campaigns for free! Offer 10% discount to customers and +5% platform fee (total +15% on your base rate) to scale your student base."}
                </p>
                <button
                  onClick={() => {
                    if (!user) {
                      toast.info(lang === "th" ? "กรุณาเข้าสู่ระบบก่อน" : "Please login first");
                      navigate({ to: "/login", search: { mode: "login" } });
                      return;
                    }
                    setIsCampaignModalOpen(true);
                  }}
                  className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center w-full hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-xs font-black uppercase tracking-widest">
                    {lang === "th" ? "เริ่มโปรโมตวันนี้" : "Start Promoting Today"}
                  </span>
                </button>
              </Card>
            </div>
          </section>

          {/* Enterprise Section */}
          <section className="space-y-12">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                {lang === "th" ? "บริการสำหรับสถาบันและองค์กร" : "Institutional B2B"}
              </h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {enterpriseTiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={cn(
                    "border-none shadow-2xl rounded-[3rem] p-12 transition-all duration-700 relative overflow-hidden group",
                    tier.highlight
                      ? "bg-slate-900 text-white shadow-[0_40px_100px_-20px_rgba(79,70,229,0.3)] border border-indigo-500/20"
                      : "bg-white text-slate-900 border border-slate-100",
                  )}
                >
                  {/* Decorative Icon Background */}
                  <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                    <tier.icon className={cn("h-48 w-48", tier.highlight && "text-indigo-500")} />
                  </div>

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-12">
                      <div className="space-y-3">
                        <div
                          className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center mb-6",
                            tier.highlight
                              ? "bg-indigo-600/30 text-indigo-400 border border-indigo-500/50"
                              : "bg-indigo-50 text-indigo-600",
                          )}
                        >
                          <tier.icon className="h-6 w-6" />
                        </div>
                        <h3
                          className={cn(
                            "text-3xl font-black tracking-tight uppercase leading-none",
                            tier.highlight ? "text-white" : "text-slate-900",
                          )}
                        >
                          {tier.name}
                        </h3>
                        <p
                          className={cn(
                            "text-base font-medium",
                            tier.highlight ? "text-slate-400" : "text-slate-500",
                          )}
                        >
                          {tier.desc}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest mb-1 opacity-60",
                          )}
                        >
                          {lang === "th" ? "การลงทุน" : "Investment"}
                        </p>
                        <div className="flex items-baseline justify-end gap-1">
                          <span
                            className={cn(
                              "text-5xl font-black tracking-tighter",
                              tier.highlight && "text-indigo-400",
                            )}
                          >
                            {tier.price}
                          </span>
                          <span className="text-xs font-bold text-slate-500 uppercase">
                            {tier.suffix}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-12 flex-1">
                      {tier.features.map((f) => (
                        <div key={f} className="flex items-center gap-3">
                          <Check
                            className={cn(
                              "h-4 w-4",
                              tier.highlight ? "text-emerald-400" : "text-emerald-500",
                            )}
                          />
                          <span
                            className={cn(
                              "text-sm font-bold tracking-tight",
                              tier.highlight ? "text-white" : "text-slate-600",
                            )}
                          >
                            {f}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className={cn(
                        "w-full h-16 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-95",
                        tier.highlight
                          ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/30"
                          : "bg-slate-900 text-white hover:bg-slate-800",
                      )}
                      asChild
                    >
                      <Link to="/organization">
                        {tier.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center pt-10">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                {lang === "th"
                  ? "ได้รับการสนับสนุนโดยมาตรฐานระดับโลก"
                  : "Supported by Global Standards"}
              </p>
              <div className="flex justify-center gap-12 mt-8 opacity-20 grayscale transition-all hover:grayscale-0 cursor-default">
                <ShieldCheck className="h-8 w-8" />
                <Globe className="h-8 w-8" />
                <Zap className="h-8 w-8" />
                <BarChart2 className="h-8 w-8" />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Ad Purchase Modal */}
      <Dialog open={isAdModalOpen} onOpenChange={setIsAdModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              {lang === "th" ? "เลือกคอร์สที่จะโปรโมต" : "Select Course to Promote"}
            </DialogTitle>
            <DialogDescription>
              {lang === "th"
                ? `แพ็กเกจ: ${selectedAdPackage?.days} วัน (${selectedAdPackage?.price} THB)`
                : `Package: ${selectedAdPackage?.days} Days (${selectedAdPackage?.price} THB)`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {myCourses.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-4">
                {lang === "th"
                  ? "คุณยังไม่มีคอร์สที่เผยแพร่แล้ว"
                  : "You don't have any published courses yet."}
              </p>
            ) : (
              myCourses.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50"
                >
                  <div className="min-w-0 pr-4 flex-1">
                    <p className="font-bold text-sm truncate">{c.title}</p>
                    {c.ad_type === "featured" && (
                      <Badge className="mt-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-[10px] border-none">
                        {lang === "th" ? "โปรโมตอยู่" : "Currently Promoted"}
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => handleBuyAd(c.id, c.title)}
                    disabled={isSubmitting || c.ad_type === "featured"}
                    className="bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black uppercase"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : lang === "th" ? (
                      "เลือก"
                    ) : (
                      "Select"
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Join Modal */}
      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              {lang === "th" ? "เลือกคอร์สร่วมแคมเปญ" : "Select Course for Campaign"}
            </DialogTitle>
            <DialogDescription>
              {lang === "th"
                ? "ฟรีค่าเข้าร่วม! (หักส่วนแบ่งเพิ่ม 15% เมื่อขายได้)"
                : "Free to join! (+15% fee applied on sale)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {myCourses.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-4">
                {lang === "th"
                  ? "คุณยังไม่มีคอร์สที่เผยแพร่แล้ว"
                  : "You don't have any published courses yet."}
              </p>
            ) : (
              myCourses.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50"
                >
                  <div className="min-w-0 pr-4 flex-1">
                    <p className="font-bold text-sm truncate">{c.title}</p>
                    {c.is_campaign_active && (
                      <Badge className="mt-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] border-none">
                        {lang === "th" ? "เข้าร่วมอยู่" : "Active in Campaign"}
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => handleToggleCampaign(c.id, c.is_campaign_active)}
                    disabled={updateCourseMutation.isPending}
                    variant={c.is_campaign_active ? "outline" : "default"}
                    className={cn(
                      "rounded-xl text-xs font-black uppercase min-w-[80px]",
                      c.is_campaign_active
                        ? "border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white",
                    )}
                  >
                    {updateCourseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : c.is_campaign_active ? (
                      lang === "th" ? (
                        "ยกเลิก"
                      ) : (
                        "Leave"
                      )
                    ) : lang === "th" ? (
                      "เข้าร่วม"
                    ) : (
                      "Join"
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
