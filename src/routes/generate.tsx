import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Lightbulb,
  Layout,
  Save,
  Play,
  FileText,
  BrainCircuit,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateCourseWithAI, saveGeneratedCourse, type AIGeneratedCourse } from "@/lib/ai";
import { useAuth, getCurrentSession } from "@/lib/auth";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/generate")({
  beforeLoad: async ({ location }) => {
    const session = await getCurrentSession();
    if (!session)
      throw redirect({
        to: "/login",
        search: { mode: "login", redirect: location.href },
      });
  },
  component: AIGeneratorPage,
  head: () => ({ meta: [{ title: "AI Course Lab — LearnLab" }] }),
});

function AIGeneratorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [topic, setTopic] = useState("");
  const [generatedResult, setGeneratedResult] = useState<AIGeneratedCourse | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const validateTopic = (val: string): string | null => {
    const trimmed = val.trim();
    if (trimmed.length < 5) {
      return "Topic must be at least 5 characters long.";
    }
    if (trimmed.length > 80) {
      return "Topic must be at most 80 characters long.";
    }

    // Check for emojis
    let hasEmoji = false;
    try {
      const regex = new RegExp("[\\p{Emoji_Presentation}\\p{Extended_Pictographic}]", "u");
      hasEmoji = regex.test(trimmed);
    } catch (e) {
      const fallbackRegex =
        /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
      hasEmoji = fallbackRegex.test(trimmed);
    }
    if (hasEmoji) {
      return "Topic cannot contain emojis.";
    }

    // Check for HTML/Script injection
    const lower = trimmed.toLowerCase();
    if (
      lower.includes("<script") ||
      lower.includes("javascript:") ||
      lower.includes("onload=") ||
      lower.includes("onerror=") ||
      /<[^>]*>/g.test(trimmed)
    ) {
      return "Topic cannot contain script injections or HTML tags.";
    }

    return null;
  };

  const generateMutation = useMutation({
    mutationFn: () => (generateCourseWithAI as any)({ data: { topic, userId: user?.id } }),
    onSuccess: (data: any) => {
      setGeneratedResult(data);
      toast.success("Course generated successfully!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to generate course");
    },
  });

  const handleGenerate = () => {
    const error = validateTopic(topic);
    if (error) {
      toast.error(error);
      return;
    }
    generateMutation.mutate();
  };

  const handleSave = async () => {
    if (!generatedResult || !user) return;
    setIsSaving(true);
    try {
      const course = await saveGeneratedCourse(generatedResult, user.id);
      toast.success("Course saved as draft!");
      void navigate({ to: "/courses/$courseId", params: { courseId: course.id } });
    } catch (err) {
      toast.error("Failed to save course");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setGeneratedResult(null);
    setTopic("");
  };

  return (
    <SiteLayout>
      <div className="bg-background min-h-[calc(100vh-3.5rem)] font-sans selection:bg-primary/10 selection:text-primary-foreground">
        {/* --- HEADER SECTION --- */}
        <section className="border-b border-border bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="mx-auto max-w-5xl px-6 py-16 relative z-10">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors mb-8 group"
            >
              <ChevronLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />{" "}
              Dashboard
            </Link>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                  Intelligent Authoring
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                AI Course Generator
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl font-medium leading-relaxed">
                Transform a single concept into a full-scale curriculum in seconds. Leverage Gemini
                1.5 Flash to design professional learning paths.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-12">
          <AnimatePresence mode="wait">
            {!generatedResult ? (
              <motion.div
                key="input-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-12"
              >
                <div className="lg:col-span-7 space-y-8">
                  <Card className="border-border shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-8 space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          <Label htmlFor="topic" className="text-sm font-bold text-foreground">
                            What is the core topic or skill?
                          </Label>
                        </div>
                        <Input
                          id="topic"
                          placeholder="e.g. Advanced Microservices with Go and Kubernetes"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="h-14 bg-secondary/30 border-border rounded-xl px-4 text-base focus-visible:ring-primary/50"
                        />
                        <p className="text-xs text-muted-foreground font-medium italic">
                          Be specific to get a more tailored curriculum.
                        </p>
                      </div>

                      <Button
                        className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base shadow-xl shadow-primary/20 gap-3 group"
                        onClick={handleGenerate}
                        disabled={generateMutation.isPending || !topic}
                      >
                        {generateMutation.isPending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Designing Learning Path...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5 fill-current" />
                            Generate Curriculum
                            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                    <CardFooter className="bg-secondary/20 p-4 px-8 border-t border-border flex justify-center">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> GEMINI INTELLIGENCE
                        ENGINE · OPTIMIZED FOR LMS
                      </p>
                    </CardFooter>
                  </Card>
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <div className="space-y-6 pt-4">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                      Generation Flow
                    </h3>
                    {[
                      {
                        title: "Define Concept",
                        desc: "Input your target subject matter.",
                        icon: Lightbulb,
                      },
                      {
                        title: "Gemini Synthesis",
                        desc: "AI builds modules based on top content standards.",
                        icon: Sparkles,
                      },
                      {
                        title: "Dashboard Sync",
                        desc: "Save to your creator workspace in one click.",
                        icon: Layout,
                      },
                    ].map((step, i) => (
                      <div key={i} className="flex gap-5 group">
                        <div className="h-10 w-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-all shadow-sm">
                          <step.icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-foreground">{step.title}</div>
                          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-emerald-500/[0.03] border border-emerald-500/10">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground leading-none">
                        Curriculum Ready
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 font-medium">
                        Drafting complete. You can now finalize your course.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="font-bold rounded-xl h-11 px-6 border-border bg-background hover:bg-secondary"
                    >
                      Start Over
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="font-black rounded-xl h-11 px-8 bg-indigo-500 hover:bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Finalize Course
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-8 space-y-10">
                    <div className="space-y-4">
                      <h2 className="text-4xl font-bold tracking-tight text-foreground">
                        {generatedResult.title}
                      </h2>
                      <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                        {generatedResult.description}
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-border pb-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Layout className="h-4 w-4" /> Syllabus Structure
                        </h3>
                        <Badge
                          variant="secondary"
                          className="bg-secondary text-foreground font-black text-[9px] px-3 py-1 rounded-lg border border-border/50 shadow-none"
                        >
                          {(generatedResult.modules || []).length} MODULES
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        {(generatedResult.modules || []).map((mod, mIdx) => (
                          <Card
                            key={mIdx}
                            className="border-border/60 shadow-sm rounded-3xl overflow-hidden bg-card/40"
                          >
                            <div className="bg-secondary/40 p-5 px-6 border-b border-border flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center text-xs font-black text-muted-foreground">
                                  {mIdx + 1}
                                </div>
                                <span className="font-bold text-foreground">{mod.title}</span>
                              </div>
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                {(mod.lessons || []).length} Units
                              </span>
                            </div>
                            <div className="divide-y divide-border/40">
                              {(mod.lessons || []).map((les, lIdx) => (
                                <div
                                  key={lIdx}
                                  className="p-5 px-8 flex items-center justify-between hover:bg-white/[0.01] transition-colors group"
                                >
                                  <div className="flex items-center gap-5 min-w-0">
                                    <div className="h-9 w-9 rounded-xl bg-background border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all shadow-sm">
                                      {les.contentType === "video" ? (
                                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                                      ) : (
                                        <FileText className="h-3.5 w-3.5" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-bold text-zinc-700 group-hover:text-foreground transition-colors">
                                        {les.title}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground font-medium line-clamp-1 mt-1">
                                        {les.description}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-[8px] font-black uppercase tracking-widest border-border text-muted-foreground opacity-40 group-hover:opacity-100"
                                  >
                                    {les.contentType}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-8">
                    <Card className="bg-indigo-500/[0.02] border-indigo-500/10 shadow-none rounded-3xl p-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 mb-6">
                        Curriculum Goals
                      </h4>
                      <div className="space-y-4">
                        {(generatedResult.learningOutcomes || []).map((outcome, i) => (
                          <div key={i} className="flex gap-3">
                            <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                            <span className="text-sm font-medium text-muted-foreground leading-relaxed">
                              {outcome}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 pt-6 border-t border-indigo-500/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            Est. Duration
                          </span>
                          <span className="text-sm font-bold text-indigo-600">
                            {generatedResult.estimatedDuration}
                          </span>
                        </div>
                      </div>
                    </Card>

                    <div className="p-6 rounded-3xl bg-secondary/30 border border-border">
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                        This structure is a draft. After finalizing, you can edit every module,
                        lesson, and attachment manually in the course editor.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SiteLayout>
  );
}
