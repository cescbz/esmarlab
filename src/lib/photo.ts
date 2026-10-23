export const MAX_PHOTO_BYTES = 300 * 1024;

export function photoByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return 0;
  const base64 = dataUrl.slice(comma + 1);
  try {
    return Buffer.from(base64, "base64").byteLength;
  } catch {
    return 0;
  }
}

export function isValidPhotoDataUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^data:image\/(jpeg|png);base64,/.test(value)) return false;
  const bytes = photoByteLength(value);
  return bytes > 0 && bytes <= MAX_PHOTO_BYTES;
}
