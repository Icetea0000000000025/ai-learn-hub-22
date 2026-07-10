import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
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
              {lang === "th"
                ? "เข้าร่วมกับผู้เรียนกว่า 50,000 คนทั่วโลก และเริ่มสร้างเส้นทางการเรียนรู้เฉพาะตัวได้ในไม่กี่วินาที"
                : "Join 50,000+ learners worldwide and start generating personalized educational journeys in seconds."}
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
                label: lang === "th" ? "การสร้างด้วย AI" : "AI Generation",
                sub: lang === "th" ? "รวดเร็วดั่งแสง" : "Fast as light",
              },
              {
                icon: ShieldCheck,
                label: lang === "th" ? "เส้นทางที่ตรวจสอบแล้ว" : "Verified Paths",
                sub: lang === "th" ? "คัดสรรโดยผู้เชี่ยวชาญ" : "Expert curated",
              },
              {
                icon: Globe,
                label: lang === "th" ? "เข้าถึงได้ทั่วโลก" : "Global Access",
                sub: lang === "th" ? "เรียนรู้ได้ทุกที่" : "Learn anywhere",
              },
              {
                icon: Sparkles,
                label: lang === "th" ? "การประเมินอัจฉริยะ" : "Smart Assessments",
                sub: lang === "th" ? "การทดสอบเฉพาะบุคคล" : "Personalized tests",
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
            {lang === "th" ? "ได้รับความไว้วางใจจากทีมงานที่" : "Trusted by teams at"}
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
                      {lang === "th" ? "ฉันต้องการเข้าร่วมในฐานะ" : "I want to join as a"}
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
                            {lang === "th" ? "นักเรียน / ผู้เรียน" : "Student"}
                          </p>
                          <p className="text-[9px] font-medium mt-1 opacity-60">
                            {lang === "th" ? "การเรียนรู้" : "Learning"}
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
                            {lang === "th" ? "ผู้สอน / ผู้สร้าง" : "Creator"}
                          </p>
                          <p className="text-[9px] font-medium mt-1 opacity-60">
                            {lang === "th" ? "การสอน" : "Teaching"}
                          </p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                  {t("emailLabel")}
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                  <Input
                    id="email"
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
                    <Label htmlFor="password" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
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
                      id="password"
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
                  {mode === "login" && (lang === "th" ? "เข้าสู่ระบบ" : "Sign In")}
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
                {lang === "th" ? "กลับสู่หน้าเข้าสู่ระบบ" : "Back to Login"}
              </button>
            )}
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]">
              <span className="bg-zinc-950 px-4 text-zinc-600">
                {lang === "th" ? "ระบบล็อกอินที่ปลอดภัย" : "Secure Authentication"}
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
                {mode === "login"
                  ? lang === "th"
                    ? "สมัครใช้งานที่นี่"
                    : "Sign up now"
                  : lang === "th"
                    ? "เข้าสู่ระบบที่นี่"
                    : "Sign in instead"}
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
              {lang === "th" ? "นโยบายความเป็นส่วนตัว" : "Privacy"}
            </Link>
            <Link to="/terms" className="hover:text-zinc-300 transition-colors">
              {lang === "th" ? "ข้อกำหนดการใช้งาน" : "Terms"}
            </Link>
            <Link to="/about" className="hover:text-zinc-300 transition-colors">
              {lang === "th" ? "ฝ่ายช่วยเหลือ" : "Support"}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
