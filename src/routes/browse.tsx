import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchCourses, isSaleActive, type Course, getCourseEffectivePrice } from "@/lib/courses";
import { fetchUserEnrollments } from "@/lib/enrollments";
import { useAuth } from "@/lib/auth";
import {
  Star,
  Search,
  BookOpen,
  Play,
  Sparkles,
  BarChart3,
  Calendar,
  Trophy,
  DollarSign,
  XCircle,
  CheckCircle2,
  Circle,
  LayoutGrid,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  X,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { z } from "zod";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Language } from "@/lib/i18n";

const browseSearchSchema = z.object({
  search: z.string().catch("").optional(),
  category: z.string().catch("").optional(),
  level: z.enum(["all", "Beginner", "Intermediate", "Advanced"]).catch("all").optional(),
  status: z.enum(["all", "enrolled", "not-enrolled"]).catch("all").optional(),
  pricing: z.enum(["all", "free", "paid"]).catch("all").optional(),
  sort: z
    .enum(["newest", "rating", "price-asc", "price-desc", "popularity"])
    .catch("popularity")
    .optional(),
});

export const Route = createFileRoute("/browse")({
  validateSearch: (search) => browseSearchSchema.parse(search),
  component: Browse,
  head: () => ({ meta: [{ title: "Curriculum Catalog — LearnLab" }] }),
});

type SortOption = "newest" | "rating" | "price-asc" | "price-desc" | "popularity";
type LevelOption = "all" | "Beginner" | "Intermediate" | "Advanced";
type StatusOption = "all" | "enrolled" | "not-enrolled";
type PricingOption = "all" | "free" | "paid";

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Intermediate: "bg-amber-100 text-amber-700 border-amber-200",
  Advanced: "bg-rose-100 text-rose-700 border-rose-200",
};

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  rating: "Top Rated",
  popularity: "Most Popular",
  "price-asc": "Price ↑",
  "price-desc": "Price ↓",
};

// ── Browse page string table (all 6 languages) ──────────────────────────────
const browseStrings: Record<Language, Record<string, string>> = {
  en: {
    promoted: "Promoted",
    bestSeller: "Best Seller",
    flashSale: "Flash Sale",
    enrolled: "Enrolled",
    free: "Free",
    learnMore: "Learn More →",
    exclusivePartnerDeal: "Exclusive Partner Deal",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    levelAny: "Any",
    levelAll: "All Levels",
    // Hero
    heroLine1: "Find Your Next",
    heroHighlight: "Skill",
    heroCourseDesc: "professional courses across design, business, and tech.",
    // Quick stats
    statCourses: "Courses",
    statLearners: "Learners",
    statCategories: "Categories",
    // Toolbar
    filters: "Filters",
    results: "results",
    // Sidebar section titles
    categoryTitle: "Category",
    allCategories: "All Categories",
    levelTitle: "Level",
    pricingTitle: "Pricing",
    pricingAny: "Any",
    statusTitle: "Status",
    allCourses: "All Courses",
    // AI CTA
    aiCtaTitle: "Build a custom path",
    aiCtaDesc: "Let Gemini generate a course tailored to your exact learning goals.",
    aiCtaBtn: "Launch AI Lab",
    // Empty state
    emptyAdjust: "Try adjusting your search terms or removing some filters.",
  },
  th: {
    promoted: "คอร์สแนะนำ",
    bestSeller: "คอร์สขายดี",
    flashSale: "ลดราคาพิเศษ",
    enrolled: "ลงทะเบียนแล้ว",
    free: "ฟรี",
    learnMore: "เรียนรู้เพิ่มเติม →",
    exclusivePartnerDeal: "ดีลพิเศษสำหรับพาร์ทเนอร์",
    beginner: "เริ่มต้น",
    intermediate: "ปานกลาง",
    advanced: "ขั้นสูง",
    levelAny: "ทั้งหมด",
    levelAll: "ทุกระดับ",
    // Hero
    heroLine1: "ค้นหา",
    heroHighlight: "ทักษะถัดไปของคุณ",
    heroCourseDesc: "หลักสูตรระดับมืออาชีพในด้านการออกแบบ ธุรกิจ และเทคโนโลยี",
    // Quick stats
    statCourses: "คอร์ส",
    statLearners: "ผู้เรียน",
    statCategories: "หมวดหมู่",
    // Toolbar
    filters: "ตัวกรอง",
    results: "รายการ",
    // Sidebar section titles
    categoryTitle: "หมวดหมู่",
    allCategories: "ทุกหมวดหมู่",
    levelTitle: "ระดับ",
    pricingTitle: "ราคา",
    pricingAny: "ทั้งหมด",
    statusTitle: "สถานะ",
    allCourses: "คอร์สทั้งหมด",
    // AI CTA
    aiCtaTitle: "สร้างเส้นทางของคุณเอง",
    aiCtaDesc: "ให้ Gemini สร้างคอร์สที่ปรับแต่งให้ตรงกับเป้าหมายการเรียนรู้ของคุณอย่างแม่นยำ",
    aiCtaBtn: "เริ่มต้นสร้างด้วย AI",
    // Empty state
    emptyAdjust: "ลองปรับคำค้นหาหรือลบตัวกรองบางตัวออก",
  },
  es: {
    promoted: "Destacado",
    bestSeller: "Más Vendido",
    flashSale: "Oferta Flash",
    enrolled: "Inscrito",
    free: "Gratis",
    learnMore: "Saber Más →",
    exclusivePartnerDeal: "Oferta Exclusiva de Socio",
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzado",
    levelAny: "Cualquiera",
    levelAll: "Todos los Niveles",
    // Hero
    heroLine1: "Encuentra Tu Próxima",
    heroHighlight: "Habilidad",
    heroCourseDesc: "cursos profesionales en diseño, negocios y tecnología.",
    // Quick stats
    statCourses: "Cursos",
    statLearners: "Estudiantes",
    statCategories: "Categorías",
    // Toolbar
    filters: "Filtros",
    results: "resultados",
    // Sidebar section titles
    categoryTitle: "Categoría",
    allCategories: "Todas las Categorías",
    levelTitle: "Nivel",
    pricingTitle: "Precio",
    pricingAny: "Cualquiera",
    statusTitle: "Estado",
    allCourses: "Todos los Cursos",
    // AI CTA
    aiCtaTitle: "Crea un camino personalizado",
    aiCtaDesc: "Deja que Gemini genere un curso adaptado a tus objetivos de aprendizaje.",
    aiCtaBtn: "Abrir AI Lab",
    // Empty state
    emptyAdjust: "Intenta ajustar los términos de búsqueda o eliminar algunos filtros.",
  },
  ja: {
    promoted: "おすすめ",
    bestSeller: "ベストセラー",
    flashSale: "フラッシュセール",
    enrolled: "受講中",
    free: "無料",
    learnMore: "詳しく見る →",
    exclusivePartnerDeal: "限定パートナー特典",
    beginner: "初級",
    intermediate: "中級",
    advanced: "上級",
    levelAny: "すべて",
    levelAll: "全レベル",
    // Hero
    heroLine1: "次のスキルを",
    heroHighlight: "見つけよう",
    heroCourseDesc: "デザイン・ビジネス・テクノロジーの専門コース",
    // Quick stats
    statCourses: "コース",
    statLearners: "受講者",
    statCategories: "カテゴリー",
    // Toolbar
    filters: "フィルター",
    results: "件",
    // Sidebar section titles
    categoryTitle: "カテゴリー",
    allCategories: "すべてのカテゴリー",
    levelTitle: "レベル",
    pricingTitle: "価格",
    pricingAny: "すべて",
    statusTitle: "ステータス",
    allCourses: "すべてのコース",
    // AI CTA
    aiCtaTitle: "カスタムパスを作成",
    aiCtaDesc: "Geminiがあなたの学習目標に合わせたコースを生成します。",
    aiCtaBtn: "AI Labを起動",
    // Empty state
    emptyAdjust: "検索条件を変更するか、フィルターを外してみてください。",
  },
  zh: {
    promoted: "推荐课程",
    bestSeller: "畅销课程",
    flashSale: "限时特卖",
    enrolled: "已报名",
    free: "免费",
    learnMore: "了解更多 →",
    exclusivePartnerDeal: "独家合作优惠",
    beginner: "初级",
    intermediate: "中级",
    advanced: "高级",
    levelAny: "全部",
    levelAll: "所有级别",
    // Hero
    heroLine1: "发现你的下一个",
    heroHighlight: "技能",
    heroCourseDesc: "涵盖设计、商业和技术的专业课程。",
    // Quick stats
    statCourses: "课程",
    statLearners: "学员",
    statCategories: "分类",
    // Toolbar
    filters: "筛选",
    results: "个结果",
    // Sidebar section titles
    categoryTitle: "分类",
    allCategories: "所有分类",
    levelTitle: "级别",
    pricingTitle: "价格",
    pricingAny: "全部",
    statusTitle: "状态",
    allCourses: "全部课程",
    // AI CTA
    aiCtaTitle: "构建专属学习路径",
    aiCtaDesc: "让 Gemini 根据您的学习目标生成定制课程。",
    aiCtaBtn: "启动 AI 实验室",
    // Empty state
    emptyAdjust: "请尝试调整搜索词或移除部分筛选条件。",
  },
  ko: {
    promoted: "추천 강좌",
    bestSeller: "베스트셀러",
    flashSale: "특가 세일",
    enrolled: "수강 중",
    free: "무료",
    learnMore: "자세히 보기 →",
    exclusivePartnerDeal: "독점 파트너 혜택",
    beginner: "초급",
    intermediate: "중급",
    advanced: "고급",
    levelAny: "전체",
    levelAll: "모든 레벨",
    // Hero
    heroLine1: "다음 스킬을",
    heroHighlight: "찾아보세요",
    heroCourseDesc: "디자인, 비즈니스, 기술 분야의 전문 강좌.",
    // Quick stats
    statCourses: "강좌",
    statLearners: "수강생",
    statCategories: "카테고리",
    // Toolbar
    filters: "필터",
    results: "개 결과",
    // Sidebar section titles
    categoryTitle: "카테고리",
    allCategories: "모든 카테고리",
    levelTitle: "레벨",
    pricingTitle: "가격",
    pricingAny: "전체",
    statusTitle: "상태",
    allCourses: "전체 강좌",
    // AI CTA
    aiCtaTitle: "맞춤 학습 경로 만들기",
    aiCtaDesc: "Gemini가 당신의 학습 목표에 맞는 강좌를 생성해 드립니다.",
    aiCtaBtn: "AI Lab 시작",
    // Empty state
    emptyAdjust: "검색어를 수정하거나 일부 필터를 제거해 보세요.",
  },
};

function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold tracking-wide"
    >
      {label}
      <button onClick={onRemove} className="opacity-60 hover:opacity-100 transition-opacity">
        <X className="h-3 w-3" />
      </button>
    </motion.span>
  );
}

function CourseCard({
  course,
  index,
  isBestSeller,
  isEnrolled,
}: {
  course: any;
  index: number;
  isBestSeller: boolean;
  isEnrolled: boolean;
}) {
  const { lang, t } = useI18n();
  const [hovered, setHovered] = useState(false);

  // Helper: look up a key from browseStrings for the current language
  const s = (key: string) => browseStrings[lang as Language]?.[key] ?? browseStrings.en[key];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to="/courses/$courseId"
        params={{ courseId: course.id }}
        className="group block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Thumbnail */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-100 aspect-[16/10] mb-5">
          {course.imageUrl ? (
            <img
              src={course.imageUrl}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
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
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <BookOpen className="h-10 w-10 text-slate-300" />
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all duration-500" />

          {/* Play button */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="h-14 w-14 rounded-full bg-white shadow-2xl flex items-center justify-center">
                  <Play className="h-5 w-5 fill-slate-900 text-slate-900 ml-0.5" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {course.adType === "featured" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-indigo-600/30">
                <Zap className="h-3 w-3 fill-white" />
                {s("promoted")}
              </span>
            )}
            {isBestSeller && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-amber-400/30">
                <Trophy className="h-3 w-3 fill-white" />
                {s("bestSeller")}
              </span>
            )}
            {isSaleActive(course) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-rose-500/30">
                <Zap className="h-3 w-3 fill-white" />
                {s("flashSale")}
              </span>
            )}
            {isEnrolled && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black tracking-widest uppercase shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" />
                {s("enrolled")}
              </span>
            )}
          </div>

          {/* Level badge */}
          <div className="absolute bottom-3 left-3">
            <span
              className={cn(
                "inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border",
                LEVEL_COLORS[course.level || "Beginner"] ?? LEVEL_COLORS.Beginner,
              )}
            >
              {course.level === "Beginner"
                ? s("beginner")
                : course.level === "Intermediate"
                  ? s("intermediate")
                  : course.level === "Advanced"
                    ? s("advanced")
                    : course.level || "Beginner"}
            </span>
          </div>

          {/* Category */}
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-white/90 text-slate-700 border border-white/50 backdrop-blur-sm">
              {course.category}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-3 w-3 fill-amber-400 text-amber-400 transition-opacity",
                    s > Math.round(course.rating || 0) && "opacity-20",
                  )}
                />
              ))}
            </div>
            <span className="text-[12px] font-bold text-amber-600">
              {course.rating ? course.rating.toFixed(1) : "5.0"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Users className="h-3 w-3" />
            {(course.students || 0).toLocaleString()}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-[15px] leading-snug text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-3">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed mb-4">
          {course.description}
        </p>

        {/* Price row */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
          <div>
            {course.price === 0 ? (
              <span className="text-emerald-600 font-black text-base tracking-tight uppercase tracking-widest text-[10px]">
                {s("free")}
              </span>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-black text-lg tracking-tight",
                      isSaleActive(course) || course.isCampaignActive
                        ? "text-indigo-600"
                        : "text-slate-900",
                    )}
                  >
                    ${getCourseEffectivePrice(course)}
                  </span>
                  {(isSaleActive(course) || course.isCampaignActive) && (
                    <span className="text-slate-300 line-through text-[11px] font-bold">
                      ${course.price}
                    </span>
                  )}
                </div>
                {course.isCampaignActive && !isSaleActive(course) && (
                  <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-0.5 animate-pulse">
                    {s("exclusivePartnerDeal")}
                  </span>
                )}
              </div>
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 group-hover:underline underline-offset-4 transition-all">
            {s("learnMore")}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function Browse() {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();

  // Helper: look up a key from browseStrings for the current language
  const s = (key: string) => browseStrings[lang as Language]?.[key] ?? browseStrings.en[key];

  const search = searchParams.search || "";
  const selectedCategory = searchParams.category || null;
  const selectedLevel = searchParams.level || "all";
  const selectedStatus = searchParams.status || "all";
  const selectedPricing = searchParams.pricing || "all";
  const sortBy = searchParams.sort || "popularity";

  const [sortOpen, setSortOpen] = useState(false);
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFiltersOpen(!isMobile);
  }, [isMobile]);

  const updateFilters = (updates: Partial<z.infer<typeof browseSearchSchema>>) => {
    void navigate({
      search: { ...searchParams, ...updates } as any,
    });
  };

  const {
    data: courses = [] as Course[],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["courses"],
    queryFn: () => fetchCourses(),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["user-enrollments-browse", user?.id],
    queryFn: () => (user ? fetchUserEnrollments(user.id) : []),
    enabled: !!user?.id,
  });

  const enrolledCourseIds = useMemo(
    () => new Set(enrollments.map((en) => en.course.id)),
    [enrollments],
  );

  const top5CourseIds = useMemo(() => {
    return [...courses]
      .filter((c) => c.status?.toLowerCase() === "published" && (c.students || 0) > 0)
      .sort((a, b) => (b.students || 0) - (a.students || 0))
      .slice(0, 5)
      .map((c) => c.id);
  }, [courses]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    courses.forEach((c) => {
      if (c.category && c.status?.toLowerCase() === "published") {
        cats.add(c.category);
      }
    });
    return Array.from(cats).sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const result = courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory ? c.category === selectedCategory : true;
      const matchesLevel = selectedLevel === "all" ? true : c.level === selectedLevel;
      const isEnrolled = enrolledCourseIds.has(c.id);
      const matchesStatus =
        selectedStatus === "all" ? true : selectedStatus === "enrolled" ? isEnrolled : !isEnrolled;
      const isFree = (c.price || 0) === 0;
      const matchesPricing =
        selectedPricing === "all" ? true : selectedPricing === "free" ? isFree : !isFree;
      const isPublished = c.status?.toLowerCase() === "published";
      return (
        matchesSearch &&
        matchesCategory &&
        matchesLevel &&
        matchesStatus &&
        matchesPricing &&
        isPublished
      );
    });

    return [...result].sort((a, b) => {
      // 1. Strictly prioritize featured/ad courses first
      const aAd = a.adType === "featured";
      const bAd = b.adType === "featured";

      if (aAd && !bAd) return -1;
      if (!aAd && bAd) return 1;

      // 2. If both are ads, sort by amount paid (Highest first)
      if (aAd && bAd) {
        if ((a.adAmountPaid || 0) !== (b.adAmountPaid || 0)) {
          return (b.adAmountPaid || 0) - (a.adAmountPaid || 0);
        }
      }

      // 3. Fallback to user-selected sorting
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "rating":
          return (b.rating || 0) !== (a.rating || 0)
            ? (b.rating || 0) - (a.rating || 0)
            : new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "popularity":
          return (b.students || 0) !== (a.students || 0)
            ? (b.students || 0) - (a.students || 0)
            : new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "price-asc":
          return a.price !== b.price
            ? a.price - b.price
            : new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "price-desc":
          return b.price !== a.price
            ? b.price - a.price
            : new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });
  }, [
    courses,
    search,
    selectedCategory,
    selectedLevel,
    selectedStatus,
    selectedPricing,
    sortBy,
    enrolledCourseIds,
  ]);

  const hasActiveFilters =
    selectedCategory !== null ||
    selectedLevel !== "all" ||
    selectedStatus !== "all" ||
    selectedPricing !== "all" ||
    search !== "";

  const clearAll = () => {
    void navigate({
      search: {
        search: "",
        category: "",
        level: "all",
        status: "all",
        pricing: "all",
        sort: "popularity",
      } as any,
    });
  };

  return (
    <SiteLayout>
      <div className="bg-[#F7F6F3] min-h-screen">
        {/* ── Hero Header ── */}
        <div className="bg-white border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-6 pt-12 pb-8">
            {/* Top label */}
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 uppercase tracking-widest">
                <Zap className="h-3.5 w-3.5" />
                LearnLab Catalog
              </span>
              <span className="h-px flex-1 max-w-[60px] bg-indigo-200" />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">
                  {s("heroLine1")}
                  <br />
                  <span className="text-indigo-600">{s("heroHighlight")}</span>
                </h1>
                <p className="text-slate-500 text-[15px] max-w-md font-medium leading-relaxed">
                  {courses.filter((c) => c.status?.toLowerCase() === "published").length}{" "}
                  {s("heroCourseDesc")}
                </p>
              </div>

              {/* Search bar */}
              <div className="relative max-w-md w-full lg:w-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  className="pl-11 h-12 bg-slate-50 border-slate-200 rounded-xl text-[14px] font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 w-full lg:w-80 shadow-sm"
                  value={search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                />
                {search && (
                  <button
                    onClick={() => updateFilters({ search: "" })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6 mt-8 pt-6 border-t border-slate-100">
              {[
                {
                  icon: BookOpen,
                  label: s("statCourses"),
                  value: courses.filter((c) => c.status?.toLowerCase() === "published").length,
                },
                {
                  icon: Users,
                  label: s("statLearners"),
                  value: courses.reduce((a, c) => a + (c.students || 0), 0).toLocaleString(),
                },
                {
                  icon: TrendingUp,
                  label: s("statCategories"),
                  value: categories.length,
                },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <stat.icon className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-black text-slate-900">{stat.value}</span>
                  <span className="text-sm text-slate-400 font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="bg-white border-b border-slate-200/80 sticky top-14 z-30 shadow-sm">
          <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-4">
            {/* Filter toggle (mobile) + active chips */}
            <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={cn(
                  "flex-shrink-0 inline-flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] font-semibold border transition-all",
                  filtersOpen
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {s("filters")}
                {hasActiveFilters && (
                  <span className="h-4 w-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">
                    !
                  </span>
                )}
              </button>

              {/* Active filter chips */}
              <AnimatePresence>
                {selectedCategory && (
                  <ActiveFilterChip
                    label={selectedCategory}
                    onRemove={() => updateFilters({ category: "" })}
                  />
                )}
                {selectedLevel !== "all" && (
                  <ActiveFilterChip
                    label={
                      selectedLevel === "Beginner"
                        ? s("beginner")
                        : selectedLevel === "Intermediate"
                          ? s("intermediate")
                          : selectedLevel === "Advanced"
                            ? s("advanced")
                            : selectedLevel
                    }
                    onRemove={() => updateFilters({ level: "all" })}
                  />
                )}
                {selectedPricing !== "all" && (
                  <ActiveFilterChip
                    label={selectedPricing === "free" ? t("free") : t("paid")}
                    onRemove={() => updateFilters({ pricing: "all" })}
                  />
                )}
                {selectedStatus !== "all" && user && (
                  <ActiveFilterChip
                    label={selectedStatus === "enrolled" ? t("enrolled") : t("notEnrolled")}
                    onRemove={() => updateFilters({ status: "all" })}
                  />
                )}
                {hasActiveFilters && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={clearAll}
                    className="flex-shrink-0 text-[11px] font-semibold text-rose-500 hover:underline"
                  >
                    {t("resetFilters")}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Right: result count + sort */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="hidden sm:block text-[12px] font-semibold text-slate-400">
                {filteredCourses.length} {s("results")}
              </span>

              {/* Sort dropdown */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] font-semibold bg-white border border-slate-200 hover:border-slate-300 text-slate-700 transition-all"
                >
                  <ArrowUpDownIcon className="h-3.5 w-3.5 text-slate-400" />
                  {sortBy === "newest"
                    ? t("newest")
                    : sortBy === "rating"
                      ? t("topRated")
                      : sortBy === "popularity"
                        ? t("popularity")
                        : sortBy === "price-asc"
                          ? t("priceAsc")
                          : sortBy === "price-desc"
                            ? t("priceDesc")
                            : sortBy}
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-slate-400 transition-transform",
                      sortOpen && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 py-1"
                    >
                      {(
                        [
                          ["popularity", t("popularity")],
                          ["newest", t("newest")],
                          ["rating", t("topRated")],
                          ["price-asc", t("priceAsc")],
                          ["price-desc", t("priceDesc")],
                        ] as [SortOption, string][]
                      ).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => {
                            updateFilters({ sort: val });
                            setSortOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-[13px] font-medium hover:bg-slate-50 transition-colors",
                            sortBy === val
                              ? "text-indigo-600 font-semibold bg-indigo-50/50"
                              : "text-slate-600",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex gap-8">
            {/* ── Sidebar Filters ── */}
            <AnimatePresence>
              {filtersOpen && (
                <motion.aside
                  initial={{ opacity: 0, x: -20, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 280 }}
                  exit={{ opacity: 0, x: -20, width: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-shrink-0 overflow-hidden"
                  style={{ width: 280 }}
                >
                  <div className="w-[280px] space-y-6 sticky top-32 bg-slate-50/40 border border-slate-200/50 p-5 rounded-[2.5rem] backdrop-blur-sm shadow-sm">
                    {/* Category */}
                    <FilterSection
                      title={s("categoryTitle")}
                      icon={<LayoutGrid className="h-3.5 w-3.5" />}
                    >
                      <CategoryFilterBtn
                        active={selectedCategory === null}
                        onClick={() => updateFilters({ category: "" })}
                      >
                        {s("allCategories")}
                      </CategoryFilterBtn>
                      {categories.map((cat) => (
                        <CategoryFilterBtn
                          key={cat}
                          active={selectedCategory === cat}
                          onClick={() => updateFilters({ category: cat })}
                        >
                          {cat}
                        </CategoryFilterBtn>
                      ))}
                    </FilterSection>

                    {/* Level */}
                    <FilterSection
                      title={s("levelTitle")}
                      icon={<BarChart3 className="h-3.5 w-3.5" />}
                    >
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["all", "Beginner", "Intermediate", "Advanced"] as LevelOption[]).map(
                          (lv) => (
                            <SegmentedFilterBtn
                              key={lv}
                              active={selectedLevel === lv}
                              onClick={() => updateFilters({ level: lv })}
                            >
                              {lv === "all"
                                ? s("levelAny")
                                : lv === "Beginner"
                                  ? s("beginner")
                                  : lv === "Intermediate"
                                    ? s("intermediate")
                                    : lv === "Advanced"
                                      ? s("advanced")
                                      : lv}
                            </SegmentedFilterBtn>
                          ),
                        )}
                      </div>
                    </FilterSection>

                    {/* Pricing */}
                    <FilterSection
                      title={s("pricingTitle")}
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                    >
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "all", label: s("pricingAny") },
                          { id: "free", label: t("free") },
                          { id: "paid", label: t("paid") },
                        ].map((item) => (
                          <SegmentedFilterBtn
                            key={item.id}
                            active={selectedPricing === item.id}
                            onClick={() => updateFilters({ pricing: item.id as PricingOption })}
                          >
                            {item.label}
                          </SegmentedFilterBtn>
                        ))}
                      </div>
                    </FilterSection>

                    {/* Enrollment — auth only */}
                    {user && (
                      <FilterSection
                        title={s("statusTitle")}
                        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      >
                        <div className="space-y-1">
                          {[
                            { id: "all", label: s("allCourses") },
                            { id: "enrolled", label: t("enrolled") },
                            { id: "not-enrolled", label: t("notEnrolled") },
                          ].map((item) => (
                            <CategoryFilterBtn
                              key={item.id}
                              active={selectedStatus === item.id}
                              onClick={() => updateFilters({ status: item.id as StatusOption })}
                            >
                              {item.label}
                            </CategoryFilterBtn>
                          ))}
                        </div>
                      </FilterSection>
                    )}

                    {/* AI CTA */}
                    <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-5 border border-slate-800 shadow-xl shadow-slate-950/20 group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/30 transition-colors" />
                      <Sparkles className="h-5 w-5 text-indigo-400 mb-3 fill-indigo-500/10 animate-pulse" />
                      <p className="font-black text-sm mb-1 tracking-tight">
                        {s("aiCtaTitle")}
                      </p>
                      <p className="text-slate-400 text-[11px] leading-relaxed mb-4 font-medium">
                        {s("aiCtaDesc")}
                      </p>
                      <Link
                        to="/generate"
                        className="block w-full py-2.5 text-center text-[10px] font-black uppercase tracking-[0.15em] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/25 duration-200 hover:scale-[1.02]"
                      >
                        {s("aiCtaBtn")}
                      </Link>
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* ── Course Grid ── */}
            <main className="flex-1 min-w-0">
              {error && (
                <div className="flex items-center gap-3 p-5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium mb-8">
                  <XCircle className="h-5 w-5 flex-shrink-0" />
                  {(error as Error).message}
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse space-y-5">
                      <div className="aspect-[16/10] bg-slate-200 rounded-2xl" />
                      <div className="space-y-3 px-1">
                        <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                        <div className="h-3 bg-slate-200 rounded-lg w-1/2" />
                        <div className="h-3 bg-slate-200 rounded-lg w-5/6" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCourses.length > 0 ? (
                <div
                  className={cn(
                    "grid gap-x-8 gap-y-12",
                    filtersOpen
                      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-2"
                      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
                  )}
                >
                  {filteredCourses.map((c, i) => (
                    <CourseCard
                      key={c.id}
                      course={c}
                      index={i}
                      isBestSeller={top5CourseIds.includes(c.id)}
                      isEnrolled={enrolledCourseIds.has(c.id)}
                    />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-32 text-center"
                >
                  <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                    <Search className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">{t("noCoursesFound")}</h3>
                  <p className="text-slate-400 text-sm font-medium max-w-xs leading-relaxed mb-8">
                    {s("emptyAdjust")}
                  </p>
                  <button
                    onClick={clearAll}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    {t("resetFilters")}
                  </button>
                </motion.div>
              )}
            </main>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

/* ── Helper sub-components ── */

function FilterSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-slate-400">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {title}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CategoryFilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-200 group text-left",
        active
          ? "bg-slate-900 text-white font-bold shadow-sm"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-semibold",
      )}
    >
      <span className="truncate">{children}</span>
      {active ? (
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
      ) : (
        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
      )}
    </button>
  );
}

function SegmentedFilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 border text-center",
        active
          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700",
      )}
    >
      {children}
    </button>
  );
}

function ArrowUpDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 7l4-4 4 4" />
      <path d="M16 17l-4 4-4-4" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}
