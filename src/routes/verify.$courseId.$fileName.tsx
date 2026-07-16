import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, FileText, Download, Sparkles, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";
import { supabase } from "@/lib/supabase";
import { SelectionTermExplainer } from "@/components/selection-term-explainer";

export const Route = createFileRoute("/verify/$courseId/$fileName")({
  component: ResourceViewerPage,
});

/**
 * Professional Resource Viewer
 * This page acts as a "Beautiful" wrapper for Markdown/HTML resources.
 */
function ResourceViewerPage() {
  const { courseId, fileName } = Route.useParams();
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResource() {
      if (!courseId || !fileName) return;

      setIsLoading(true);
      setError(null);
      try {
        const path = `${courseId}/${fileName}`;
        console.log("Attempting to download resource:", path);

        const { data, error: storageError } = await supabase.storage
          .from("course-resources")
          .download(path);

        if (storageError) {
          console.error("Supabase Download Error:", storageError);
          if (
            storageError.message.includes("404") ||
            storageError.message.includes("Object not found")
          ) {
            throw new Error(
              "The study guide file could not be found. It might still be uploading or was deleted.",
            );
          }
          throw new Error(`Storage Error: ${storageError.message}`);
        }

        if (!data) {
          throw new Error("Received no data from the storage server.");
        }

        const text = await data.text();
        if (!text || text.trim().length === 0) {
          throw new Error(
            "The study guide is currently empty. Please wait a few seconds and try generating it again.",
          );
        }
        setContent(text);
      } catch (err: any) {
        console.error("Resource Viewer Execution Error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchResource();
  }, [courseId, fileName]);

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 bg-slate-50/50">
          <div className="relative">
            <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 text-center">
            <p className="font-black text-slate-900 uppercase tracking-[0.2em] text-sm">
              Analyzing Knowledge Base
            </p>
            <p className="text-slate-400 font-medium text-xs">
              Preparing your premium study materials...
            </p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // Beautiful Error State
  if (error) {
    return (
      <SiteLayout>
        <div className="bg-[#f8fafc] min-h-[90vh] py-12 px-6 flex items-center justify-center">
          <Card className="max-w-md w-full border-rose-100 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <div className="bg-rose-50 p-10 text-center border-b border-rose-100">
              <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-rose-500 mx-auto mb-6 border border-rose-100">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                Unavailable Content
              </h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">{error}</p>
            </div>
            <CardContent className="p-8">
              <Button
                className="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                onClick={() => window.history.back()}
              >
                Return to Course
              </Button>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  // Prettify Title: "resource-123456.md" -> "Study Resource"
  // or "My_Great_Topic_resource.md" -> "My Great Topic"
  const displayTitle = fileName.includes("_")
    ? fileName.split("_").slice(0, -1).join(" ")
    : fileName.startsWith("resource-")
      ? "Premium Study Guide"
      : fileName.replace(/\.[^/.]+$/, "").replace(/-/g, " ");

  return (
    <SiteLayout>
      <div className="bg-[#f8fafc] min-h-screen py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Navigation */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-10 group"
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              Return to Course
            </span>
          </button>

          <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden bg-white">
            <div className="bg-gradient-to-br from-primary to-indigo-600 p-16 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 mb-8 backdrop-blur-md">
                Professional Study Guide
              </Badge>
              <h1 className="text-5xl font-black tracking-tight leading-tight mb-4 drop-shadow-sm capitalize">
                {displayTitle}
              </h1>
              <p className="text-indigo-100 font-medium text-lg max-w-xl mx-auto opacity-80">
                Premium educational materials curated by LearnLab AI Systems.
              </p>
            </div>

            <CardContent className="p-20">
              <div
                className="prose prose-slate prose-lg max-w-none 
                prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
                prose-h1:text-5xl prose-h1:mb-12
                prose-h2:text-3xl prose-h2:border-l-8 prose-h2:border-primary prose-h2:pl-6 prose-h2:mt-16 prose-h2:mb-8
                prose-h3:text-xl prose-h3:text-primary prose-h3:uppercase prose-h3:tracking-widest
                prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-xl prose-p:mb-8
                prose-strong:text-slate-900 prose-strong:font-extrabold
                prose-ul:list-none prose-ul:pl-0 prose-ul:space-y-4
                prose-li:bg-slate-50 prose-li:p-6 prose-li:rounded-2xl prose-li:border prose-li:border-slate-100 prose-li:text-slate-700 prose-li:font-medium
                prose-li:before:content-['\2713'] prose-li:before:text-primary prose-li:before:font-black prose-li:before:mr-4
              "
              >
                {content?.trim().startsWith("<!DOCTYPE html>") ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(content || ""),
                    }}
                  />
                ) : (
                  <ReactMarkdown>{content || ""}</ReactMarkdown>
                )}
              </div>
            </CardContent>

            <div className="bg-slate-50 border-t border-slate-100 p-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary border border-slate-100">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">LearnLab Content Systems</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    © 2024 AI Education Partner
                  </p>
                </div>
              </div>
              <Button
                className="h-14 px-8 rounded-2xl font-black bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 shadow-sm gap-3"
                onClick={() => window.print()}
              >
                <Download className="h-5 w-5" />
                Download PDF
              </Button>
            </div>
          </Card>

          <footer className="mt-20 text-center pb-12">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
              Verified Digital Resource &bull; LearnLab 99
            </p>
          </footer>
        </div>
      </div>
      <SelectionTermExplainer />
    </SiteLayout>
  );
}

import { Button } from "@/components/ui/button";
