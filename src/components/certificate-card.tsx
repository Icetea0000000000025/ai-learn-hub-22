import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Trophy, Calendar, User, BookOpen, Printer, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type CertificateData = {
  id: string;
  issued_at: string;
  recipient_name: string | null;
  course?: {
    title: string;
    image_url?: string;
  };
  user?: {
    name: string | null;
    avatar_url?: string | null;
  };
};

interface CertificateCardProps {
  cert: CertificateData;
  isPublic?: boolean;
}

export function CertificateCard({ cert, isPublic = false }: CertificateCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="border-[12px] border-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[3.5rem] overflow-hidden bg-white relative">
        {/* Decorative Frame */}
        <div className="absolute inset-4 border-2 border-slate-100 rounded-[2.5rem] pointer-events-none" />

        <div className="p-12 md:p-16 space-y-12 relative z-10 text-center">
          {/* Logo & Header */}
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900 uppercase italic">
                LearnLab 99
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">
                Professional Certification
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                Certificate of Achievement
              </h1>
            </div>
          </div>

          {/* Recipient Info */}
          <div className="space-y-6">
            <p className="text-lg font-medium text-slate-400 italic">This is to certify that</p>
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-black text-primary tracking-tight">
                {cert.recipient_name || cert.user?.name || "Distinguished Learner"}
              </h2>
              <div className="w-32 h-1 bg-primary/20 mx-auto rounded-full" />
            </div>
            <p className="text-lg font-medium text-slate-500 max-w-xl mx-auto leading-relaxed">
              has successfully completed all required coursework and demonstrated mastery through
              rigorous assessment in the program:
            </p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {cert.course?.title || "Mastery Program"}
            </h3>
          </div>

          {/* Footer / Validation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Issue Date
              </p>
              <p className="text-base font-bold text-slate-900">
                {new Date(cert.issued_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 flex items-center justify-center bg-emerald-500/5 relative mb-1">
                <ShieldCheck className="h-8 w-8 text-emerald-500" />
                <div className="absolute inset-0 border-2 border-emerald-500/10 rounded-full animate-ping opacity-20" />
              </div>
              <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600">
                Official Seal
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Credential ID
              </p>
              <p className="text-base font-mono font-bold text-slate-900 tracking-tighter uppercase">
                {cert.id.slice(0, 12)}...
              </p>
            </div>
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.02] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/[0.02] rounded-full translate-y-1/2 -translate-x-1/2" />
      </Card>

      <div className="mt-8 flex items-center justify-center gap-4 no-print">
        <Button
          variant="outline"
          className="h-12 px-6 rounded-xl border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest gap-2 shadow-sm"
          onClick={() => {
            const url = `${window.location.origin}/verify/${cert.id}`;
            navigator.clipboard.writeText(url);
            toast.success("Verification link copied!");
          }}
        >
          <Share2 className="h-4 w-4" /> Share Link
        </Button>
        <Button
          className="h-12 px-8 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" /> Print PDF
        </Button>
      </div>
    </motion.div>
  );
}
