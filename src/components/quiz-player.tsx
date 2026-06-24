import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Trophy,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchStudentQuizContent, submitQuizAttempt, fetchBestQuizAttempt } from "@/lib/quizzes";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface QuizPlayerProps {
  quizId: string;
  userId: string;
  passingScore?: number;
  onComplete?: (passed: boolean, score: number) => void;
}

export function QuizPlayer({ quizId, userId, passingScore = 70, onComplete }: QuizPlayerProps) {
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const isFirstLoad = useRef(true);

  const { data: questions = [], isLoading: loading } = useQuery({
    queryKey: ["quiz-content", quizId],
    queryFn: () => fetchStudentQuizContent(quizId),
  });

  const { data: bestAttempt, isLoading: loadingAttempt } = useQuery({
    queryKey: ["quiz-best-attempt", quizId, userId],
    queryFn: () => fetchBestQuizAttempt(quizId, userId),
    enabled: !!userId && !!quizId,
    staleTime: 0,
  });

  // Track if we have already initialized from the DB for the current quizId
  const initializedForQuiz = useRef<string | null>(null);

  useEffect(() => {
    // If we have a record and we haven't initialized for THIS quizId yet
    if (bestAttempt && !isSubmitted && initializedForQuiz.current !== quizId) {
      setScore(bestAttempt.score);
      setPassed(bestAttempt.passed);
      setIsSubmitted(true);
      initializedForQuiz.current = quizId;
    }
  }, [bestAttempt, isSubmitted, quizId]);

  // Reset initialization flag when quizId changes to a new one
  useEffect(() => {
    if (initializedForQuiz.current !== quizId && initializedForQuiz.current !== "manual-reset") {
      setCurrentQuestionIndex(0);
      setSelectedOptions({});
      setIsSubmitted(false);
      setScore(0);
      setPassed(false);
    }
  }, [quizId]);

  const submitMutation = useMutation({
    mutationFn: (answers: Record<string, string[]>) => submitQuizAttempt(quizId, answers),
    onSuccess: (result: any) => {
      // Force immediate invalidation to get the fresh state
      queryClient.invalidateQueries({ queryKey: ["quiz-best-attempt", quizId, userId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-attempts", quizId, userId] });

      // Show the latest result immediately
      setScore(result.score);
      setPassed(result.passed);
      setIsSubmitted(true);
      initializedForQuiz.current = quizId; // Re-mark as initialized

      if (result.passed) {
        triggerConfetti();
      }
      if (onComplete) onComplete(result.passed, result.score);
    },
    onError: () => {
      toast.error("Failed to save attempt");
    },
  });

  const handleOptionSelect = (questionId: string, optionId: string, type: string) => {
    if (isSubmitted) return;

    setSelectedOptions((prev) => {
      const current = prev[questionId] || [];
      if (type === "multi_select") {
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...current, optionId] };
        }
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  const handleSubmit = async () => {
    submitMutation.mutate(selectedOptions);
  };

  const handleReset = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptions({});
    setIsSubmitted(false);
    setScore(0);
    setPassed(false);
    // When manually resetting, we keep initializedForQuiz.current = quizId
    // so the useEffect doesn't trigger an automatic re-initialization.
  };

  if (loading || loadingAttempt) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Preparing Assessment...
        </p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="p-16 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
        <div className="h-16 w-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-6 w-6 text-zinc-600" />
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
          No questions available for this module.
        </p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-white/5 shadow-2xl bg-zinc-900 overflow-hidden rounded-[2.5rem]">
          <CardContent className="p-16 text-center space-y-10 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-50" />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className={cn(
                "h-28 w-28 rounded-full mx-auto flex items-center justify-center shadow-2xl relative z-10",
                passed
                  ? "bg-emerald-500 text-white shadow-emerald-500/20"
                  : "bg-red-500 text-white shadow-red-500/20",
              )}
            >
              {passed ? <Trophy className="h-14 w-14" /> : <RotateCcw className="h-14 w-14" />}
            </motion.div>

            <div className="space-y-3 relative z-10">
              <h2 className="text-4xl font-black text-white tracking-tight">
                {passed ? "Assessment Passed!" : "Keep Practicing"}
              </h2>
              <p className="text-zinc-400 font-medium max-w-md mx-auto">
                {passed
                  ? "Excellent work! You've demonstrated a solid understanding of the material."
                  : "Don't worry, reviewing the material and trying again is the best way to learn."}
              </p>
            </div>

            <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-8 grid grid-cols-2 gap-8 max-w-md mx-auto relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Final Score
                </p>
                <p
                  className={cn(
                    "text-5xl font-black",
                    passed ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {score}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Status
                </p>
                <Badge
                  className={cn(
                    "h-10 px-6 text-xs font-black uppercase tracking-widest border-none mt-2",
                    passed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400",
                  )}
                >
                  {passed ? "Passed" : "Failed"}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-4 items-center justify-center relative z-10 pt-4">
              <Button
                onClick={handleReset}
                className="h-14 px-12 rounded-2xl font-black gap-3 bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all active:scale-95 text-base"
              >
                <RotateCcw className="h-5 w-5" /> RETRY ASSESSMENT
              </Button>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                You can retake this quiz to improve your score
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === (questions?.length || 0) - 1;

  if (!currentQuestion) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8" key={`quiz-${quizId}`}>
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-5 w-full max-w-md">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-sm border border-indigo-500/20">
            {currentQuestionIndex + 1}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-end mb-2">
              <h3 className="font-bold text-zinc-300">
                Question {currentQuestionIndex + 1}{" "}
                <span className="text-zinc-600 font-medium">of {questions.length}</span>
              </h3>
              <span className="text-[10px] font-black text-indigo-400">
                {Math.round(((currentQuestionIndex + 1) / (questions?.length || 1)) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <motion.div
                className="h-full bg-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${((currentQuestionIndex + 1) / (questions?.length || 1)) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="font-black uppercase tracking-widest text-[9px] px-3 py-1 bg-zinc-900 border-white/10 text-zinc-400 hidden sm:flex"
        >
          {currentQuestion.type?.replace("_", " ") || "MULTIPLE CHOICE"}
        </Badge>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-white/5 shadow-2xl bg-zinc-900 overflow-hidden rounded-[2rem]">
            <CardHeader className="p-8 md:p-10 pb-6 border-b border-white/5 bg-zinc-900/50">
              <CardTitle className="text-2xl md:text-3xl font-black leading-tight text-white">
                {currentQuestion.text}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 md:p-10 space-y-4 bg-zinc-950/50">
              {currentQuestion.options?.map((option: any) => {
                const isSelected = (selectedOptions[currentQuestion.id] || []).includes(option.id);
                return (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() =>
                      handleOptionSelect(
                        currentQuestion.id,
                        option.id,
                        currentQuestion.type || "multiple_choice",
                      )
                    }
                    className={cn(
                      "w-full p-6 rounded-2xl border-2 text-left transition-all duration-300 flex items-center justify-between group",
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                        : "border-white/5 hover:border-white/20 hover:bg-white/[0.02] bg-zinc-900",
                    )}
                  >
                    <span
                      className={cn(
                        "font-bold text-lg",
                        isSelected ? "text-indigo-400" : "text-zinc-300 group-hover:text-zinc-100",
                      )}
                    >
                      {option.text}
                    </span>
                    <div
                      className={cn(
                        "h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0",
                        isSelected
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-zinc-700 group-hover:border-zinc-500",
                      )}
                    >
                      {isSelected && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                  </motion.button>
                );
              })}
            </CardContent>
            <CardFooter className="bg-zinc-900 p-6 md:p-8 flex items-center justify-between border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => setCurrentQuestionIndex((i) => i - 1)}
                disabled={currentQuestionIndex === 0}
                className="font-bold gap-2 text-zinc-400 hover:text-white rounded-xl h-12 px-6"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              {isLastQuestion ? (
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !selectedOptions[currentQuestion.id]?.length || submitMutation.isPending
                  }
                  className="font-black px-10 h-14 rounded-xl shadow-xl shadow-indigo-500/20 bg-indigo-500 hover:bg-indigo-600 text-white gap-2 text-base"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  Submit Assessment
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                  disabled={!selectedOptions[currentQuestion.id]?.length}
                  className="font-bold gap-2 h-14 rounded-xl px-8 shadow-lg shadow-indigo-500/20 bg-indigo-500 hover:bg-indigo-600 text-white text-base"
                >
                  Next Question <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
