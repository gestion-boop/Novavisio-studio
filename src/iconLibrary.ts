import {supabase} from './cloud';
import type {CustomIcon} from './storage';

/**
 * Bibliothèque générale d'icônes (table nvstudio_icon_library).
 * Une icône = trois lignes (normal, hover, pressed) partageant le même set_key.
 * Lecture : tout compte connecté. Écriture : administrateurs globaux (règle en base).
 */
export type LibraryState = 'normal' | 'hover' | 'pressed';
const STATE_OF: Record<string, LibraryState> = {'Normal': 'normal', 'Survol': 'hover', 'Pressé': 'pressed'};
const LABEL_OF: Record<LibraryState, string> = {normal: 'Normal', hover: 'Survol', pressed: 'Pressé'};
const BATCH = 12;

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Publie un pack (items nommés « libellé · Normal », « libellé · Survol », « libellé · Pressé ») dans la bibliothèque générale. */
export async function publishPack(items: CustomIcon[], shape: string, paletteKey: string, setName: string): Promise<number> {
  const rows: Array<Record<string, string>> = [];
  for (const it of items) {
    const cut = it.name.lastIndexOf(' · ');
    if (cut < 0) continue;
    const base = it.name.slice(0, cut);
    const state = STATE_OF[it.name.slice(cut + 3)];
    if (!state) continue;
    rows.push({
      set_key: `${slug(base)}-${shape}-${paletteKey}`,
      set_name: base,
      state,
      shape,
      name: `${base} · ${LABEL_OF[state]}`,
      png_data: it.dataUrl,
      pack_name: setName,
    });
  }
  for (let i = 0; i < rows.length; i += BATCH) {
    const {error} = await supabase().from('nvstudio_icon_library').upsert(rows.slice(i, i + BATCH), {onConflict: 'set_key,state'});
    if (error) throw new Error(error.message);
  }
  return rows.length;
}

export type LibrarySet = {setKey: string; setName: string; icons: CustomIcon[]};

/** Lit la bibliothèque et regroupe les trois états de chaque icône. */
export async function listLibrarySets(): Promise<LibrarySet[]> {
  const {data, error} = await supabase().from('nvstudio_icon_library').select('set_key,set_name,state,name,png_data').order('set_name', {ascending: true});
  if (error) throw new Error(error.message);
  const map = new Map<string, LibrarySet>();
  for (const r of (data ?? []) as Array<{set_key: string; set_name: string; state: LibraryState; name: string; png_data: string}>) {
    let set = map.get(r.set_key);
    if (!set) { set = {setKey: r.set_key, setName: r.set_name, icons: []}; map.set(r.set_key, set); }
    set.icons.push({id: r.set_key + '-' + r.state, name: r.name, dataUrl: r.png_data});
  }
  return [...map.values()].map(s => ({...s, icons: s.icons.sort((a, b) => a.name.localeCompare(b.name))}));
}

/** Copie une icône de la bibliothèque dans un projet : nouveaux identifiants, donc les visites restent indépendantes. */
export function copyToProject(set: LibrarySet): CustomIcon[] {
  return set.icons.map(i => ({...i, id: crypto.randomUUID()}));
}
