/**
 * Shared validation rules for the AI Spark Learn 99 project.
 * Ensures consistency between client-side and server-side checks.
 */

/**
 * Validates a course title.
 * Allows Thai characters, alphanumeric, spaces, and basic punctuation.
 * Disallows emojis and script tags (<, >).
 */
export function validateCourseTitle(title: string): string | null {
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length < 5) {
    return "Course title must be at least 5 characters long.";
  }
  if (cleanTitle.length > 120) {
    return "Course title is too long (max 120 characters).";
  }

  // Thai range: \u0E00-\u0E7F
  // Allow almost all standard symbols common in titles, but block < and > for XSS safety
  const titleRegex = /^[\u0E00-\u0E7F\w\s\-,.!?'()&:"/\\+@#%^*;=[\]{}]+$/;
  if (!titleRegex.test(cleanTitle)) {
    return "Course title contains invalid characters (like emojis). Please use only letters, numbers, and standard punctuation.";
  }

  if (/[<>]/.test(cleanTitle)) {
    return "Course title contains invalid characters (< or >).";
  }

  return null;
}

/**
 * Validates a course price.
 */
export function validateCoursePrice(price: number): string | null {
  if (isNaN(price) || price < 0) {
    return "Price must be a valid positive number or 0.";
  }
  if (price > 9999999) {
    return "Price is too high.";
  }
  return null;
}

/**
 * Validates a URL and ensures it points to a valid image or video platform.
 */
export function validateMediaUrl(url: string, type: "image" | "video"): string | null {
  if (!url) return null; // Optional

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();

    if (type === "image") {
      const isImage =
        /\.(jpeg|jpg|gif|png|webp|svg|bmp)/i.test(path) ||
        url.includes("pollinations.ai") ||
        url.includes("unsplash.com") ||
        url.includes("supabase.co") ||
        url.includes("supabase.in") ||
        url.includes("brave.com") ||
        url.includes("cloudinary.com") ||
        url.includes("fiverr") ||
        url.includes("google");

      if (!isImage) return "URL must point to a valid image file.";
    } else {
      const isDirectVideo = /\.(mp4|webm|ogg|mov|m4v)$/i.test(path);
      const isPlatformVideo =
        urlObj.hostname.includes("youtube.com") ||
        urlObj.hostname.includes("youtu.be") ||
        urlObj.hostname.includes("vimeo.com") ||
        urlObj.hostname.includes("cloudinary.com") ||
        url.includes("supabase.co") ||
        url.includes("supabase.in");

      if (!isDirectVideo && !isPlatformVideo) {
        return "URL must point to a valid video platform (YouTube, Vimeo) or a direct video file.";
      }
    }
  } catch (e) {
    return "Invalid URL format.";
  }

  return null;
}

/**
 * Validates a media file on the client side by trying to load it.
 * This is the ultimate check for corrupted or mismatched files.
 */
export async function validateMediaFile(file: File, type: "video" | "img"): Promise<boolean> {
  if (typeof window === "undefined") return true;

  // 1. Magic Number Validation (Detect PDF renamed to Video/Image)
  try {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const header = new Uint8Array(buffer);
    const hex = Array.from(header)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    // PDF Magic Number: %PDF (25 50 44 46)
    if (hex === "25504446") {
      console.warn("Security Alert: PDF file disguised as media detected.");
      return false;
    }
  } catch (e) {
    console.error("Magic number check failed:", e);
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(type);

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(false);
    }, 8000);

    const cleanup = (result: boolean) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(result);
    };

    if (type === "img") {
      (media as HTMLImageElement).onload = () => cleanup(true);
    } else {
      (media as HTMLVideoElement).onloadedmetadata = () => cleanup(true);
      (media as HTMLVideoElement).oncanplay = () => cleanup(true);
      (media as HTMLVideoElement).load();
    }

    media.onerror = () => cleanup(false);
    media.src = url;
  });
}
