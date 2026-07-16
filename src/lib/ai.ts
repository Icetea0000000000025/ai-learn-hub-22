import { createServerFn } from "@tanstack/react-start";
import { createCourseInternal } from "./courses";
import { createModuleInternal } from "./modules";
import { createLessonInternal } from "./lessons";
import { z } from "zod";
import { GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUBSCRIPTION_PLANS } from "./config";
import { supabase, getAdminDb } from "./supabase";
import { requireUser } from "./server-auth";

// --- SCHEMAS ---

export const AIGeneratedCourseSchema = z.object({
  title: z.string(),
  description: z.string(),
  learningOutcomes: z.array(z.string()).default([]),
  estimatedDuration: z.string().default("4-6 hours"),
  modules: z
    .array(
      z.object({
        title: z.string(),
        lessons: z
          .array(
            z.object({
              title: z.string(),
              contentType: z.enum(["video", "pdf", "quiz", "text", "slide"]).default("video"),
              description: z.string().default(""),
              script: z.string().optional(), // Script for video generation
            }),
          )
          .default([]),
      }),
    )
    .default([]),
  suggestedQuizzes: z.array(z.string()).default([]),
});

export type AIGeneratedCourse = z.infer<typeof AIGeneratedCourseSchema>;

export const AIGeneratedQuizSchema = z.object({
  questions: z.array(
    z.object({
      text: z.string(),
      type: z.enum(["multiple_choice", "multi_select", "true_false"]),
      options: z.array(
        z.object({
          text: z.string(),
          isCorrect: z.boolean(),
        }),
      ),
    }),
  ),
});

export type AIGeneratedQuiz = z.infer<typeof AIGeneratedQuizSchema>;

// --- AI ENGINES (GEMINI) ---

async function fetchGeminiWithUniversalFallback(
  prompt: string,
  apiKey: string,
  forceJson = true,
  feature = "unknown",
  userId?: string,
) {
  // Use either the passed key or the one from env
  const effectiveApiKey = apiKey || GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!effectiveApiKey) {
    console.error("Critical AI Error: GEMINI_API_KEY is missing.");
    throw new Error(
      "AI configuration error: GEMINI_API_KEY is missing. Please contact administrator.",
    );
  }

  const adminDb = getAdminDb();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    (globalThis as any).process?.env?.SUPABASE_SERVICE_ROLE_KEY ||
    (globalThis as any).env?.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    console.warn(
      "Operational Warning: SUPABASE_SERVICE_ROLE_KEY is missing. Quota enforcement and logging will likely fail due to RLS.",
    );
  }

  // 1. Check if AI is globally enabled
  const { data: aiSettings, error: settingsError } = await adminDb
    .from("system_settings")
    .select("value")
    .eq("key", "ai_enabled")
    .maybeSingle();

  if (settingsError) {
    console.error("AI Settings Fetch Error:", settingsError);
  }

  const isAIEnabled = aiSettings?.value === true;
  if (aiSettings && !isAIEnabled) {
    throw new Error("AI services are currently disabled by the administrator.");
  }

  // 2. Check Quotas if userId is provided
  let finalUserId = userId;
  if (!finalUserId) {
    const {
      data: { user },
    } = await adminDb.auth.getUser();
    finalUserId = user?.id;
  }

  if (finalUserId) {
    console.log(`[AI] Quota check start for User: ${finalUserId}, Feature: ${feature}`);

    // Fetch User Subscription and AI usage
    const { data: profile } = await adminDb
      .from("profiles")
      .select("subscription_tier, ai_course_creation_count, last_ai_reset_at")
      .eq("id", finalUserId)
      .single();

    const tier = (profile?.subscription_tier || "free") as keyof typeof SUBSCRIPTION_PLANS;
    const plan = SUBSCRIPTION_PLANS[tier];
    const usageCount = profile?.ai_course_creation_count || 0;

    // Quota Logic for Course Generation
    if (feature === "course_gen") {
      if (tier === "free") {
        if (usageCount >= plan.aiQuota) {
          throw new Error(
            `Free trial limit reached: You can only generate ${plan.aiQuota} courses for free. Please upgrade to a paid plan for more.`,
          );
        }
      } else {
        // Monthly Reset Check for Paid Tiers
        const lastReset = profile?.last_ai_reset_at
          ? new Date(profile.last_ai_reset_at)
          : new Date(0);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        if (lastReset < oneMonthAgo) {
          // Reset count and update last_ai_reset_at
          await adminDb
            .from("profiles")
            .update({
              ai_course_creation_count: 0,
              last_ai_reset_at: new Date().toISOString(),
            })
            .eq("id", finalUserId);
          console.log(`[AI] Monthly quota reset for user ${finalUserId}`);
        } else if (usageCount >= plan.aiQuota) {
          throw new Error(
            `Monthly quota reached for ${plan.name} plan: You have used your ${plan.aiQuota} course generations for this month.`,
          );
        }
      }
    }

    // Standard Daily Feature Quotas (Existing logic but using system_settings as override)
    const { data: quotas } = await adminDb
      .from("system_settings")
      .select("value")
      .eq("key", "ai_quotas")
      .maybeSingle();

    const quotaMap = (quotas?.value as Record<string, number>) || {};
    const featureQuota = quotaMap[feature] !== undefined ? quotaMap[feature] : 50;

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const { count } = await adminDb
      .from("ai_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", finalUserId)
      .eq("feature", feature)
      .eq("response_status", 200)
      .gte("created_at", startOfToday.toISOString());

    const currentUsage = count ?? 0;
    if (currentUsage >= featureQuota) {
      throw new Error(
        `Daily limit for ${feature.replace("_", " ")} exceeded. Please try again tomorrow.`,
      );
    }
  }

  const model = "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveApiKey}`;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      if (forceJson) {
        body.generationConfig = { response_mime_type: "application/json" };
      }

      console.log(`Invoking AI Feature: ${feature} (Attempt ${attempt + 1})`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || response.statusText || JSON.stringify(data);
        console.error(`Gemini API Error (${response.status}):`, errorMsg);

        // Log Error
        if (finalUserId) {
          const { error: logErr } = await adminDb.from("ai_logs").insert({
            user_id: finalUserId,
            feature,
            prompt: prompt.slice(0, 500),
            response_status: response.status,
            error_message: errorMsg,
          });
          if (logErr) console.error("AI Log Error (Insert Failure):", logErr);
        }

        const isRetryable =
          response.status === 429 ||
          response.status === 503 ||
          errorMsg.toLowerCase().includes("high demand") ||
          errorMsg.toLowerCase().includes("temporary");

        if (isRetryable && attempt < maxRetries - 1) {
          attempt++;
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(errorMsg);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const reason = data.candidates?.[0]?.finishReason || "Unknown";
        console.warn(`AI returned no content. Reason: ${reason}`);

        // Log empty response
        if (finalUserId) {
          await adminDb.from("ai_logs").insert({
            user_id: finalUserId,
            feature,
            prompt: prompt.slice(0, 500),
            response_status: 200,
            error_message: `AI returned no content. Reason: ${reason}`,
          });
        }

        throw new Error(`AI returned no content. Reason: ${reason}`);
      }

      // Log Success
      if (finalUserId) {
        console.log(`Logging successful AI usage for ${feature}...`);

        const updates: any = {
          user_id: finalUserId,
          feature,
          prompt: prompt.slice(0, 500),
          response_status: 200,
        };

        // Increment Course Creation Count if applicable
        if (feature === "course_gen") {
          const { error: incErr } = await (adminDb as any).rpc("increment_ai_count", {
            user_uuid: finalUserId,
          });
          if (incErr) {
            // Fallback if RPC doesn't exist yet
            const { data: p } = await adminDb
              .from("profiles")
              .select("ai_course_creation_count")
              .eq("id", finalUserId)
              .single();
            await adminDb
              .from("profiles")
              .update({ ai_course_creation_count: (p?.ai_course_creation_count || 0) + 1 })
              .eq("id", finalUserId);
          }
        }

        const { error: logErr } = await adminDb.from("ai_logs").insert(updates);
        if (logErr) {
          console.error("AI Log Success (Insert Failure):", logErr);
          // If insert fails but response was 200, we still return the text,
          // but we warned that RLS might be blocking the logs.
        } else {
          console.log(`AI usage logged successfully for ${feature}.`);
        }
      }

      return text;
    } catch (e: any) {
      if (attempt < maxRetries - 1) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error("AI service is currently unavailable. Please try again later.");
}

// --- BOTNOI ENGINE (FUTURE) ---

/**
 * Placeholder for Botnoi Video Generation.
 * This will be populated once you have the API Key.
 */
async function generateVideoWithBotnoi(script: string, botnoiKey?: string) {
  if (!botnoiKey) {
    console.warn("Botnoi API Key not found. Video generation skipped.");
    return null;
  }

  // TODO: Implement Botnoi API call here
  // const response = await fetch('https://api.botnoi.ai/v1/generate-video', { ... })
  return null;
}

// --- PUBLIC FUNCTIONS ---

export const generateCourseWithAI = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { topic, userId } = ctx.data;
  const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const prompt = `Generate a professional course structure for: ${topic}.
    Be concise but comprehensive. Focus on high-impact modules.
    
    Return a JSON object:
    {
      "title": "Course Title",
      "description": "Short description",
      "learningOutcomes": ["outcome 1", "outcome 2"],
      "estimatedDuration": "X hours",
      "modules": [
        {
          "title": "Module Title",
          "lessons": [
            { 
              "title": "Lesson Title", 
              "contentType": "video", 
              "description": "Brief summary",
              "script": "A 1-minute engaging narration script." 
            }
          ]
        }
      ],
      "suggestedQuizzes": ["Quiz topic"]
    }
    Respond ONLY with valid JSON.`;

  const content = await fetchGeminiWithUniversalFallback(
    prompt,
    apiKey,
    true,
    "course_gen",
    userId,
  );
  const jsonStr = content
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return AIGeneratedCourseSchema.parse(parsed);
  } catch (e) {
    console.error("AI JSON Parse/Validation Error:", e, "Content:", jsonStr);
    throw new Error("AI returned invalid data structure. Please try again.");
  }
});

export const generateQuizWithAI = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { topic, objective, difficulty, userId } = ctx.data;
  const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const prompt = `Generate 5 quiz questions for ${topic} (Objective: ${objective}, Level: ${difficulty}). 
    Return a JSON object with this structure:
    {
      "questions": [
        {
          "text": "Question text",
          "type": "multiple_choice",
          "options": [
            { "text": "Option 1", "isCorrect": true },
            { "text": "Option 2", "isCorrect": false }
          ]
        }
      ]
    }
    Respond ONLY with valid JSON.`;

  const content = await fetchGeminiWithUniversalFallback(prompt, apiKey, true, "quiz_gen", userId);
  const jsonStr = content
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return AIGeneratedQuizSchema.parse(parsed);
  } catch (e) {
    console.error("AI Quiz Parse Error:", e);
    throw new Error("AI returned invalid quiz structure.");
  }
});

export const generateCertificateDescription = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { name, courseTitle, userId } = ctx.data;
    const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const prompt = `Generate a formal 2-sentence validation statement for a certificate of completion. 
    Recipient: ${name}
    Course: ${courseTitle}
    
    The statement should confirm their mastery and dedication. 
    Return a JSON object: { "statement": "..." }
    Respond ONLY with valid JSON.`;

    const content = await fetchGeminiWithUniversalFallback(
      prompt,
      apiKey,
      true,
      "certificate_gen",
      userId,
    );
    const jsonStr = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return parsed.statement as string;
    } catch (e) {
      return `This certifies that ${name} has successfully met all requirements and demonstrated proficiency in ${courseTitle}.`;
    }
  },
);
/**
 * Helper to download an image from a URL and upload it to Supabase Storage.
 * This ensures the image is permanent and doesn't rely on external dynamic generation.
 */
async function snapshotAIImage(imageUrl: string, userId?: string): Promise<string> {
  // Fix URL structure immediately: Remove trailing slashes before ? which cause 500s or ORB
  const cleanUrl = imageUrl.replace(/\/(\?)/, "$1").trim();

  const attemptFetch = async (url: string, timeout = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return resp;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  };

  try {
    console.log(`[AI-Storage] Snapshotting: ${cleanUrl}`);

    let response = await attemptFetch(cleanUrl);

    // Retry Logic: Pollinations often needs a second kick or a small wait
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
      console.warn(
        `[AI-Storage] First attempt failed (${response.status}), retrying with delay...`,
      );
      await new Promise((r) => setTimeout(r, 4000));
      response = await attemptFetch(cleanUrl, 20000);
    }

    // Final check for valid image content
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
      throw new Error(`Invalid response content: ${response.headers.get("content-type")}`);
    }

    const buffer = await response.arrayBuffer();
    const adminDb = await getAdminDb();
    const fileName = `ai-${userId || "gen"}-${Date.now()}.jpg`;
    const filePath = `ai-gen/${fileName}`;

    const { error: uploadError } = await adminDb.storage
      .from("course-images")
      .upload(filePath, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = adminDb.storage.from("course-images").getPublicUrl(filePath);
    return publicUrl;
  } catch (err) {
    console.error("[AI-Storage] Snapshot failed permanently:", err);

    // Fallback: If AI fails, use a high-quality static placeholder from Unsplash or DiceBear
    // This is much better than returning a broken Pollinations URL
    const topics = ["education", "technology", "abstract", "nature", "business"];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    return `https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=1280&h=720`; // High-quality default
  }
}

export const generateCourseImage = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { title, description, userId } = ctx.data;
  const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const prompt = `Create a highly detailed, professional, and artistic image generation prompt for a course titled "${title}". 
    Description: ${description}
    Return a JSON object: { "imagePrompt": "..." }
    Respond ONLY with valid JSON.`;

  try {
    const content = await fetchGeminiWithUniversalFallback(
      prompt,
      apiKey,
      true,
      "image_gen",
      userId,
    );
    const jsonStr = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    // Clean prompt: Remove characters that break URLs
    const safePrompt = encodeURIComponent(parsed.imagePrompt.replace(/[^\w\s]/gi, " "));
    const seed = Math.floor(Math.random() * 1000000);

    const tempUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1280&height=720&nologo=true&seed=${seed}`;

    return await snapshotAIImage(tempUrl, userId);
  } catch (e) {
    console.error("Image Prompt Generation Error:", e);
    const safeTitle = encodeURIComponent(title.replace(/[^\w\s]/gi, " "));
    const fallbackUrl = `https://image.pollinations.ai/prompt/${safeTitle}%20modern%20educational%20cover?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

    return await snapshotAIImage(fallbackUrl, userId);
  }
});

export const generateLessonResource = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { title, content, userId } = ctx.data;
    const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const prompt = `Create a high-end, professional, and detailed study guide for a lesson titled "${title}".
    Context/Content to expand upon: ${content || "General overview of " + title}
    
    Format the output in clean, structured Markdown. 
    Requirements:
    - Use clear headings (H1, H2, H3).
    - Use bold text for key terms.
    - Use bullet points for lists.
    - Include a clear Introduction, Key Concepts, Deep Dive, and Summary section.
    - IMPORTANT: If the provided context is short, use your knowledge to provide a comprehensive and valuable guide related to the title.
    - Total length should be at least 400-600 words of high-quality educational content.
    
    Respond ONLY with the Markdown content. Do not add any conversational filler or markdown code blocks.`;

    try {
      let markdown = await fetchGeminiWithUniversalFallback(
        prompt,
        apiKey,
        false,
        "resource_gen",
        userId,
      );

      // Clean up potential markdown wrappers
      markdown = markdown
        .replace(/^```markdown\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      return markdown;
    } catch (e: any) {
      console.error("Resource Generation Error:", e);
      throw new Error(e.message || "Failed to generate resource content.");
    }
  },
);

export const generateLessonContent = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { title, moduleTitle, userId } = ctx.data;
    const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const prompt = `Generate engaging and educational lesson content for:
    Lesson: ${title}
    Part of Module: ${moduleTitle}
    
    Return a JSON object:
    {
      "title": "A more refined lesson title if needed",
      "body": "The detailed lesson text content (300-500 words).",
      "videoPlaceholder": "A short script for a video if applicable."
    }
    Respond ONLY with valid JSON.`;

    try {
      const content = await fetchGeminiWithUniversalFallback(
        prompt,
        apiKey,
        true,
        "lesson_gen",
        userId,
      );
      const jsonStr = content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Lesson Content Generation Error:", e);
      throw new Error("Failed to generate lesson content.");
    }
  },
);

import { COURSE_CATEGORIES } from "./config";

export const generateCourseMetadata = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { topic, userId } = ctx.data;
    const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const prompt = `Generate professional course metadata for: ${topic}
    
    Return a JSON object:
    {
      "title": "Optimized Course Title",
      "description": "Engaging and clear course description (2-3 sentences).",
      "category": "One of: ${COURSE_CATEGORIES.join(", ")}"
    }
    Respond ONLY with valid JSON.`;

    try {
      const content = await fetchGeminiWithUniversalFallback(
        prompt,
        apiKey,
        true,
        "metadata_gen",
        userId,
      );
      const jsonStr = content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Course Metadata Generation Error:", e);
      throw new Error("Failed to generate course metadata.");
    }
  },
);

function detectCategory(topic: string): string {
  const t = topic.toLowerCase();
  if (
    t.includes("ai") ||
    t.includes("tech") ||
    t.includes("code") ||
    t.includes("software") ||
    t.includes("dev")
  )
    return "Development";
  if (t.includes("business") || t.includes("entrepreneur")) return "Business";
  if (t.includes("design") || t.includes("art") || t.includes("ui") || t.includes("ux"))
    return "Design";
  if (t.includes("marketing") || t.includes("sale") || t.includes("social")) return "Marketing";
  if (t.includes("finance") || t.includes("money") || t.includes("invest"))
    return "Finance & Accounting";
  return "Other";
}

export async function saveGeneratedCourse(generated: AIGeneratedCourse, creatorId: string) {
  const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  // 1. Start Image Generation in parallel
  const imagePromise = apiKey
    ? (async () => {
        try {
          const imgContent = await fetchGeminiWithUniversalFallback(
            `Create a professional image prompt for a course titled "${generated.title}". Return JSON: { "imagePrompt": "..." }`,
            apiKey,
            true,
            "image_gen",
            creatorId,
          );
          const imgParsed = JSON.parse(
            imgContent
              .replace(/```json/g, "")
              .replace(/```/g, "")
              .trim(),
          );
          const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgParsed.imagePrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

          // SNAPSHOT and store in Supabase
          return await snapshotAIImage(imgUrl, creatorId);
        } catch (e) {
          const fallback = `https://image.pollinations.ai/prompt/${encodeURIComponent(generated.title + " education")}/?width=1280&height=720&nologo=true&seed=12345`;
          return await snapshotAIImage(fallback, creatorId);
        }
      })()
    : Promise.resolve(
        snapshotAIImage(
          `https://image.pollinations.ai/prompt/${encodeURIComponent(generated.title + " learning")}/?width=1280&height=720&nologo=true&seed=67890`,
          creatorId,
        ),
      );

  const courseImageUrl = await imagePromise;

  const course = await createCourseInternal(
    {
      title: generated.title,
      description: generated.description,
      price: 0,
      category: detectCategory(generated.title),
      imageUrl: courseImageUrl,
    },
    creatorId,
  );

  // 2. Parallelize Module and Lesson creation
  await Promise.all(
    generated.modules.map(async (mod, i) => {
      const module = await createModuleInternal({
        course_id: course.id,
        title: mod.title,
        order_index: i + 1,
      });

      return Promise.all(
        mod.lessons.map(async (les, j) => {
          return createLessonInternal({
            course_id: course.id,
            module_id: module.id,
            title: les.title,
            content_type: les.contentType,
            body_text: les.script || les.description,
            video_url: null,
            order_index: j + 1,
          });
        }),
      );
    }),
  );

  return course;
}

export const explainTermWithAI = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const { term, context, userId } = ctx.data;
  const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const isLongText = term.length >= 80;

  const prompt = isLongText
    ? `You are an AI Study Assistant. The user has highlighted the following passage from their lesson:
    
    --- START OF HIGHLIGHTED PASSAGE ---
    ${term}
    --- END OF HIGHLIGHTED PASSAGE ---
    
    Lesson Context: "${context || "General knowledge"}"
    
    Please write a comprehensive summary and key takeaways of the ENTIRE highlighted passage in Thai.
    Include the main concepts, bullet points of key takeaways, and a summary. 
    Ensure you cover all sections of the highlighted text (do not just explain the title or first few words).
    
    Return a JSON object with this exact format:
    {
      "term": "สรุปเนื้อหาสำคัญ",
      "explanation": "สรุปเนื้อหาทั้งหมดในภาษาไทย: \\n- ประเด็นที่ 1...\\n- ประเด็นที่ 2...",
      "category": "สรุปบทเรียน"
    }
    Respond ONLY with valid JSON. Keep the explanation detailed but concise (about 3-6 sentences/bullet points).`
    : `Explain the full highlighted phrase "${term}" within the context of: "${context || "General knowledge"}".
    The user is a learner on an LMS platform.
    
    CRITICAL INSTRUCTION: You must explain the ENTIRE phrase "${term}" as a cohesive concept. Do not just pick out one word (like "EP1" or "EP") and ignore the rest. Explain the complete meaning of the entire selection in Thai, providing any relevant English equivalent or context.
    
    Explain the concept clearly and concisely in Thai. Keep the explanation to 2-3 sentences.
    Return a JSON object matching this structure:
    {
      "term": "${term}",
      "explanation": "Detailed explanation in Thai...",
      "category": "e.g., Tech, Finance, AI, Science, Language, etc."
    }
    Respond ONLY with valid JSON.`;

  try {
    const response = await fetchGeminiWithUniversalFallback(
      prompt,
      apiKey,
      true,
      "term_explain",
      userId,
    );
    const jsonStr = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Term Explanation Error:", e);
    throw new Error("Failed to explain term.");
  }
});

export const getPersonalizedLearningPath = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { userId } = ctx.data;
    const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const adminDb = getAdminDb();

    // 1. Fetch user profile
    const { data: profile } = await adminDb.from("profiles").select("*").eq("id", userId).single();

    // 2. Fetch user's enrollments with course details
    const { data: enrollments } = await adminDb
      .from("enrollments")
      .select("*, course:courses(*)")
      .eq("user_id", userId);

    if (!enrollments || enrollments.length === 0) {
      return {
        hasData: false,
        message: "You are not enrolled in any courses yet. Browse the library to start learning!",
      };
    }

    const courseIds = enrollments.map((e: any) => e.course_id);

    // 3. Fetch lesson progress
    const { data: progress } = await adminDb
      .from("lesson_progress")
      .select("*, lesson:lessons(*)")
      .eq("user_id", userId);

    // 4. Fetch quiz attempts & quizzes in a resilient way
    const { data: quizAttempts } = await adminDb
      .from("quiz_attempts")
      .select("*")
      .eq("user_id", userId);

    const quizIds = (quizAttempts || []).map((qa: any) => qa.quiz_id);
    const { data: quizzes } =
      quizIds.length > 0
        ? await adminDb.from("quizzes").select("*, lesson:lessons(id, title)").in("id", quizIds)
        : { data: [] };

    const quizAttemptsWithDetails = (quizAttempts || []).map((qa: any) => {
      const quiz = (quizzes || []).find((q: any) => q.id === qa.quiz_id);
      return {
        ...qa,
        quiz,
      };
    });

    // 5. Fetch all lessons in these courses
    const { data: allLessons } = await adminDb
      .from("lessons")
      .select("*, module:modules(title)")
      .in("course_id", courseIds)
      .order("order_index", { ascending: true });

    // 6. Format the student profile to send to Gemini
    const studentProfile = {
      name: profile?.name || "Student",
      enrolledCourses: enrollments.map((e: any) => ({
        id: e.course.id,
        title: e.course.title,
        category: e.course.category,
        level: e.course.level,
      })),
      completedLessons: (progress || [])
        .filter((p: any) => p.completed_at)
        .map((p: any) => ({
          lessonId: p.lesson_id,
          title: p.lesson?.title,
          courseId: p.course_id,
          completedAt: p.completed_at,
          timeWatched: p.last_watched_seconds || 0,
        })),
      quizAttempts: quizAttemptsWithDetails.map((q: any) => ({
        quizTitle: q.quiz?.title,
        lessonTitle: q.quiz?.lesson?.title,
        score: q.score,
        passed: q.passed,
        completedAt: q.completed_at,
      })),
      availableLessons: (allLessons || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        courseId: l.course_id,
        contentType: l.content_type,
        orderIndex: l.order_index,
        moduleTitle: l.module?.title,
      })),
    };

    const prompt = `You are a world-class AI Personal Tutor. Analyze the following student learning data and generate a customized Personalized Learning Path.
  
  Student Data:
  ${JSON.stringify(studentProfile, null, 2)}
  
  Please perform the following:
  1. Analyze their Skill Gaps (based on quiz scores, especially failed ones, and completed vs incomplete lessons).
  2. Review their learning behavior (time spent on videos, completion rates).
  3. Recommend the Next 3 specific Lessons/Quizzes they should study, along with a reason why and a suggested difficulty adjustment.
  4. Recommend specific Areas/Topics they should review (where scores were low or time spent was short).
  5. Provide a Difficulty Recommendation (e.g. Beginner, Intermediate, Advanced) and a general motivation tip.
  6. Explain how this path is customized specifically for their data.
  
  Return a JSON object matching this structure EXACTLY (in Thai for descriptions/explanations):
  {
    "skillGapAnalysis": "คะแนนและพฤติกรรมการเรียนของคุณชี้ให้เห็นว่า...",
    "difficultyRecommendation": "Intermediate", 
    "difficultyExplanation": "คำอธิบายระดับความยากที่แนะนำ...",
    "nextLessons": [
      {
        "courseTitle": "Course Title",
        "lessonTitle": "Lesson Title",
        "lessonId": "uuid-here",
        "reason": "เหตุผลที่แนะนำบทเรียนนี้...",
        "difficulty": "Easy/Medium/Hard"
      }
    ],
    "reviewAreas": [
      {
        "topic": "ชื่อหัวข้อหรือบทเรียนที่ควรทบทวน",
        "reason": "ทำไมถึงควรทบทวน เช่น เนื่องจากได้คะแนนน้อยกว่าเกณฑ์..."
      }
    ],
    "learningPathSteps": [
      {
        "step": 1,
        "title": "ก้าวแรก: ...",
        "description": "คำอธิบายเป้าหมายก้าวนี้..."
      }
    ],
    "motivationTip": "คำคมหรือประโยคสร้างแรงบันดาลใจให้เรียนต่อ..."
  }
  Respond ONLY with valid JSON. Keep all description/explanation texts in Thai. Make sure the lessonId matches an actual id from the student's availableLessons so they can navigate directly.`;

    try {
      const response = await fetchGeminiWithUniversalFallback(
        prompt,
        apiKey,
        true,
        "learning_path",
        userId,
      );
      const jsonStr = response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return {
        hasData: true,
        data: JSON.parse(jsonStr),
      };
    } catch (e) {
      console.error("Learning Path Generation Error:", e);
      throw new Error("Failed to generate personalized learning path.");
    }
  },
);
