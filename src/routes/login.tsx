import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Loader2,
  Mail,
  Lock,
  UserCircle,
  Briefcase,
  ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { z } from "zod";

const loginSearchSchema = z.object({
  mode: z.enum(["login", "signup", "forgot", "reset"]).catch("login"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: (search) => loginSearchSchema.parse(search),
  component: LoginPage,
});

// ---------------------------------------------------------------------------
// Localisation strings for the Login page
// ---------------------------------------------------------------------------
const loginStrings: Record<Language, Record<string, string>> = {
  en: {
    heroDesc:
      "Join 50,000+ learners worldwide and start generating personalized educational journeys in seconds.",
    aiGeneration: "AI Generation",
    fastAsLight: "Fast as light",
    verifiedPaths: "Verified Paths",
    expertCurated: "Expert curated",
    globalAccess: "Global Access",
    learnAnywhere: "Learn anywhere",
    smartAssessments: "Smart Assessments",
    personalizedTests: "Personalized tests",
    trustedBy: "Trusted by teams at",
    joinAs: "I want to join as a",
    studentLabel: "Student",
    studentSub: "Learning",
    creatorLabel: "Creator",
    creatorSub: "Teaching",
    signIn: "Sign In",
    backToLogin: "Back to Login",
    secureAuth: "Secure Authentication",
    signUpNow: "Sign up now",
    signInInstead: "Sign in instead",
    privacy: "Privacy",
    terms: "Terms",
    support: "Support",
  },
  th: {
    heroDesc:
      "เข้าร่วมกับผู้เรียนกว่า 50,000 คนทั่วโลก และเริ่มสร้างเส้นทางการเรียนรู้เฉพาะตัวได้ในไม่กี่วินาที",
    aiGeneration: "การสร้างด้วย AI",
    fastAsLight: "รวดเร็วดั่งแสง",
    verifiedPaths: "เส้นทางที่ตรวจสอบแล้ว",
    expertCurated: "คัดสรรโดยผู้เชี่ยวชาญ",
    globalAccess: "เข้าถึงได้ทั่วโลก",
    learnAnywhere: "เรียนรู้ได้ทุกที่",
    smartAssessments: "การประเมินอัจฉริยะ",
    personalizedTests: "การทดสอบเฉพาะบุคคล",
    trustedBy: "ได้รับความไว้วางใจจากทีมงานที่",
    joinAs: "ฉันต้องการเข้าร่วมในฐานะ",
    studentLabel: "นักเรียน / ผู้เรียน",
    studentSub: "การเรียนรู้",
    creatorLabel: "ผู้สอน / ผู้สร้าง",
    creatorSub: "การสอน",
    signIn: "เข้าสู่ระบบ",
    backToLogin: "กลับสู่หน้าเข้าสู่ระบบ",
    secureAuth: "ระบบล็อกอินที่ปลอดภัย",
    signUpNow: "สมัครใช้งานที่นี่",
    signInInstead: "เข้าสู่ระบบที่นี่",
    privacy: "นโยบายความเป็นส่วนตัว",
    terms: "ข้อกำหนดการใช้งาน",
    support: "ฝ่ายช่วยเหลือ",
  },
  es: {
    heroDesc:
      "Únete a más de 50,000 estudiantes en todo el mundo y comienza a generar rutas de aprendizaje personalizadas en segundos.",
    aiGeneration: "Generación IA",
    fastAsLight: "Rápido como la luz",
    verifiedPaths: "Rutas Verificadas",
    expertCurated: "Seleccionado por expertos",
    globalAccess: "Acceso Global",
    learnAnywhere: "Aprende en cualquier lugar",
    smartAssessments: "Evaluaciones Inteligentes",
    personalizedTests: "Pruebas personalizadas",
    trustedBy: "Con la confianza de equipos en",
    joinAs: "Quiero unirme como",
    studentLabel: "Estudiante",
    studentSub: "Aprendizaje",
    creatorLabel: "Creador",
    creatorSub: "Enseñanza",
    signIn: "Iniciar Sesión",
    backToLogin: "Volver al inicio de sesión",
    secureAuth: "Autenticación Segura",
    signUpNow: "Regístrate ahora",
    signInInstead: "Inicia sesión aquí",
    privacy: "Privacidad",
    terms: "Términos",
    support: "Soporte",
  },
  ja: {
    heroDesc:
      "世界中の50,000人以上の学習者に参加して、数秒でパーソナライズされた学習の旅を始めましょう。",
    aiGeneration: "AI生成",
    fastAsLight: "光の速さ",
    verifiedPaths: "認定済みパス",
    expertCurated: "専門家が選定",
    globalAccess: "グローバルアクセス",
    learnAnywhere: "どこでも学べる",
    smartAssessments: "スマート評価",
    personalizedTests: "個別テスト",
    trustedBy: "以下のチームに信頼されています",
    joinAs: "参加する役割を選択",
    studentLabel: "学生",
    studentSub: "学習",
    creatorLabel: "クリエイター",
    creatorSub: "教育",
    signIn: "サインイン",
    backToLogin: "ログインに戻る",
    secureAuth: "セキュア認証",
    signUpNow: "今すぐ登録",
    signInInstead: "サインインはこちら",
    privacy: "プライバシー",
    terms: "利用規約",
    support: "サポート",
  },
  zh: {
    heroDesc:
      "加入全球50,000多名学习者，即刻开启个性化学习之旅。",
    aiGeneration: "AI 生成",
    fastAsLight: "快如闪电",
    verifiedPaths: "认证学习路径",
    expertCurated: "专家精选",
    globalAccess: "全球访问",
    learnAnywhere: "随时随地学习",
    smartAssessments: "智能评估",
    personalizedTests: "个性化测试",
    trustedBy: "受到以下团队信赖",
    joinAs: "我想以身份加入",
    studentLabel: "学生",
    studentSub: "学习",
    creatorLabel: "创作者",
    creatorSub: "教学",
    signIn: "登录",
    backToLogin: "返回登录",
    secureAuth: "安全认证",
    signUpNow: "立即注册",
    signInInstead: "在此登录",
    privacy: "隐私政策",
    terms: "使用条款",
    support: "支持",
  },
  ko: {
    heroDesc:
      "전 세계 50,000명 이상의 학습자와 함께하고 몇 초 만에 개인화된 학습 여정을 시작하세요.",
    aiGeneration: "AI 생성",
    fastAsLight: "빛처럼 빠르게",
    verifiedPaths: "검증된 경로",
    expertCurated: "전문가 선별",
    globalAccess: "글로벌 접근",
    learnAnywhere: "어디서나 학습",
    smartAssessments: "스마트 평가",
    personalizedTests: "맞춤형 테스트",
    trustedBy: "다음 팀에서 신뢰합니다",
    joinAs: "다음으로 가입하고 싶습니다",
    studentLabel: "학생",
    studentSub: "학습",
    creatorLabel: "크리에이터",
    creatorSub: "교육",
    signIn: "로그인",
    backToLogin: "로그인으로 돌아가기",
    secureAuth: "보안 인증",
    signUpNow: "지금 가입하기",
    signInInstead: "로그인하기",
    privacy: "개인정보 처리방침",
    terms: "이용약관",
    support: "고객지원",
  },
};

function LoginPage() {
  const { lang, t } = useI18n();
  const { mode: initialMode, redirect: redirectPath } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(initialMode);
  const [role, setRole] = useState<"student" | "creator">("student");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signUp, user, resetPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const s = (key: string) => loginStrings[lang]?.[key] ?? loginStrings.en[key];

  useEffect(() => {
    if (user && mode !== "reset") {
      const rawTarget = redirectPath || "/dashboard";
      const target = String(rawTarget); // Force to string to avoid primitive conversion errors

      // Ensure target is a valid relative path to prevent external redirects or weird values
      if (target.startsWith("/")) {
        void navigate({ to: target as any });
      } else {
        void navigate({ to: "/dashboard" });
      }
    }
  }, [user, navigate, mode, redirectPath]);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google authentication failed");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        toast.success("Welcome back!");
      } else if (mode === "signup") {
        await signUp(email, password, role);
        toast.success("Account created successfully!");
      } else if (mode === "forgot") {
        await resetPassword(email);
        toast.success("Password reset link sent to your email!");
        setMode("login");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-zinc-950 overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* --- BACKGROUND DECORATION --- */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      </div>

      {/* --- LEFT SIDE: THE BRAND & VISUAL --- */}
      <div className="hidden lg:flex w-1/2 relative z-10 flex-col p-16 justify-between border-r border-white/5 bg-white/[0.02] backdrop-blur-3xl">
        <Link to="/" className="flex items-center gap-3 group w-fit">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-500">
            <Sparkles className="h-5 w-5 fill-current" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white uppercase italic">
            LearnLab
          </span>
        </Link>

        <div className="space-y-12 max-w-lg">
          <div className="space-y-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-6xl font-bold tracking-tight text-white leading-[0.95]"
            >
              Master any skill <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 italic font-black">
                driven by AI.
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-zinc-400 font-medium leading-relaxed"
            >
              {s("heroDesc")}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              {
                icon: Zap,
                label: s("aiGeneration"),
                sub: s("fastAsLight"),
              },
              {
                icon: ShieldCheck,
                label: s("verifiedPaths"),
                sub: s("expertCurated"),
              },
              {
                icon: Globe,
                label: s("globalAccess"),
                sub: s("learnAnywhere"),
              },
              {
                icon: Sparkles,
                label: s("smartAssessments"),
                sub: s("personalizedTests"),
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors group"
              >
                <item.icon className="h-5 w-5 text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-bold text-white leading-none">{item.label}</p>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1.5">
                  {item.sub}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="flex items-center gap-6">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">
            {s("trustedBy")}
          </p>
          <div className="flex items-center gap-6 opacity-30 grayscale invert font-black tracking-tighter">
            <span>TECHCORP</span>
            <span>DATAFLOW</span>
            <span>NEXTGEN</span>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: LOGIN FORM --- */}
      <div className="flex-1 flex flex-col relative z-10 p-8 lg:p-24 justify-center items-center">
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-12 group">
          <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="h-4 w-4 fill-current" />
          </div>
          <span className="text-lg font-black tracking-tight text-white uppercase italic">
            LearnLab
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px] space-y-10"
        >
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-4xl font-bold tracking-tight text-white leading-none">
              {mode === "login" && t("loginHeader")}
              {mode === "signup" && t("signupHeader")}
              {mode === "forgot" && t("resetPasswordHeader")}
            </h1>
            <p className="text-zinc-400 font-medium">
              {mode === "login" && t("loginSub")}
              {mode === "signup" && t("signupSub")}
              {mode === "forgot" && t("resetPasswordSub")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 mb-6"
                  >
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                      {s("joinAs")}
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("student")}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                          role === "student"
                            ? "bg-indigo-500/10 border-indigo-500/50 text-white"
                            : "bg-white/[0.02] border-white/5 text-zinc-500 hover:bg-white/[0.04]",
                        )}
                      >
                        <UserCircle
                          className={cn(
                            "h-5 w-5",
                            role === "student" ? "text-indigo-400" : "text-zinc-600",
                          )}
                        />
                        <div>
                          <p className="text-xs font-bold leading-none">
                            {s("studentLabel")}
                          </p>
                          <p className="text-[9px] font-medium mt-1 opacity-60">
                            {s("studentSub")}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("creator")}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                          role === "creator"
                            ? "bg-purple-500/10 border-purple-500/50 text-white"
                            : "bg-white/[0.02] border-white/5 text-zinc-500 hover:bg-white/[0.04]",
                        )}
                      >
                        <Briefcase
                          className={cn(
                            "h-5 w-5",
                            role === "creator" ? "text-purple-400" : "text-zinc-600",
                          )}
                        />
                        <div>
                          <p className="text-xs font-bold leading-none">
                            {s("creatorLabel")}
                          </p>
                          <p className="text-[9px] font-medium mt-1 opacity-60">
                            {s("creatorSub")}
                          </p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                  {t("emailLabel")}
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 bg-white/[0.02] border-white/5 rounded-2xl pl-12 text-white focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      {t("passwordLabel")}
                    </Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                      >
                        {t("forgotPasswordLink")}
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-14 bg-white/[0.02] border-white/5 rounded-2xl pl-12 text-white focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-base shadow-2xl shadow-indigo-500/20 group transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {mode === "login" && s("signIn")}
                  {mode === "signup" && t("startJourney")}
                  {mode === "forgot" && t("resetButton")}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <ChevronLeft className="h-3 w-3" />{" "}
                {s("backToLogin")}
              </button>
            )}
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]">
              <span className="bg-zinc-950 px-4 text-zinc-600">
                {s("secureAuth")}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoading}
            className="w-full h-14 rounded-2xl bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-white font-bold text-sm transition-all active:scale-[0.98] group relative overflow-hidden"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                  />
                </svg>
                {t("googleSignIn")}
              </div>
            )}
          </Button>

          {mode !== "forgot" && (
            <p className="text-center text-sm font-medium text-zinc-500">
              {mode === "login" ? t("noAccountText") : t("haveAccountText")}{" "}
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-4 decoration-indigo-400/30"
              >
                {mode === "login" ? s("signUpNow") : s("signInInstead")}
              </button>
            </p>
          )}
        </motion.div>

        <footer className="mt-auto pt-12 flex flex-col items-center gap-4 text-center">
          {" "}
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            © 2026 LearnLab AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            <Link to="/privacy" className="hover:text-zinc-300 transition-colors">
              {s("privacy")}
            </Link>
            <Link to="/terms" className="hover:text-zinc-300 transition-colors">
              {s("terms")}
            </Link>
            <Link to="/about" className="hover:text-zinc-300 transition-colors">
              {s("support")}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
