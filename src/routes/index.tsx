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
  fetchBundles,
  type Bundle,
  isSaleActive,
  type Course,
  getCourseEffectivePrice,
} from "@/lib/courses";
import { fetchUserEnrollments } from "@/lib/enrollments";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { createBundleCheckoutSession } from "@/lib/stripe";
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

// --- HELPER: Trust Card ---
function TrustCard({ icon: Icon, label, sub }: any) {
  return (
    <div className="flex flex-col items-center text-center space-y-3 group">
      <div className="h-14 w-14 rounded-2xl bg-background border border-border flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:border-primary/20 group-hover:-translate-y-1 transition-all duration-300">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="font-bold text-sm text-foreground">{label}</p>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          {sub}
        </p>
      </div>
    </div>
  );
}

function Home() {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  const { data: courses = [] as Course[], isLoading: loadingCourses } = useQuery({
    queryKey: ["featured-courses"],
    queryFn: () => fetchCourses(),
  });

  const { data: bundles = [], isLoading: loadingBundles } = useQuery({
    queryKey: ["home-bundles"],
    queryFn: fetchBundles,
  });

  const { data: myEnrollments = [] } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchUserEnrollments(user!.id),
  });

  const getCalculatedBundlePrice = (bundle: Bundle) => {
    if (!user || !bundle.courses || bundle.courses.length === 0) return bundle.price;

    const ownedCourseIds = new Set(myEnrollments.map((e) => e.course_id));

    // Formula: Deduction = (Total Bundle Price / Course Count) * Owned Courses Count
    const totalCourses = bundle.courses.length;
    const avgPrice = bundle.price / totalCourses;

    let ownedInBundleCount = 0;
    bundle.courses.forEach((bc) => {
      if (ownedCourseIds.has(bc.id)) {
        ownedInBundleCount++;
      }
    });

    const totalDeduction = avgPrice * ownedInBundleCount;
    const finalPrice = Math.max(0, bundle.price - totalDeduction);

    return Math.round(finalPrice * 100) / 100;
  };

  const handleBundlePurchase = async (bundle: Bundle) => {
    if (!user) {
      toast.info("Please login to purchase this bundle");
      void navigate({ to: "/login", search: { mode: "login" } });
      return;
    }

    const calculatedAmount = getCalculatedBundlePrice(bundle);

    try {
      const result = await (createBundleCheckoutSession as any)({
        data: {
          bundleId: bundle.id,
          userId: user.id,
          bundleTitle: bundle.title,
          amount: calculatedAmount,
        },
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (err: any) {
      toast.error("Checkout failed: " + err.message);
    }
  };

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
                className="text-6xl lg:text-8xl font-bold tracking-tighter text-foreground leading-[0.95]"
              >
                {lang === "th" ? (
                  "เรียนรู้เหนือความคาดหมาย"
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

        {/* --- TRUST BAR --- */}
        <ScrollReveal>
          <section id="trust-badges-section" aria-label="Platform Trust Badges" className="border-y border-border bg-secondary/30 py-16">
            <div className="mx-auto max-w-7xl px-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
                <TrustCard
                  icon={Users}
                  label={t("trustModernCurriculum")}
                  sub={t("trustExpertGuided")}
                />
                <TrustCard
                  icon={Globe}
                  label={t("trustGlobalAccess")}
                  sub={t("trustLearnAnywhere")}
                />
                <TrustCard
                  icon={ShieldCheck}
                  label={t("trustIndustryStandard")}
                  sub={t("trustVerifiedQuality")}
                />
                <TrustCard icon={Zap} label={t("trustPracticalSkills")} sub={t("trustHandsOn")} />
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* --- FEATURED SECTION --- */}
        {featuredCourses.length > 0 && (
          <ScrollReveal>
            <section id="featured-courses-section" aria-label="Featured Courses" className="py-24 bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[40%] h-full bg-primary/5 blur-[120px] rounded-full translate-x-1/4 pointer-events-none" />
              <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                  <div>
                    <Badge
                      variant="outline"
                      className="mb-4 rounded-full border-primary/20 text-primary px-4 py-1 text-[10px] font-black uppercase tracking-widest"
                    >
                      {t("editorsChoice")}
                    </Badge>
                    <h2 className="text-4xl lg:text-6xl font-black tracking-tighter text-slate-900 leading-none">
                      {lang === "th" ? "หลักสูตร" : "Featured"}{" "}
                      <span className="italic text-primary">
                        {lang === "th" ? "แนะนำ" : "Curriculums"}
                      </span>
                    </h2>
                    <p className="text-muted-foreground text-lg font-medium mt-4 max-w-xl">
                      {t("homeIntroText")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-xl font-bold border-slate-200"
                    >
                      <Link to="/browse" aria-label="View all courses in catalog">
                        {t("viewCatalog")} <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-6 md:-ml-8">
                    {featuredCourses.map((c) => (
                      <CarouselItem key={c.id} className="pl-6 md:pl-8 md:basis-1/2 lg:basis-1/3">
                        <Link
                          to="/courses/$courseId"
                          params={{ courseId: c.id }}
                          className="group block"
                        >
                          <div className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden shadow-2xl mb-6 bg-slate-100">
                            {c.imageUrl ? (
                              <img
                                src={c.imageUrl}
                                className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (target.src.includes("pollinations.ai")) {
                                    const sep = target.src.includes("?") ? "&" : "?";
                                    setTimeout(() => {
                                      target.src = `${target.src}${sep}retry=${Date.now()}`;
                                    }, 2000);
                                  }
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <BookOpen className="h-12 w-12 text-slate-200" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute top-6 left-6 flex flex-col gap-2">
                              <Badge className="bg-primary text-white border-none px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest shadow-xl">
                                ★ Featured
                              </Badge>
                              {isSaleActive(c) && (
                                <Badge className="bg-rose-500 text-white border-none px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest shadow-xl animate-pulse">
                                  ⚡ SALE
                                </Badge>
                              )}
                            </div>
                            <div className="absolute bottom-6 left-6 right-6">
                              <p className="text-[10px] font-black text-primary-foreground/70 uppercase tracking-widest mb-1">
                                {c.category}
                              </p>
                              <h3 className="text-xl font-black text-white leading-tight line-clamp-1">
                                {c.title}
                              </h3>
                            </div>
                          </div>
                        </Link>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* --- SPECIAL MARKETPLACE DEALS (Revenue-share Ads) --- */}
        {campaignCourses.length > 0 && (
          <ScrollReveal>
            <section id="partner-deals-section" aria-label="Special Partner Deals" className="py-24 bg-indigo-50/50 relative overflow-hidden">
              <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-indigo-500/5 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

              <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black tracking-tight uppercase">
                        {lang === "th" ? "ดีลพิเศษจากพาร์ทเนอร์" : "Exclusive Partner Deals"}
                      </h2>
                      <p className="text-sm text-slate-500 font-medium">
                        {lang === "th"
                          ? "แคมเปญราคาพิเศษร่วมกับเหล่ายอดฝีมือของ LearnLab"
                          : "Special campaign pricing in collaboration with LearnLab's top experts"}
                      </p>
                    </div>
                  </div>
                </div>

                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-6">
                    {/* Group items into pairs for 2-row effect */}
                    {Array.from({ length: Math.ceil(campaignCourses.length / 2) }).map((_, i) => {
                      const first = campaignCourses[i * 2];
                      const second = campaignCourses[i * 2 + 1];
                      return (
                        <CarouselItem key={i} className="pl-6 md:basis-1/2 lg:basis-1/3">
                          <div className="flex flex-col gap-6">
                            {/* Row 1 */}
                            {first && (
                              <Card className="group border-none shadow-xl rounded-[2rem] overflow-hidden bg-white hover:-translate-y-2 transition-all duration-500">
                                <Link to="/courses/$courseId" params={{ courseId: first.id }}>
                                  <div className="aspect-video relative overflow-hidden">
                                    {first.imageUrl && (
                                      <img
                                        src={first.imageUrl}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                      />
                                    )}
                                    <div className="absolute top-4 left-4">
                                      <Badge className="bg-indigo-600 text-white border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        {lang === "th" ? "แคมเปญ" : "Campaign"}
                                      </Badge>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                                      <h3 className="text-white font-black text-xl leading-tight line-clamp-1">
                                        {first.title}
                                      </h3>
                                      <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">
                                        {first.category}
                                      </p>
                                    </div>
                                  </div>
                                </Link>
                              </Card>
                            )}
                            {/* Row 2 */}
                            {second && (
                              <Card className="group border-none shadow-xl rounded-[2rem] overflow-hidden bg-white hover:-translate-y-2 transition-all duration-500">
                                <Link to="/courses/$courseId" params={{ courseId: second.id }}>
                                  <div className="aspect-video relative overflow-hidden">
                                    {second.imageUrl && (
                                      <img
                                        src={second.imageUrl}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                      />
                                    )}
                                    <div className="absolute top-4 left-4">
                                      <Badge className="bg-indigo-600 text-white border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        {lang === "th" ? "แคมเปญ" : "Campaign"}
                                      </Badge>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                                      <h3 className="text-white font-black text-xl leading-tight line-clamp-1">
                                        {second.title}
                                      </h3>
                                      <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">
                                        {second.category}
                                      </p>
                                    </div>
                                  </div>
                                </Link>
                              </Card>
                            )}
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                </Carousel>
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* --- LUXURY FEATURED SECTION (Best Sellers) --- */}
        <ScrollReveal>
          <section id="best-sellers-section" aria-label="Best Selling Courses" className="py-32 overflow-hidden relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="mx-auto max-w-7xl px-6 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]"
                  >
                    <TrendingUp className="h-3 w-3" />{" "}
                    {lang === "th" ? "ยอดนิยมในชุมชน" : "Community Favorites"}
                  </motion.div>
                  <h2 className="text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-none">
                    {lang === "th" ? "คอร์ส" : "Best"}{" "}
                    <span className="text-primary italic">
                      {lang === "th" ? "ขายดี" : "Sellers"}
                    </span>
                  </h2>
                  <p className="text-muted-foreground text-xl font-medium max-w-xl leading-relaxed">
                    {lang === "th"
                      ? "เข้าร่วมกับผู้เรียนนับพันในหลักสูตรที่มีชื่อเสียงและมีประสิทธิภาพสูงสุดของเรา"
                      : "Join thousands of learners in our most prestigious and high-impact curriculum."}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <Button
                    asChild
                    variant="link"
                    className="group h-12 p-0 font-black text-sm uppercase tracking-widest text-foreground hover:text-primary transition-colors"
                  >
                    <Link to="/browse" className="flex items-center gap-2">
                      {lang === "th" ? "สำรวจทั้งหมด" : "Explore All"}{" "}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </div>

              {loadingCourses ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse space-y-6">
                      <div className="aspect-[16/10] bg-secondary rounded-[3rem]" />
                      <div className="space-y-3">
                        <div className="h-6 bg-secondary rounded-lg w-3/4" />
                        <div className="h-4 bg-secondary rounded-lg w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                    dragFree: true,
                  }}
                  className="w-full cursor-grab active:cursor-grabbing select-none"
                >
                  <CarouselContent className="-ml-6 md:-ml-10">
                    {bestSellingCourses.map((c, i) => (
                      <CarouselItem key={c.id} className="pl-6 md:pl-10 md:basis-1/2 lg:basis-1/3">
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <Link
                            to="/courses/$courseId"
                            params={{ courseId: c.id }}
                            className="group block relative"
                          >
                            <Card className="group relative overflow-hidden border-none bg-zinc-950/5 shadow-2xl rounded-[3rem] transition-all duration-700 hover:-translate-y-4">
                              {/* Glassmorphism Background */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                              <div className="aspect-[16/11] relative overflow-hidden">
                                {c.imageUrl ? (
                                  <img
                                    src={c.imageUrl}
                                    alt={c.title}
                                    className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110 select-none grayscale-[0.2] group-hover:grayscale-0"
                                    draggable={false}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      if (target.src.includes("pollinations.ai")) {
                                        const sep = target.src.includes("?") ? "&" : "?";
                                        setTimeout(() => {
                                          target.src = `${target.src}${sep}retry=${Date.now()}`;
                                        }, 2000);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                                    <BookOpen className="h-12 w-12 text-zinc-300" />
                                  </div>
                                )}

                                {/* Floating BEST SELLER Badge */}
                                <div className="absolute top-6 right-6 z-40">
                                  <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    whileInView={{ scale: 1, opacity: 1 }}
                                    className="bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 text-white px-4 py-2 rounded-2xl shadow-[0_15px_30px_-5px_rgba(245,158,11,0.6)] border border-white/30 flex items-center gap-2 backdrop-blur-md"
                                  >
                                    <Trophy className="h-4 w-4 fill-white/20 animate-pulse" />
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase tracking-[0.1em] leading-none">
                                        Best
                                      </span>
                                      <span className="text-[10px] font-black uppercase tracking-[0.1em] leading-none">
                                        Seller
                                      </span>
                                    </div>
                                  </motion.div>
                                </div>

                                {/* Category Badge */}
                                <div className="absolute top-6 left-6 z-30">
                                  <Badge className="bg-zinc-950/80 backdrop-blur-xl text-white border-white/10 shadow-2xl font-black text-[9px] uppercase tracking-[0.2em] px-4 py-2 rounded-2xl">
                                    {c.category || "General"}
                                  </Badge>
                                </div>

                                <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                                  <div className="h-20 w-20 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] scale-75 group-hover:scale-100 transition-transform duration-700">
                                    <Play className="h-7 w-7 fill-current ml-1" />
                                  </div>
                                </div>
                              </div>

                              <CardContent className="p-12 relative z-20">
                                <div className="flex items-center gap-3 mb-6">
                                  <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                    <div className="flex items-center gap-0.5 text-amber-500">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={cn(
                                            "h-3 w-3 fill-current",
                                            star > Math.round(c.rating || 0) && "opacity-20",
                                          )}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-amber-600 font-black text-[11px] leading-none">
                                      {c.rating ? c.rating.toFixed(1) : "5.0"}
                                    </span>
                                  </div>
                                  <span className="text-zinc-400 font-black text-[10px] uppercase tracking-widest border-l border-zinc-200 pl-3">
                                    {c.reviews || 0}{" "}
                                    {lang === "th" ? "รีวิวยอดเยี่ยม" : "Excellence Reviews"}
                                  </span>
                                </div>

                                <h3 className="text-3xl font-black tracking-tighter text-zinc-900 leading-[1.1] group-hover:text-primary transition-colors line-clamp-2 h-[4.4rem]">
                                  {c.title}
                                </h3>

                                <div className="mt-12 flex items-center justify-between border-t border-zinc-100 pt-10">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                      {lang === "th" ? "การลงทุน" : "Investment"}
                                    </p>
                                    <div className="flex flex-col">
                                      <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black tracking-tighter text-zinc-950">
                                          ${getCourseEffectivePrice(c)}
                                        </span>
                                        <span className="text-sm font-bold text-zinc-400">USD</span>
                                      </div>
                                      {(isSaleActive(c) || c.isCampaignActive) && (
                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-1">
                                          {isSaleActive(c)
                                            ? lang === "th"
                                              ? `⚡ ลดราคาพิเศษ! (ปกติ: $${c.price})`
                                              : `⚡ Flash Sale (Original: $${c.price})`
                                            : lang === "th"
                                              ? `🤝 แคมเปญพาร์ทเนอร์ (ปกติ: $${c.price})`
                                              : `🤝 Partner Deal (Original: $${c.price})`}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right space-y-1">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                                      {lang === "th" ? "ชุมชน" : "Community"}
                                    </p>
                                    <div className="flex items-center justify-end gap-2">
                                      <Users className="h-4 w-4 text-primary" />
                                      <span className="text-sm font-black text-zinc-950">
                                        {c.students?.toLocaleString() || 0}{" "}
                                        {lang === "th" ? "ผู้เรียนเข้าร่วมแล้ว" : "Students Joined"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              )}
            </div>
          </section>
        </ScrollReveal>

        {/* --- BUNDLES SECTION --- */}
        {bundles.length > 0 && (
          <ScrollReveal>
            <section id="value-bundles-section" aria-label="Value Bundles" className="py-40 bg-[#0a0a0b] text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[160px] rounded-full pointer-events-none" />

              <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="text-center mb-24 space-y-4">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.3em]">
                    {lang === "th" ? "มาตรฐานระดับสถาบัน" : "Institutional Grade"}
                  </Badge>
                  <h2 className="text-6xl lg:text-8xl font-black tracking-tighter leading-none italic uppercase">
                    {lang === "th" ? "แพ็กเกจ" : "Value"}{" "}
                    <span className="text-emerald-400">
                      {lang === "th" ? "สุดคุ้ม" : "Bundles"}
                    </span>
                  </h2>
                  <p className="text-slate-400 text-xl font-medium max-w-2xl mx-auto">
                    {lang === "th"
                      ? "เร่งเส้นทางอาชีพของคุณด้วยเส้นทางหลายหลักสูตรที่คัดสรรมาเป็นพิเศษในราคาพิเศษ"
                      : "Accelerate your career trajectory with curated multi-course paths at an exclusive investment rate."}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {bundles.map((b: Bundle) => {
                    const calculatedPrice = getCalculatedBundlePrice(b);
                    const isDiscounted = calculatedPrice < b.price;
                    const ownedCount = b.courses.filter((bc) =>
                      myEnrollments.some((e) => e.course_id === bc.id),
                    ).length;
                    const allOwned = ownedCount === b.courses.length && b.courses.length > 0;

                    return (
                      <Card
                        key={b.id}
                        className="bg-zinc-900/50 border border-white/10 rounded-[4rem] p-12 hover:border-emerald-500/40 transition-all duration-700 group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Zap className="h-40 w-40 text-emerald-400" />
                        </div>

                        <div className="flex flex-col h-full relative z-10">
                          <div className="flex justify-between items-start mb-12">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/30 text-emerald-400 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg"
                                >
                                  {lang === "th" ? "เส้นทางสู่ความเชี่ยวชาญ" : "Mastery Path"}
                                </Badge>
                                {isDiscounted && (
                                  <Badge className="bg-amber-500 text-white border-none px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                                    {lang === "th"
                                      ? "ใช้ส่วนลดจากคอร์สที่เป็นเจ้าของแล้ว"
                                      : "Partial Own Applied"}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-4xl font-black tracking-tight leading-none group-hover:text-emerald-400 transition-colors">
                                {b.title}
                              </h3>
                              <p className="text-slate-400 text-base font-medium leading-relaxed max-w-md">
                                {b.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">
                                {lang === "th" ? "การลงทุนสำหรับแพ็กเกจ" : "Bundle Investment"}
                              </p>
                              <div className="flex flex-col items-end">
                                <div className="flex items-baseline justify-end gap-1">
                                  <span className="text-5xl font-black text-white">
                                    ${calculatedPrice}
                                  </span>
                                  <span className="text-sm font-bold text-slate-500 uppercase">
                                    USD
                                  </span>
                                </div>
                                {isDiscounted && (
                                  <span className="text-sm font-bold text-slate-500 line-through mt-1">
                                    {lang === "th" ? "ปกติ" : "Was"} ${b.price}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6 mb-12 flex-1">
                            <div className="flex items-center gap-4">
                              <div className="h-px flex-1 bg-white/10" />
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] whitespace-nowrap">
                                {lang === "th" ? "หลักสูตรที่รวมอยู่" : "Included Curriculums"}
                              </p>
                              <div className="h-px flex-1 bg-white/10" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {b.courses.map((course) => {
                                const isOwned = myEnrollments.some(
                                  (e) => e.course_id === course.id,
                                );
                                return (
                                  <Link
                                    key={course.id}
                                    to="/courses/$courseId"
                                    params={{ courseId: course.id }}
                                    className={cn(
                                      "flex items-center justify-between p-4 rounded-[1.5rem] border transition-all group/item",
                                      isOwned
                                        ? "bg-emerald-500/10 border-emerald-500/20"
                                        : "bg-white/5 border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20",
                                    )}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className={cn(
                                          "h-2 w-2 rounded-full transition-transform",
                                          isOwned
                                            ? "bg-emerald-400 scale-125 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                                            : "bg-emerald-500 group-hover/item:scale-125",
                                        )}
                                      />
                                      <div className="min-w-0">
                                        <p
                                          className={cn(
                                            "text-sm font-bold truncate",
                                            isOwned ? "text-emerald-400" : "text-slate-200",
                                          )}
                                        >
                                          {course.title}
                                        </p>
                                        {isOwned && (
                                          <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest leading-none mt-0.5">
                                            {lang === "th" ? "เป็นเจ้าของแล้ว" : "Asset Owned"}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    {isOwned ? (
                                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                    ) : (
                                      <ArrowUpRight className="h-4 w-4 text-slate-600 group-hover/item:text-emerald-400 transition-colors shrink-0" />
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>

                          <Button
                            onClick={() => !allOwned && handleBundlePurchase(b)}
                            disabled={allOwned}
                            className={cn(
                              "w-full h-16 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all group/btn",
                              allOwned
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20",
                            )}
                          >
                            <span className="flex items-center gap-3">
                              {allOwned ? (
                                lang === "th" ? (
                                  "ปลดล็อกเส้นทางนี้ทั้งหมดแล้ว"
                                ) : (
                                  "Path Fully Unlocked"
                                )
                              ) : (
                                <>
                                  {lang === "th"
                                    ? "ปลดล็อกการเข้าถึงเส้นทางนี้"
                                    : "Unlock Path Access"}{" "}
                                  <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                </>
                              )}
                            </span>
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </section>
          </ScrollReveal>
        )}

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

                <h2 className="bg-gradient-to-br from-white via-white to-white/30 bg-clip-text text-[clamp(44px,6.5vw,72px)] font-extrabold italic uppercase leading-[0.92] tracking-[-0.04em] text-transparent">
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
