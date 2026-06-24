import { supabase } from "./supabase";

/**
 * Detects the real MIME type of a file based on its magic numbers (first few bytes).
 * This prevents users from renaming files (e.g., test.pdf -> test.mp4) to bypass validation.
 */
async function getRealMimeType(file: File): Promise<string> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const header = new Uint8Array(buffer);
  const hex = Array.from(header)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  // 1. Images
  if (hex.startsWith("89504E47")) return "image/png";
  if (hex.startsWith("FFD8FF")) return "image/jpeg";
  if (hex.startsWith("47494638")) return "image/gif";
  if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250") return "image/webp"; // RIFF....WEBP

  // 2. Documents
  if (hex.startsWith("25504446")) return "application/pdf";

  // 3. Videos (Simplified checks for common containers)
  // MP4 usually starts with 00 00 00 .. 66 74 79 70 (ftyp)
  if (hex.substring(8, 24) === "66747970") return "video/mp4";
  // Quicktime (MOV)
  if (hex.substring(8, 24) === "6D6F6F76") return "video/quicktime";
  // WebM / Matroska
  if (hex.startsWith("1A45DFA3")) return "video/webm";

  // Fallback to browser's detected type if we don't recognize the signature
  return file.type.split(";")[0].toLowerCase().trim();
}

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param bucket - The name of the storage bucket (e.g., 'course-images', 'profile-pictures')
 * @param path - The desired path/name for the file
 * @param file - The File object to upload
 */
export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  // Security: Detect REAL MIME type via Magic Numbers (LL-075)
  const realType = await getRealMimeType(file);
  const browserType = file.type.split(";")[0].toLowerCase().trim();

  // If browser says it's media but magic numbers say it's PDF, reject it.
  if (browserType.startsWith("video/") || browserType.startsWith("image/")) {
    if (realType === "application/pdf") {
      throw new Error("Security Alert: File content mismatch. PDF disguised as media detected.");
    }
  }

  // Ensure we send a clean mime type
  const cleanType = realType || browserType;

  // Security: Restrict allowed file types to prevent HTML/executable uploads
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "text/markdown",
    "text/plain",
    "text/html",
  ];

  if (!allowedMimeTypes.includes(cleanType)) {
    throw new Error(
      `Upload failed: Invalid file content type ${cleanType}. Only images, PDFs, videos, and text files are allowed.`,
    );
  }

  // Security: Restrict file size
  // 50MB max for all files (Videos, PDFs, Slides, etc.)
  const maxSize = 50 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      `Upload failed: File size exceeds 50MB limit. Current size: ${(
        file.size /
        (1024 * 1024)
      ).toFixed(2)}MB`,
    );
  }

  console.log(`Attempting upload to bucket: "${bucket}", path: "${path}"...`);

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: cleanType,
  });

  if (error) {
    console.error("Supabase Storage Error Details:", error);
    throw new Error(`Upload failed: ${error.message} (Bucket: ${bucket})`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);
  console.log("Upload successful, public URL:", publicUrl);
  return publicUrl;
}

/**
 * Specifically upload a lesson resource (PDF, Slides, etc.)
 */
export async function uploadLessonResource(courseId: string, file: File): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `resource-${Date.now()}.${fileExt}`;
  const path = `${courseId}/${fileName}`;
  // We'll use 'course-resources' bucket for non-image files
  return uploadFile("course-resources", path, file);
}

/**
 * Specifically upload a course thumbnail image
 */
export async function uploadCourseImage(courseId: string, file: File): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const path = `${courseId}/thumbnail-${Date.now()}.${fileExt}`;
  return uploadFile("course-images", path, file);
}

/**
 * Specifically upload a lesson video
 */
export async function uploadLessonVideo(
  courseId: string,
  lessonId: string,
  file: File,
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const path = `${courseId}/${lessonId}/video-${Date.now()}.${fileExt}`;
  return uploadFile("course-videos", path, file);
}

/**
 * Specifically upload a course promo video
 */
export async function uploadCoursePromoVideo(courseId: string, file: File): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const path = `${courseId}/promo-${Date.now()}.${fileExt}`;
  return uploadFile("course-videos-preview", path, file);
}

/**
 * Specifically upload a profile picture
 */
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const path = `${userId}/avatar-${Date.now()}.${fileExt}`;
  return uploadFile("profile-pictures", path, file);
}

/**
 * Generates a Signed URL for downloading/viewing a file from a private bucket.
 * @param bucket - The name of the storage bucket
 * @param path - The path to the file
 * @param expiresIn - Expiration time in seconds (default 1 hour)
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Error creating signed URL:", error);
    throw error;
  }

  return data.signedUrl;
}

/**
 * Generates a Signed URL for direct upload from the browser to Supabase Storage.
 * This is much more efficient for large files like videos.
 * @param bucket - The name of the storage bucket
 * @param path - The destination path
 * @returns Object containing signedUrl and token
 */
export async function getSignedUploadUrl(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);

  if (error) {
    console.error("Error creating signed upload URL:", error);
    throw error;
  }

  return data; // Returns { signedUrl: string, token: string, path: string }
}

/**
 * Helper to extract bucket and path from a Supabase Storage URL
 * Example: https://.../storage/v1/object/public/course-videos/courseId/lessonId/video.mp4
 */
export function parseStorageUrl(url: string) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/storage/v1/object/public/");
    if (parts.length < 2) return null;

    const pathParts = parts[1].split("/");
    const bucket = pathParts[0];
    const path = pathParts.slice(1).join("/");

    return { bucket, path };
  } catch (e) {
    return null;
  }
}
