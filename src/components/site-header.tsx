import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  Sparkles,
  User,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Zap,
  Search,
  Command,
  Menu,
  X,
  Home,
  BookOpen,
  Tag,
  Globe,
  Bell,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

function NotificationBell() {
  const { profile } = useAuth();
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", profile?.role],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_notifications")
        .select("*")
        .eq("is_active", true)
        .or(`target_role.eq.all,target_role.eq.${profile?.role || "student"}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!profile,
  });

  if (notifications.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary border-2 border-background animate-pulse" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 rounded-2xl p-4 space-y-4 shadow-2xl bg-popover/95 backdrop-blur-xl border-border"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Notifications
          </p>
          <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black">
            {notifications.length}
          </Badge>
        </div>
        <ScrollArea className="h-64 pr-4">
          <div className="space-y-6">
            {notifications.map((n: any) => (
              <div key={n.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-[7px] font-black uppercase px-1.5 py-0.5 rounded-sm border-none text-white",
                      n.type === "warning" ? "bg-rose-500" : "bg-primary",
                    )}
                  >
                    {n.type}
                  </Badge>
                  <p className="text-[10px] font-bold text-slate-900 line-clamp-1">{n.title}</p>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const { user, profile, loading, signOut } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch dynamic branding from settings
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
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });

  return (
    <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo & Search Trigger */}
        <div className="flex items-center gap-8">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 border-r border-border bg-background">
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-border/50">
                  <Link
                    to="/"
                    className="flex items-center gap-3 transition-transform hover:scale-105"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 overflow-hidden">
                      {branding?.logo_url ? (
                        <img
                          src={branding.logo_url}
                          alt="Logo"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Sparkles className="h-5 w-5 fill-current" />
                      )}
                    </div>
                    <span className="text-base font-black tracking-tight text-foreground uppercase italic tracking-wider">
                      {branding?.name || "LearnLab"}
                    </span>
                  </Link>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-8">
                  <div className="space-y-1">
                    <p className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">
                      Navigation
                    </p>
                    <Link
                      to="/"
                      className="flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Home className="h-4 w-4 opacity-70" /> {t("welcome")}
                    </Link>
                    <Link
                      to="/browse"
                      className="flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <BookOpen className="h-4 w-4 opacity-70" /> {t("viewCatalog")}
                    </Link>
                    <Link
                      to="/pricing"
                      className="flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Tag className="h-4 w-4 opacity-70" /> {t("pricing")}
                    </Link>
                  </div>

                  {user && (
                    <div className="space-y-1">
                      <p className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">
                        Workspace
                      </p>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4 opacity-70" /> {t("dashboard")}
                      </Link>
                      {profile?.role === "admin" && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold text-primary hover:bg-primary/5 transition-all"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <ShieldCheck className="h-4 w-4 opacity-70" /> {t("adminArea")}
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {!user && (
                  <div className="p-6 border-t border-border/50 bg-slate-50/50">
                    <Button
                      asChild
                      className="w-full rounded-2xl font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20 transition-all active:scale-95"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link to="/login" search={{ mode: "login" }}>
                        {t("getStarted")}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link
            to="/"
            className="flex items-center gap-3 group transition-transform hover:scale-105 active:scale-95"
          >
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300 overflow-hidden">
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Sparkles className="h-5 w-5 fill-current" />
              )}
            </div>
            <span className="text-base font-black tracking-tighter text-foreground hidden sm:inline-block uppercase italic tracking-[0.05em]">
              {branding?.name || "LearnLab"}
            </span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 text-[13px] text-muted-foreground font-black uppercase tracking-widest md:flex">
          <Link
            to="/"
            className="hover:text-primary transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            {t("welcome")}
          </Link>
          <Link
            to="/browse"
            className="hover:text-primary transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            {t("viewCatalog")}
          </Link>
          <Link
            to="/pricing"
            className="hover:text-primary transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            {t("pricing")}
          </Link>
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-5">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent hover:border-border transition-all"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 rounded-2xl p-2 shadow-2xl bg-white border-border"
            >
              <DropdownMenuItem
                onClick={() => setLang("en")}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest cursor-pointer transition-colors",
                  lang === "en"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-slate-50",
                )}
              >
                English
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("th")}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest cursor-pointer transition-colors mt-1",
                  lang === "th"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-slate-50",
                )}
              >
                ภาษาไทย
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-xl p-0 hover:bg-secondary/80 border border-border/50 shadow-sm overflow-hidden transition-all"
                >
                  <Avatar className="h-full w-full rounded-none">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black uppercase">
                      {profile?.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 rounded-[1.5rem] p-2 shadow-2xl bg-white border-border mt-2"
                align="end"
              >
                <div className="px-4 py-3 border-b border-border/50 mb-2">
                  <p className="text-sm font-black text-foreground truncate uppercase tracking-tight">
                    {profile?.name || "Member"}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground truncate italic">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuGroup className="space-y-1">
                  <DropdownMenuItem
                    asChild
                    className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-secondary/80"
                  >
                    <Link to="/dashboard" className="flex items-center gap-3 font-bold text-sm">
                      <LayoutDashboard className="h-4 w-4 opacity-70 text-primary" />{" "}
                      {t("dashboard")}
                    </Link>
                  </DropdownMenuItem>
                  {profile?.role === "admin" && (
                    <DropdownMenuItem
                      asChild
                      className="rounded-xl px-3 py-2.5 cursor-pointer text-primary focus:bg-primary/5"
                    >
                      <Link to="/admin" className="flex items-center gap-3 font-bold text-sm">
                        <ShieldCheck className="h-4 w-4 opacity-70" /> {t("adminArea")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2 opacity-50" />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="rounded-xl px-3 py-2.5 cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50 font-black uppercase tracking-[0.1em] text-[10px] transition-colors"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>{t("logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="ghost"
                className="hidden text-[11px] font-black uppercase tracking-widest sm:inline-flex rounded-xl h-10 px-5"
              >
                <Link to="/login" search={{ mode: "login" }}>
                  {t("signIn")}
                </Link>
              </Button>
              <Button
                asChild
                className="h-10 rounded-xl px-6 text-[11px] font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                <Link to="/login" search={{ mode: "login" }}>
                  {t("getStarted")}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
