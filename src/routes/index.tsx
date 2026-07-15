import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Sparkles,
  Star,
  Users,
  ArrowRight,
  BookOpen,
  Trophy,
  Play,
  TrendingUp,
  Globe,
  ShieldCheck,
  Zap,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

import {
  fetchCourses,
  isSaleActive,
  type Course,
  getCourseEffectivePrice,
} from "@/lib/courses";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "LearnLab — Intelligent AI Learning Platform" },
      {
        name: "description",
        content: "Master AI and modern web development with expert-led courses.",
      },
    ],
  }),
});


function Home() {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  const { data: courses = [] as Course[], isLoading: loadingCourses } = useQuery({
    queryKey: ["featured-courses"],
    queryFn: () => fetchCourses(),
  });


  const TIER_WEIGHTS: Record<string, number> = {
    pro: 4,
    growth: 3,
    starter: 2,
    free: 1,
  };

  const featuredCourses = courses
    .filter(
      (c) => c.status?.toLowerCase() === "published" && (c.adType === "featured" || c.isFeatured),
    )
    .sort((a, b) => (b.adAmountPaid || 0) - (a.adAmountPaid || 0));

  const campaignCourses = courses
    .filter((c) => c.status?.toLowerCase() === "published" && c.isCampaignActive)
    .sort((a, b) => {
      const aWeight = TIER_WEIGHTS[a.instructor?.subscriptionTier || "free"] || 0;
      const bWeight = TIER_WEIGHTS[b.instructor?.subscriptionTier || "free"] || 0;
      if (aWeight !== bWeight) return bWeight - aWeight;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const bestSellingCourses = courses
    .filter((c) => c.status?.toLowerCase() === "published" && (c.students || 0) > 0)
    .sort((a, b) => (b.students || 0) - (a.students || 0))
    .slice(0, 5);

  return (
    <SiteLayout>
      <div className="bg-background font-sans selection:bg-primary/10 selection:text-primary-foreground">
        {/* --- HERO SECTION --- */}
        <section id="hero-section" aria-label="Hero Section" className="relative overflow-hidden pt-20 lg:pt-32 pb-24">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

          <div className="mx-auto max-w-7xl px-6 relative z-10">
            <div className="text-center space-y-10 max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em]"
              >
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                {t("heroSubtitle")}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-6xl lg:text-8xl font-bold tracking-normal text-foreground leading-[0.95]"
              >
                {lang === "th" ? (
                  <span className="whitespace-nowrap">เรียนรู้เหนือความคาดหมาย</span>
                ) : (
                  <>
                    Learn beyond the <br />
                    <span className="text-primary italic">expected.</span>
                  </>
                )}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium"
              >
                {t("heroDesc")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
              >
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-10 text-base font-black rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20"
                >
                  <Link to={user ? "/dashboard" : "/login"} aria-label={user ? "Go to Dashboard" : "Start Journey"}>
                    {user ? t("dashboard") : t("startJourney")}{" "}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 px-10 text-base font-bold rounded-2xl border-border bg-background hover:bg-secondary transition-all"
                >
                  <Link to="/browse" aria-label="View full course catalog">{t("viewCatalog")}</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </section>



        {/* --- PREMIUM CTA - LUXURY REFINEMENT --- */}
        <ScrollReveal>
          <section id="premium-cta-section" aria-label="Premium Call to Action" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
            <div className="group relative overflow-hidden rounded-[3rem] border border-white/5 bg-zinc-950 p-12 text-center shadow-[0_40px_100px_rgba(0,0,0,0.5)] lg:p-20">
              <div className="pointer-events-none absolute -right-24 -top-28 h-[500px] w-[500px] animate-[breathe_8s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.2),transparent_70%)]" />
              <div className="pointer-events-none absolute -bottom-24 -left-20 h-[400px] w-[400px] animate-[breathe_6s_ease-in-out_infinite_reverse] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.14),transparent_70%)]" />

              <div className="relative z-10 mx-auto max-w-4xl space-y-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl"
                >
                  <Sparkles className="h-7 w-7 fill-indigo-400/20 text-indigo-400" />
                </motion.div>

                <h2 className="bg-gradient-to-br from-white via-white to-white/30 bg-clip-text text-[clamp(44px,6.5vw,72px)] font-extrabold italic uppercase leading-[0.92] tracking-normal text-transparent">
                  {lang === "th" ? (
                    <>
                      เริ่มต้น
                      <br />
                      บทใหม่ของคุณ
                    </>
                  ) : (
                    <>
                      Start your
                      <br />
                      next chapter.
                    </>
                  )}
                </h2>

                <p className="mx-auto max-w-xl text-lg font-medium leading-relaxed text-zinc-400">
                  {lang === "th"
                    ? "เข้าร่วมชุมชนของผู้สร้าง เผยแพร่ความเชี่ยวชาญของคุณเอง หรือเริ่มต้นเรียนรู้สิ่งใหม่วันนี้"
                    : "Join a community of builders. Publish your own expertise or master something new today."}
                </p>

                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  {/* shimmer button */}
                  <Button
                    asChild
                    data-magnetic
                    size="lg"
                    className="group/btn relative h-14 overflow-hidden rounded-2xl bg-indigo-600 px-10 text-base font-black text-white shadow-[0_20px_40px_rgba(79,70,229,0.3)] before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:transition-transform before:duration-700 hover:bg-indigo-500 hover:before:translate-x-full active:scale-95"
                  >
                    <Link to={user ? "/dashboard" : "/login"}>
                      <span className="relative z-10 flex items-center gap-2">
                        {user ? t("dashboard") : t("startJourney")}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-2xl border-white/10 bg-white/5 px-10 text-base font-black text-white backdrop-blur-xl hover:bg-white/10 active:scale-95"
                  >
                    <Link to="/browse">{t("viewCatalog")}</Link>
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-6 pt-6 opacity-20">
                  {["Mastery", "Expertise", "Growth"].map((w, i) => (
                    <span key={i} className="flex items-center gap-6">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">
                        {w}
                      </span>
                      {i < 2 && <span className="h-1 w-1 rounded-full bg-white" />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </SiteLayout>
  );
}
