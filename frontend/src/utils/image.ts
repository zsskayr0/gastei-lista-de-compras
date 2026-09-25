/** Reduz a foto no aparelho antes de enviar (lado maior = `max`), em WebP —
 * uma foto de câmera de 4 MB vira ~40 KB. Se o navegador não gerar WebP,
 * cai para JPEG com fundo branco. */
export async function resizeImage(file: File, max = 512): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Não consegui ler esta imagem. Use uma foto JPG, PNG ou WebP.');
  }
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador não consegue processar imagens.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  const webp = await toBlob('image/webp', 0.85);
  if (webp && webp.type === 'image/webp') return webp;

  // Fallback JPEG (sem transparência): pinta o fundo de branco e redesenha.
  const flat = document.createElement('canvas');
  flat.width = w;
  flat.height = h;
  const fctx = flat.getContext('2d')!;
  fctx.fillStyle = '#fff';
  fctx.fillRect(0, 0, w, h);
  fctx.drawImage(canvas, 0, 0);
  const jpeg = await new Promise<Blob | null>((resolve) => flat.toBlob(resolve, 'image/jpeg', 0.85));
  if (!jpeg) throw new Error('Não consegui converter a imagem.');
  return jpeg;
}
