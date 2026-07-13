import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Sparkles, Bug } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SiteFooter() {
  const [isBugReporterOpen, setIsBugReporterOpen] = useState(false);
  const [silentBugs, setSilentBugs] = useState<any[]>([]);
  const [manualReport, setManualReport] = useState("");

  // Load bugs on mount
  useEffect(() => {
    const loadBugs = () => {
      const existing = JSON.parse(localStorage.getItem("silent_bug_logs") || "[]");
      setSilentBugs(existing);
    };
    loadBugs();
    window.addEventListener("storage", loadBugs);
    return () => window.removeEventListener("storage", loadBugs);
  }, []);

  const saveBug = (message: string, severity: 'critical' | 'warning' | 'info' = 'critical') => {
    const currentUrl = window.location.href;
    setSilentBugs(prev => {
      // Find if exact bug exists
      const existingBugIndex = prev.findIndex(b => b.message === message && b.url === currentUrl);
      
      let updated;
      if (existingBugIndex >= 0) {
        // Prevent exact duplicate spam within a tiny fraction (e.g., 100ms) to avoid React double-render false counts,
        // but generally we want to count them. 
        const lastOccurred = new Date(prev[existingBugIndex].timestamp).getTime();
        if (Date.now() - lastOccurred < 100) {
          return prev;
        }

        updated = [...prev];
        updated[existingBugIndex] = {
          ...updated[existingBugIndex],
          timestamp: new Date().toISOString(),
          status: "open", // Re-open if it was fixed
          count: (updated[existingBugIndex].count || 1) + 1,
          severity // update severity in case it escalated
        };
      } else {
        const newBug = {
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          url: currentUrl,
          message,
          status: "open",
          severity,
          count: 1
        };
        updated = [...prev, newBug];
      }

      localStorage.setItem("silent_bug_logs", JSON.stringify(updated));
      return updated;
    });
  };
  useEffect(() => {
    // Override console.error
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      
      let severity: 'critical' | 'warning' | 'info' = 'critical';
      if (msg.includes('Failed to load') || msg.includes('404') || msg.includes('RESOURCE_ERROR')) {
        severity = 'warning';
      }
      
      saveBug(`[ERROR] ${msg}`, severity);
    };

    // Capture global runtime errors
    const handleWindowError = (event: ErrorEvent) => {
      saveBug(`[WINDOW_ERROR] ${event.message} at ${event.filename}:${event.lineno}`, 'critical');
    };

    // Capture unhandled promise rejections (e.g. failed fetch)
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      saveBug(`[PROMISE_REJECTED] ${event.reason}`, 'critical');
    };

    // Capture resource loading errors (404 images, etc)
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        saveBug(`[RESOURCE_ERROR] Failed to load <${target.tagName.toLowerCase()}> at ${(target as any).src || (target as any).href}`, 'warning');
      }
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handlePromiseRejection);
    window.addEventListener("error", handleResourceError, true); // Capture phase!

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handlePromiseRejection);
      window.removeEventListener("error", handleResourceError, true);
    };
  }, []);

  const markAsFixed = (id: string) => {
    setSilentBugs(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, status: 'fixed' } : b);
      localStorage.setItem("silent_bug_logs", JSON.stringify(updated));
      return updated;
    });
  };

  const submitManualReport = () => {
    if (!manualReport.trim()) return;
    saveBug(`[MANUAL_REPORT] ${manualReport}`, 'info');
    setManualReport("");
    toast.success("Manual bug report added.");
  };

  const openBugs = silentBugs.filter(b => b.status === "open");
  const hasCritical = openBugs.some(b => (b.severity || 'critical') === "critical");
  const hasWarning = openBugs.some(b => b.severity === "warning");
  const hasInfo = openBugs.some(b => b.severity === "info");

  let bugIconClasses = "text-gray-500 opacity-20 hover:opacity-100";
  if (hasCritical) {
    bugIconClasses = "text-red-500 opacity-100 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]";
  } else if (hasWarning) {
    bugIconClasses = "text-orange-500 opacity-100 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]";
  } else if (hasInfo) {
    bugIconClasses = "text-green-500 opacity-100 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]";
  }


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
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
              <Sparkles className="h-4 w-4" />
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
          <p className="flex items-center gap-2">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setIsBugReporterOpen(true); }}
              className={`text-[10px] cursor-pointer transition-all p-1 bg-transparent border-none ${bugIconClasses}`}
              title="Report a layout issue"
            >
              <Bug className="w-3 h-3" />
            </button>
          </p>
          <div className="flex items-center gap-6">
            <span>Powered by TanStack Start</span>
          </div>
        </div>
      </div>

      <Dialog open={isBugReporterOpen} onOpenChange={setIsBugReporterOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Silent Bug Catcher & Tracker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex gap-2">
              <textarea
                value={manualReport}
                onChange={(e) => setManualReport(e.target.value)}
                placeholder="Spotted a bug? Describe it here..."
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[40px] resize-none"
                rows={2}
              />
              <Button onClick={submitManualReport} className="h-auto">Report Bug</Button>
            </div>

            {silentBugs.length === 0 && <p className="text-muted-foreground text-sm text-center py-10">No bugs caught yet! System is healthy.</p>}
            
            {/* Show logs sorted by severity then time */}
            {silentBugs.slice().sort((a, b) => {
              const weight = { critical: 3, warning: 2, info: 1 };
              const sevA = weight[(a.severity || 'critical') as keyof typeof weight] || 0;
              const sevB = weight[(b.severity || 'critical') as keyof typeof weight] || 0;
              if (sevA !== sevB) {
                return sevB - sevA;
              }
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            }).map(bug => {
              const sev = bug.severity || 'critical';
              const isFixed = bug.status === 'fixed';
              const sevConfig = {
                critical: { label: 'CRITICAL', style: isFixed ? 'bg-gray-200 text-gray-500' : 'bg-red-500 text-white', border: isFixed ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50' },
                warning: { label: 'WARNING', style: isFixed ? 'bg-gray-200 text-gray-500' : 'bg-orange-500 text-white', border: isFixed ? 'border-gray-200 bg-gray-50' : 'border-orange-200 bg-orange-50/50' },
                info: { label: 'INFO', style: isFixed ? 'bg-gray-200 text-gray-500' : 'bg-green-500 text-white', border: isFixed ? 'border-gray-200 bg-gray-50' : 'border-green-200 bg-green-50/50' }
              };
              const style = sevConfig[sev as keyof typeof sevConfig] || sevConfig.critical;

              return (
                <div key={bug.id} className={`p-4 rounded-md border text-xs ${style.border}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${style.style}`}>
                         {isFixed ? 'FIXED' : style.label}
                       </span>
                       {(bug.count || 1) > 1 && (
                         <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700" title={`Occurred ${bug.count} times`}>
                           x{bug.count}
                         </span>
                       )}
                       <span className="text-gray-500">{new Date(bug.timestamp).toLocaleString()}</span>
                    </div>
                    {!isFixed && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] hover:bg-green-50 hover:text-green-600 hover:border-green-200" onClick={() => markAsFixed(bug.id)}>Mark as Fixed</Button>
                    )}
                  </div>
                  <div className="font-mono text-slate-800 break-words whitespace-pre-wrap">{bug.message}</div>
                  <div className="text-slate-400 mt-2 truncate text-[10px]">URL: {bug.url}</div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setIsBugReporterOpen(false)}>Close Manager</Button>
            <Button variant="destructive" onClick={() => { localStorage.removeItem("silent_bug_logs"); setSilentBugs([]); }}>Clear All Logs</Button>
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
