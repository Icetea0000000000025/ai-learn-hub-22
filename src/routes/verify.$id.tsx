import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ShieldCheck,
  Trophy,
  Calendar,
  User,
  BookOpen,
  Download,
  Printer,
  Share2,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { CertificateCard } from "@/components/certificate-card";

export const Route = createFileRoute("/verify/$id")({
  component: CertificateVerificationPage,
});

async function fetchCertificate(id: string) {
  const { data, error } = await supabase
    .from("certificates")
    .select(
      `
      id,
      issued_at,
      recipient_name,
      course:courses(title, image_url),
      user:profiles!certificates_user_id_fkey(name, avatar_url)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as any;
}

function CertificateVerificationPage() {
  const { id } = Route.useParams();

  // Basic UUID validation to prevent hanging on malformed IDs
  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const {
    data: cert,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["certificate-verify", id],
    queryFn: () => fetchCertificate(id),
    enabled: isValidUuid,
    staleTime: 1000 * 60 * 10,
  });

  if (!isValidUuid || error || (!isLoading && !cert)) {
    return (
      <SiteLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
          <div className="h-24 w-24 rounded-[2.5rem] bg-rose-50 text-rose-500 flex items-center justify-center mb-8 shadow-xl shadow-rose-500/10">
            <ShieldCheck className="h-12 w-12 opacity-40" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight mb-4">
            Invalid Credential
          </h1>
          <p className="text-slate-500 max-w-md font-medium text-lg leading-relaxed mb-10">
            {isValidUuid
              ? "We couldn't find a certificate matching this verification ID. It may have been revoked or never issued."
              : "The verification ID provided is malformed. Please check the link and try again."}
          </p>
          <Button
            asChild
            className="h-14 px-10 rounded-2xl bg-slate-900 font-bold uppercase tracking-widest text-xs"
          >
            <a href="/">Return to Platform</a>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">
            Verifying Authenticity...
          </p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="min-h-screen bg-[#fcfcfd] py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* TOP ACTIONS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Verified Credential
                </h2>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  Digital Authenticity Confirmed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 no-print">
              <Button
                variant="outline"
                className="h-12 px-6 rounded-xl border-slate-200 bg-white font-bold text-[10px] uppercase tracking-widest gap-2 shadow-sm"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Verification link copied!");
                }}
              >
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button
                className="h-12 px-8 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl gap-2"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" /> Print PDF
              </Button>
            </div>
          </div>

          <CertificateCard cert={cert} isPublic />

          {/* SECONDARY DETAILS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 no-print">
            <div className="lg:col-span-8 space-y-8">
              <section className="bg-white border border-slate-100 p-12 rounded-[2.5rem] shadow-sm space-y-8">
                <h4 className="text-xl font-black text-slate-900 tracking-tight">
                  Verification Insight
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Recipient
                      </p>
                      <p className="font-bold text-slate-900">
                        {cert.recipient_name || cert.user?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Program
                      </p>
                      <p className="font-bold text-slate-900">{cert.course?.title}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Authenticated On
                      </p>
                      <p className="font-bold text-slate-900">
                        {new Date(cert.issued_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Status
                      </p>
                      <p className="font-bold text-emerald-600">Active & Valid</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-4">
              <Card className="border-none bg-slate-900 text-white rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden shadow-2xl">
                <div className="relative z-10 space-y-6">
                  <h4 className="text-xl font-black tracking-tight">Master this skill</h4>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">
                    Explore our professional catalog and earn your own industry-recognized
                    credentials.
                  </p>
                  <Button
                    asChild
                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest"
                  >
                    <Link to="/browse">Browse Programs</Link>
                  </Button>
                </div>
                <Trophy className="absolute -right-12 -bottom-12 h-48 w-48 text-white/5 -rotate-12" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
