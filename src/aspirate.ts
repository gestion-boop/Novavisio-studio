import {cloudConfigured, supabase} from './cloud';
import {isSafeFrameImage, uid, type MediaLinkItem} from './storage';
import type {ScrapeLike} from './aspirateMerge';

async function accessToken(): Promise<string> {
  if (!cloudConfigured) throw new Error('Le Cloud NovaStudio doit être configuré pour utiliser l’aspirateur.');
  const {data, error} = await supabase().auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Connecte-toi au Cloud NovaStudio avant de lancer l’aspirateur.');
  return data.session.access_token;
}

/** Lit le site Internet d'un établissement (accueil + pages utiles) via le serveur NovaStudio. */
export async function askAspirate(site: string, signal?: AbortSignal): Promise<ScrapeLike & {pages?: string[]}> {
  const token = await accessToken();
  const response = await fetch('/api/aspirate', {
    method: 'POST',
    headers: {'content-type': 'application/json', authorization: 'Bearer ' + token},
    body: JSON.stringify({site}), signal, cache: 'no-store',
  });
  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(raw) as Record<string, unknown>; } catch {
    throw new Error('L’aspirateur de site n’est pas disponible sur cette version de NovaStudio.');
  }
  if (!response.ok) throw new Error(String(parsed.error || 'Erreur de l’aspirateur ' + response.status));
  return parsed as unknown as ScrapeLike & {pages?: string[]};
}

const MAX_SIDE = 2000;
const MIN_SIDE = 400; // en dessous : icône, vignette ou bouton, pas une photo exploitable

async function shrink(blob: Blob): Promise<string | null> {
  const bmp = await createImageBitmap(blob);
  try {
    if (Math.max(bmp.width, bmp.height) < MIN_SIDE || Math.min(bmp.width, bmp.height) < 200) return null;
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    const x = c.getContext('2d');
    if (!x) return null;
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally { bmp.close(); }
}

const nameFromUrl = (url: string) => {
  try {
    const file = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || 'photo');
    return file.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').slice(0, 80) || 'Photo du site';
  } catch { return 'Photo du site'; }
};

export type PhotoImport = {items: MediaLinkItem[]; failed: number; tooSmall: number; skipped: number};

/**
 * Télécharge des photos trouvées sur le web (par le serveur NovaStudio), les réduit (2000 px, JPEG) et les range dans
 * la bibliothèque Photos & Vidéos de la visite. Une photo en échec n'arrête pas les autres.
 * `existingNames` : noms déjà présents (une même photo importée deux fois est ignorée).
 */
export async function importPhotosAsMedia(
  urls: string[],
  options: {existingNames?: string[]; room?: number; onProgress?: (done: number, total: number) => void; signal?: AbortSignal} = {},
): Promise<PhotoImport> {
  const token = await accessToken();
  const room = Math.max(0, options.room ?? 300);
  const known = new Set((options.existingNames ?? []).map((n) => n.toLowerCase()));
  const result: PhotoImport = {items: [], failed: 0, tooSmall: 0, skipped: 0};
  const queue = urls.filter((u) => /^https:\/\//i.test(u)).slice(0, 60);
  let done = 0;
  const work = async (url: string) => {
    try {
      const name = nameFromUrl(url);
      if (known.has(name.toLowerCase())) { result.skipped++; return; }
      const response = await fetch('/api/novagen-image?url=' + encodeURIComponent(url), {
        headers: {authorization: 'Bearer ' + token}, signal: options.signal, cache: 'no-store',
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await shrink(await response.blob());
      if (!data) { result.tooSmall++; return; }
      if (!isSafeFrameImage(data) || data.length > 12_000_000) throw new Error('image refusée');
      if (result.items.length >= room) { result.skipped++; return; }
      known.add(name.toLowerCase());
      result.items.push({id: uid(), kind: 'photo', name, url: '', provider: 'local', data});
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw e;
      result.failed++;
    } finally {
      done++; options.onProgress?.(done, queue.length);
    }
  };
  // Trois téléchargements à la fois : assez vite sans saturer le serveur.
  let cursor = 0;
  const runner = async () => { while (cursor < queue.length) await work(queue[cursor++]); };
  await Promise.all([runner(), runner(), runner()]);
  return result;
}
