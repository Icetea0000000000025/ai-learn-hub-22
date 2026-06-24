import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Sparkles } from "lucide-react";

export function SiteFooter() {
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
  });

  const siteName = branding?.name || "LearnLab";

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground overflow-hidden shadow-sm shadow-primary/20">
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </div>
            <span className="text-base font-black tracking-tighter uppercase italic">
              {siteName}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AI-powered learning platform, customized for institutional excellence and creative
            growth.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Product
          </h4>
          <ul className="space-y-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <li>
              <Link to="/browse" className="hover:text-primary transition-colors">
                Browse Catalog
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-primary transition-colors">
                Pricing Plans
              </Link>
            </li>
            <li>
              <Link to="/create" className="hover:text-primary transition-colors">
                Become a Creator
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Support
          </h4>
          <ul className="space-y-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <li>
              <Link to="/about" className="hover:text-primary transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-primary transition-colors">
                Help Center
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-primary transition-colors">
                Contact Support
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Legal
          </h4>
          <ul className="space-y-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <li>
              <Link to="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors">
                Cookies
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50 py-6">
        <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          <p>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span>Powered by TanStack Start</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
