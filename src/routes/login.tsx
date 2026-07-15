import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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

  const { data: branding } = useQuery({
    queryKey: ["platform-branding"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "site_branding")
        .maybeSingle();
      return (data?.value as any) || { name: "LearnLab", logo_url: "" };
    },
    staleTime: 1000 * 60 * 5,
  });
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
    <div className="flex min-h-screen w-full bg-slate-50 overflow-hidden font-sans selection:bg-indigo-500/10 selection:text-indigo-900 relative">
      {/* --- BACKGROUND DECORATION --- */}
      <div className="fixed inset-0 z-0 bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />
      </div>

      {/* --- LOGIN FORM --- */}
      <div className="flex-1 flex flex-col relative z-10 p-8 lg:p-24 justify-center items-center">
        <Link to="/" className="flex items-center gap-2 mb-12 group">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden bg-white border border-slate-100 p-0.5">
            <img 
              src={branding?.logo_url || "/avatars/LEARNLAB.png"} 
              alt="Logo" 
              className="h-full w-full object-contain rounded-lg" 
              onError={(e) => { e.currentTarget.src = "/avatars/LEARNLAB.png"; e.currentTarget.onerror = null; }}
            />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 uppercase italic">
            {branding?.name || "LearnLab"}
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px] space-y-10"
        >
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-none">
              {mode === "login" && t("loginHeader")}
              {mode === "signup" && t("signupHeader")}
              {mode === "forgot" && t("resetPasswordHeader")}
            </h1>
            <p className="text-slate-500 font-medium">
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
                            ? "bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm"
                            : "bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                        )}
                      >
                        <UserCircle
                          className={cn(
                            "h-5 w-5",
                            role === "student" ? "text-indigo-600" : "text-slate-400",
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
                            ? "bg-purple-50 border-purple-200 text-purple-900 shadow-sm"
                            : "bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                        )}
                      >
                        <Briefcase
                          className={cn(
                            "h-5 w-5",
                            role === "creator" ? "text-purple-600" : "text-slate-400",
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
                <Label htmlFor="email" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  {t("emailLabel")}
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 bg-white border-slate-200 rounded-2xl pl-12 text-slate-900 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label htmlFor="password" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {t("passwordLabel")}
                    </Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                      >
                        {t("forgotPasswordLink")}
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-14 bg-white border-slate-200 rounded-2xl pl-12 text-slate-900 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
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
                className="w-full text-center text-[10px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <ChevronLeft className="h-3 w-3" />{" "}
                {lang === "th" ? "กลับสู่หน้าเข้าสู่ระบบ" : "Back to Login"}
              </button>
            )}
          </form>



          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoading}
            className="w-full h-14 rounded-2xl bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-700 font-bold text-sm transition-all active:scale-[0.98] group relative overflow-hidden shadow-sm"
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
            <p className="text-center text-sm font-medium text-slate-500">
              {mode === "login" ? t("noAccountText") : t("haveAccountText")}{" "}
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-indigo-600 hover:text-indigo-700 font-bold underline underline-offset-4 decoration-indigo-600/30"
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
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © 2026 LearnLab AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Link to="/privacy" className="hover:text-slate-600 transition-colors">
              {lang === "th" ? "นโยบายความเป็นส่วนตัว" : "Privacy"}
            </Link>
            <Link to="/terms" className="hover:text-slate-600 transition-colors">
              {lang === "th" ? "ข้อกำหนดการใช้งาน" : "Terms"}
            </Link>
            <Link to="/about" className="hover:text-slate-600 transition-colors">
              {lang === "th" ? "ฝ่ายช่วยเหลือ" : "Support"}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
