import {barKind} from './barKind';
import {cloudListSkins} from './cloudSkins';
import {applyGlossyTheme, GLOSSY_THEMES} from './glossyThemes';
import {applySkin, listSkins, type Skin} from './skins';
import type {ClientProfile, StudioProject} from './storage';
import {DEFAULT_VR_MENU, vrMenuOf} from './vrMenu';

const normalizeText = (value?: string | null): string =>
  (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const isImmospheraText = (value?: string | null): boolean =>
  normalizeText(value).includes('immosphera');

export const isImmospheraProject = (
  project: Pick<StudioProject, 'name' | 'clientProfile'>,
  extraClient?: Pick<ClientProfile, 'name'>,
): boolean =>
  isImmospheraText(extraClient?.name)
  || isImmospheraText(project.clientProfile?.name)
  || isImmospheraText(project.name);

const isLegacyDefaultVrMenu = (cfg?: StudioProject['vrMenu']): boolean => {
  if (!cfg) return true;
  return cfg.left.join(',') === 'gallery,up,counter,down,home'
    && cfg.right.join(',') === 'sound,plan,help,exit';
};

async function findImmospheraSkin(preferredSkinId?: string): Promise<Skin | null> {
  const fromCloud = await cloudListSkins().catch(() => []);
  const fromLocal = await listSkins().catch(() => [] as Skin[]);
  const all: Skin[] = [...fromCloud, ...fromLocal];
  if (preferredSkinId) {
    const exact = all.find((s) => s.id === preferredSkinId);
    if (exact) return exact;
  }
  const cloudDefault = fromCloud.find((s) => isImmospheraText(s.name) && s.isDefault);
  if (cloudDefault) return cloudDefault;
  return all.find((s) => isImmospheraText(s.name)) ?? null;
}

/**
 * Pour tout client ou projet Immosphera :
 * - applique le skin Cloud « Immosphera » (ou le thème glossy Immosphera par défaut),
 * - active automatiquement le casque VR (`vrEnabled: true`),
 * - applique l'interface VR par défaut (boutons Panoramas / Plan / Photos / Accueil / Son / Aide / Fermer)
 *   liée dynamiquement aux photos et panoramas du projet courant.
 */
export async function applyImmospheraDefaults(
  project: StudioProject,
  preferredSkin?: Skin | null,
  options?: {replaceEmptyBar?: boolean},
): Promise<StudioProject> {
  const skin = preferredSkin ?? await findImmospheraSkin(project.clientProfile?.preferredSkinId);
  let next: StudioProject;
  if (skin) {
    const base = options?.replaceEmptyBar && project.scenes.length === 0 ? {...project, bottomBar: []} : project;
    next = applySkin(base, skin);
  } else {
    const theme = GLOSSY_THEMES.find((t) => t.id === 'immosphera') ?? GLOSSY_THEMES[0];
    next = await applyGlossyTheme(project, theme, {defaults: true});
  }
  const normalizedBar = next.bottomBar.map((item) =>
    item.type === 'information' && barKind(item) === 'photos' && !item.text.trim() && !item.url.trim()
      ? {...item, type: 'photos' as const, photos: item.photos ?? []}
      : item,
  );
  const currentMenu = next.vrMenu ? vrMenuOf({...next, bottomBar: normalizedBar}) : undefined;
  const upgradeMenu = !next.vrMenu || isLegacyDefaultVrMenu(next.vrMenu) || isLegacyDefaultVrMenu(currentMenu);
  return {
    ...next,
    bottomBar: normalizedBar,
    vrEnabled: true,
    vrMenu: upgradeMenu
      ? {...DEFAULT_VR_MENU, themed: currentMenu?.themed ?? false, autoOpen: true}
      : {...currentMenu!, autoOpen: next.vrMenu?.autoOpen ?? true},
  };
}
