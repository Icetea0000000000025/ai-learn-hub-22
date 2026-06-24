import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({ meta: [{ title: "Privacy Policy" }] }),
});

function PrivacyPage() {
  const { data: policies, isLoading } = useQuery({
    queryKey: ["platform-policies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "policies")
        .maybeSingle();
      return data?.value || { terms: "", privacy: "Default Privacy Policy Content" };
    },
  });

  const content = (policies as any)?.privacy || "No privacy policy has been defined yet.";

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-20 min-h-screen">
        <div className="flex items-center gap-4 mb-10">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              Privacy <span className="text-indigo-600">Policy</span>
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
              Data Protection & Privacy
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin opacity-20" />
          </div>
        ) : (
          <div className="prose prose-slate max-w-none bg-white p-10 md:p-16 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, "<br />") }}
              className="text-slate-600 leading-relaxed"
            />
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
