/**
 * Converts an image File to a WebP Blob, resized to max 600px wide.
 * Uses createImageBitmap + canvas — no external dependencies.
 */
export async function convertToWebP(file: File, maxWidth = 600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error("WebP conversion failed"))),
      "image/webp",
      quality,
    );
  });
}
