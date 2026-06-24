import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Settings,
  CheckCircle2,
  BrainCircuit,
  Save,
  Wand2,
  Trash,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchQuizByLesson,
  fetchQuizContentInternal,
  createQuiz,
  createQuestion,
  createOption,
  updateQuiz,
  deleteQuestion,
} from "@/lib/quizzes";
import { generateQuizWithAI } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface QuizEditorProps {
  lessonId: string;
  courseTopic?: string;
  objective?: string;
}

export function QuizEditor({ lessonId, courseTopic, objective }: QuizEditorProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Data Queries
  const { data: quiz, isLoading: isLoadingQuiz } = useQuery({
    queryKey: ["quiz", lessonId],
    queryFn: () => fetchQuizByLesson(lessonId),
  });

  const { data: questions = [], isLoading: isLoadingContent } = useQuery({
    queryKey: ["quiz-content", quiz?.id],
    queryFn: () => (quiz ? fetchQuizContentInternal(quiz.id) : []),
    enabled: !!quiz?.id,
  });

  // Local State for Manual Entry
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<any>("multiple_choice");
  const [newOptions, setNewOptions] = useState([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [aiDifficulty, setAiDifficulty] = useState("Intermediate");

  // Config State
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState(0);

  useEffect(() => {
    if (quiz) {
      setPassingScore(quiz.passingScore ?? 70);
      setTimeLimit(quiz.timeLimit ?? 0);
    }
  }, [quiz]);

  // Mutations
  const createQuizMutation = useMutation({
    mutationFn: () =>
      (createQuiz as any)({
        data: { lesson_id: lessonId, title: "Lesson Quiz", passing_score: 70 },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz", lessonId] }),
  });

  const updateConfigMutation = useMutation({
    mutationFn: () =>
      (updateQuiz as any)({
        data: {
          id: quiz!.id,
          updates: {
            passing_score: passingScore,
            time_limit: timeLimit,
          },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", lessonId] });
      toast.success("Quiz settings saved");
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => (deleteQuestion as any)({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-content", quiz?.id] });
      toast.success("Question removed");
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!quiz) return;
      const q = (await (createQuestion as any)({
        data: {
          quiz_id: quiz.id,
          question_text: newQuestionText,
          question_type: newQuestionType,
          order_index: (questions?.length || 0) + 1,
        },
      })) as any;
      if (newOptions && newOptions.length > 0) {
        for (let i = 0; i < newOptions.length; i++) {
          await (createOption as any)({
            data: {
              question_id: q.id,
              option_text: newOptions[i].text,
              is_correct: newOptions[i].isCorrect,
              order_index: i + 1,
            },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-content", quiz?.id] });
      setNewQuestionText("");
      setNewOptions([
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
      toast.success("Manual question added");
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!quiz) return;
      const data = await (generateQuizWithAI as any)({
        data: {
          topic: courseTopic || "General Topic",
          objective: objective || "General Learning",
          difficulty: aiDifficulty,
          userId: user?.id,
        },
      });
      for (const qData of data.questions) {
        const q = (await (createQuestion as any)({
          data: {
            quiz_id: quiz.id,
            question_text: qData.text,
            question_type: qData.type,
            order_index: (questions?.length || 0) + 1,
          },
        })) as any;
        for (let i = 0; i < qData.options.length; i++) {
          await (createOption as any)({
            data: {
              question_id: q.id,
              option_text: qData.options[i].text,
              is_correct: qData.options[i].isCorrect,
              order_index: i + 1,
            },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-content", quiz?.id] });
      toast.success("AI Generated successfully!");
    },
  });

  if (isLoadingQuiz)
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );

  if (!quiz)
    return (
      <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <BrainCircuit className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-bold text-slate-900 mb-2 text-lg">No Quiz Found</h3>
        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">
          Add an assessment to this lesson to help your students validate their learning.
        </p>
        <Button
          onClick={() => createQuizMutation.mutate()}
          disabled={createQuizMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold h-12 px-8 shadow-lg shadow-primary/20"
        >
          {createQuizMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}{" "}
          Initialize Quiz
        </Button>
      </div>
    );

  return (
    <div className="space-y-10 text-left custom-scrollbar overflow-y-auto max-h-[85vh] pr-2 pb-10">
      {/* 1. CONFIGURATION */}
      <section className="space-y-6">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
          Quiz Parameters
        </h4>
        <Card className="border-slate-200 shadow-sm bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-700">
                  Minimum Passing Score (%)
                </Label>
                <Input
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-700">Duration (Minutes)</Label>
                <Input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end pt-6 border-t border-slate-50">
              <Button
                size="sm"
                className="rounded-xl font-bold h-10 px-6 gap-2"
                onClick={() => updateConfigMutation.mutate()}
                disabled={updateConfigMutation.isPending}
              >
                {updateConfigMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}{" "}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. CREATION MODES */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Path */}
        <Card className="border-primary/20 bg-primary/[0.02] shadow-none rounded-[2rem] p-8 border-l-4 border-l-primary relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h4 className="font-bold text-slate-900">AI Intelligent Path</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Let Gemini generate comprehensive questions based on your lesson topic and objectives.
            </p>
            <div className="flex items-center gap-4">
              <select
                className="h-10 rounded-xl border border-primary/20 bg-white px-3 text-xs font-bold text-slate-700 outline-none"
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
              >
                <option value="Beginner">Level: Beginner</option>
                <option value="Intermediate">Level: Intermediate</option>
                <option value="Advanced">Level: Advanced</option>
              </select>
              <Button
                className="flex-1 rounded-xl h-10 bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-primary/10"
                onClick={() => aiGenerateMutation.mutate()}
                disabled={aiGenerateMutation.isPending}
              >
                {aiGenerateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}{" "}
                Auto-Generate
              </Button>
            </div>
          </div>
          <Sparkles className="absolute -right-4 -bottom-4 h-24 w-24 text-primary/5 -rotate-12" />
        </Card>

        {/* Manual Path Entry */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-[2rem] p-8 group">
          <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-slate-400 group-hover:rotate-90 transition-transform duration-300" />{" "}
            Manual Addition
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Question Text
              </Label>
              <Input
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="e.g. What is React?"
                className="h-11 border-slate-100 bg-slate-50 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Options
              </Label>
              {newOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div
                    className={cn(
                      "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center cursor-pointer border transition-all",
                      opt.isCorrect
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200"
                        : "bg-slate-50 border-slate-200 text-slate-300 hover:border-slate-300",
                    )}
                    onClick={() => {
                      const updated = [...newOptions];
                      updated[idx].isCorrect = !updated[idx].isCorrect;
                      setNewOptions(updated);
                    }}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <Input
                    value={opt.text}
                    onChange={(e) => {
                      const updated = [...newOptions];
                      updated[idx].text = e.target.value;
                      setNewOptions(updated);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="h-10 border-slate-100 bg-slate-50 rounded-xl text-xs"
                  />
                  {newOptions.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-slate-300 hover:text-red-500"
                      onClick={() => setNewOptions(newOptions.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-dashed border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400 h-10 font-bold text-[10px] uppercase tracking-widest"
                onClick={() => setNewOptions([...newOptions, { text: "", isCorrect: false }])}
              >
                <Plus className="h-3 w-3 mr-2" /> Add Choice
              </Button>
            </div>

            <Button
              className="w-full h-11 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white mt-4"
              disabled={
                !newQuestionText ||
                addQuestionMutation.isPending ||
                newOptions.some((o) => !o.text) ||
                !newOptions.some((o) => o.isCorrect)
              }
              onClick={() => addQuestionMutation.mutate()}
            >
              {addQuestionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}{" "}
              Save Question
            </Button>
          </div>
        </Card>
      </section>

      {/* 3. QUESTION LIST */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Current Question Bank ({questions.length})
          </h4>
        </div>

        <div className="space-y-4">
          {isLoadingContent && (
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-20" />
          )}
          {questions.map((q: any, i: number) => (
            <Card
              key={q.id}
              className="border-slate-100 bg-white shadow-none rounded-2xl overflow-hidden group hover:border-slate-200 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-200">
                      {i + 1}
                    </div>
                    <p className="font-bold text-slate-800 pt-1.5">{q.text}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-300 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => deleteQuestionMutation.mutate(q.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-12">
                  {q.options?.map((o: any) => (
                    <div
                      key={o.id}
                      className={cn(
                        "text-xs p-3 rounded-xl border flex items-center justify-between",
                        o.isCorrect
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700 font-bold shadow-sm"
                          : "bg-slate-50 border-slate-50 text-slate-500 opacity-60",
                      )}
                    >
                      <span className="truncate">{o.text}</span>
                      {o.isCorrect && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {questions.length === 0 && !isLoadingContent && (
            <div className="py-12 text-center text-slate-300 italic text-sm">
              No questions in bank. Start adding manually or use AI.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
