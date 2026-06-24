import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { explainTermWithAI } from "@/lib/ai";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, BookOpen, X, HelpCircle, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function SelectionTermExplainer() {
  const { user } = useAuth();
  const [selectedText, setSelectedText] = useState("");
  const [contextText, setContextText] = useState("");
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [explanation, setExplanation] = useState<{
    term: string;
    explanation: string;
    category?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const explainerBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const handleSelectionDetect = (e: MouseEvent | TouchEvent) => {
      // Small delay to let browser update selection state
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection) return;

        const text = selection.toString().trim();
        // Allow spaces and clean newlines
        const cleanText = text.replace(/\s+/g, " ");

        // Support phrase and paragraph lengths from 2 to 10000 characters
        if (cleanText.length >= 2 && cleanText.length <= 10000) {
          try {
            const range = selection.getRangeAt(0);
            let context = "";
            if (range.commonAncestorContainer) {
              const parent = range.commonAncestorContainer.parentElement;
              if (parent) {
                context = parent.innerText.slice(0, 300);
              }
            }

            setSelectedText(cleanText);
            setContextText(context);

            // Get exact mouse/touch release coordinates
            let pageX = 0;
            let pageY = 0;

            if ("changedTouches" in e && e.changedTouches && e.changedTouches.length > 0) {
              const touch = e.changedTouches[0];
              pageX = touch.pageX;
              pageY = touch.pageY;
            } else if ("pageX" in e) {
              pageX = (e as MouseEvent).pageX;
              pageY = (e as MouseEvent).pageY;
            }

            if (pageX && pageY) {
              // Position button exactly where mouse/finger was lifted, slightly offset
              setButtonPosition({
                top: pageY - 45,
                left: pageX - 60,
              });
            } else {
              // Fallback to selection bounding box
              const rect = range.getBoundingClientRect();
              setButtonPosition({
                top: window.scrollY + rect.top - 40,
                left: window.scrollX + rect.left + rect.width / 2 - 60,
              });
            }
          } catch (err) {
            // fail silently
          }
        } else {
          // Hide button if selection is empty/cleared
          setButtonPosition(null);
        }
      }, 80);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (explainerBtnRef.current?.contains(e.target as Node)) {
        return; // Don't hide if clicking the explain button itself
      }

      // Delay clear slightly to let click events propagate
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length === 0) {
          setButtonPosition(null);
        }
      }, 150);
    };

    document.addEventListener("mouseup", handleSelectionDetect);
    document.addEventListener("touchend", handleSelectionDetect);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleSelectionDetect);
      document.removeEventListener("touchend", handleSelectionDetect);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  const handleExplainClick = async () => {
    if (!selectedText) return;
    setButtonPosition(null);
    setIsDialogOpen(true);
    setIsLoading(true);
    setExplanation(null);

    try {
      const res = await (explainTermWithAI as any)({
        data: {
          term: selectedText,
          context: contextText,
          userId: user?.id,
        },
      });
      setExplanation(res);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "ไม่สามารถอธิบายศัพท์คำนี้ได้ในขณะนี้");
      setIsDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const isLongSelection = selectedText.length > 100;

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {buttonPosition && selectedText && (
          <motion.button
            ref={explainerBtnRef}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: "absolute",
              top: buttonPosition.top,
              left: buttonPosition.left,
              zIndex: 50,
            }}
            onClick={handleExplainClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 text-white font-sans text-xs font-black shadow-lg border border-white/20 hover:bg-primary transition-all backdrop-blur-sm group active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400 group-hover:animate-pulse" />
            <span>{isLongSelection ? "สรุปเนื้อหา 🤖" : "อธิบายศัพท์ 🤖"}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Explanation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className={cn(
            "bg-white/95 border border-slate-200/80 rounded-[2.5rem] p-0 shadow-2xl text-slate-900 font-sans overflow-hidden backdrop-blur-xl transition-all duration-300",
            isLongSelection ? "max-w-2xl" : "max-w-md",
          )}
        >
          <div className={cn("space-y-6", isLongSelection ? "p-10" : "p-8")}>
            <DialogHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                  <BookOpen className="h-5 w-5" />
                </div>
                {explanation?.category && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                    {explanation.category}
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl font-black tracking-tight flex items-baseline gap-2">
                <span className="text-slate-900 capitalize font-extrabold">
                  {selectedText.length > 50 ? selectedText.slice(0, 50) + "..." : selectedText}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {isLongSelection
                  ? "สรุปความหมายและใจความสำคัญ"
                  : "คำศัพท์วิชาการ / ศัพท์เฉพาะทางภาษาต่างประเทศ"}
              </DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="relative">
                  <div className="h-12 w-12 animate-spin rounded-full border-3 border-primary/20 border-t-primary" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">กำลังส่งให้ AI ประมวลผล...</p>
                  <p className="text-xs font-medium text-slate-400">
                    {isLongSelection
                      ? "กำลังสรุปเนื้อหาบทเรียนย่อย..."
                      : "ค้นหาคำอธิบายและความหมายในบริบทบทเรียน"}
                  </p>
                </div>
              </div>
            ) : (
              explanation && (
                <div className="space-y-5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <HelpCircle className="h-3 w-3" />{" "}
                      {isLongSelection ? "สรุปประเด็นหลักโดย AI" : "คำอธิบายจาก AI Tutor"}
                    </h4>
                    <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-line max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
                      {explanation.explanation}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/40 flex items-center gap-2 text-[10px] text-emerald-600 font-black">
                    <Check className="h-3.5 w-3.5 bg-emerald-50 rounded-full p-0.5 border border-emerald-200" />
                    แปลและสรุปบริบทตามคอร์สเรียนนี้โดยอัตโนมัติ
                  </div>
                </div>
              )
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                className="rounded-xl font-bold h-11 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                onClick={() => setIsDialogOpen(false)}
              >
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
