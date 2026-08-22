import { supabase } from "@/integrations/supabase/client";

export const TEAM_BUCKET = "team-images";

/** Resize + compress an image in the browser before upload. */
export async function compressImage(file: File, max = 800, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const type = "image/webp";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), type, quality),
  );
  return blob ?? file;
}

/** Upload a team avatar, returning the storage path to persist in image_url. */
export async function uploadTeamImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const path = `members/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(TEAM_BUCKET)
    .upload(path, blob, { contentType: "image/webp", upsert: true });
  if (error) throw error;
  return path;
}

export async function deleteTeamImage(path: string) {
  if (!path || /^https?:\/\//.test(path)) return;
  await supabase.storage.from(TEAM_BUCKET).remove([path]);
}

const signedCache = new Map<string, string>();

/** Resolve a stored image reference (path or absolute URL) to a viewable URL. */
export async function resolveTeamImageUrl(ref?: string | null): Promise<string | null> {
  if (!ref) return null;
  if (/^https?:\/\//.test(ref) || ref.startsWith("data:")) return ref;
  const cached = signedCache.get(ref);
  if (cached) return cached;
  const { data } = await supabase.storage.from(TEAM_BUCKET).createSignedUrl(ref, 60 * 60 * 24 * 7);
  if (data?.signedUrl) {
    signedCache.set(ref, data.signedUrl);
    return data.signedUrl;
  }
  return null;
}
