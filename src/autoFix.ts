import type {Hotspot, StudioProject} from './storage';

/**
 * Corrections automatiques sûres avant publication. Ne supprime jamais une photo, une vidéo, un lien ou un texte saisi.
 *  1. Retire les flèches en double (même destination dans un même panorama : la première est gardée).
 *  2. Retire les flèches qui ne mènent à aucun panorama visible (le contrôle les signale déjà).
 *  3. Vide la destination des boutons de la barre qui pointent vers un panorama inexistant.
 *  4. Crée des flèches vers le panorama suivant et le précédent pour les panoramas qui n'en ont aucune.
 *     Ces flèches sont placées dans une direction par défaut : il faut les déplacer ensuite.
 */
export type AutoFixResult = {project: StudioProject; changes: string[]};

export function autoFixProject(project: StudioProject, options: {arrows?: boolean} = {}): AutoFixResult {
  const changes: string[] = [];
  const visible = project.scenes.filter((s) => !s.excluded);
  const exists = new Set(project.scenes.map((s) => s.id));
  const visibleIds = new Set(visible.map((s) => s.id));
  const nameOf = (id: string) => project.scenes.find((s) => s.id === id)?.name || 'panorama';

  const scenes = project.scenes.map((scene) => {
    const seen = new Set<string>();
    const hotspots = scene.hotspots.filter((h) => {
      if (h.type !== 'navigation') return true;
      if (!h.target || !visibleIds.has(h.target) || !exists.has(h.target)) {
        changes.push(`${scene.name} : flèche sans destination supprimée`);
        return false;
      }
      if (seen.has(h.target)) {
        changes.push(`${scene.name} : flèche en double vers « ${nameOf(h.target)} » supprimée`);
        return false;
      }
      seen.add(h.target);
      return true;
    });
    return {...scene, hotspots};
  });

  const bottomBar = project.bottomBar.map((item) => {
    if (item.type === 'navigation' && item.target && !exists.has(item.target)) {
      changes.push(`Barre du bas · « ${item.title || 'bouton'} » : destination inexistante effacée`);
      return {...item, target: ''};
    }
    return item;
  });

  let result: StudioProject = {...project, scenes, bottomBar};

  if (options.arrows !== false) {
    const order = visible.map((s) => s.id);
    result = {
      ...result,
      scenes: result.scenes.map((scene) => {
        if (scene.excluded || scene.hotspots.some((h) => h.type === 'navigation')) return scene;
        const i = order.indexOf(scene.id);
        if (i < 0) return scene;
        const targets: Array<{id: string; yaw: number; label: string}> = [];
        if (i < order.length - 1) targets.push({id: order[i + 1], yaw: 0, label: 'suivant'});
        if (i > 0) targets.push({id: order[i - 1], yaw: Math.PI, label: 'précédent'});
        const created: Hotspot[] = targets.map((t) => ({
          id: crypto.randomUUID(),
          type: 'navigation',
          title: `Aller vers ${nameOf(t.id)} (à placer)`,
          text: '',
          target: t.id,
          yaw: t.yaw,
          pitch: -0.1,
          arrivalYaw: 0,
          arrivalPitch: 0,
        }));
        if (created.length) {
          changes.push(`${scene.name} : ${created.length} flèche(s) créée(s) vers les panoramas voisins (à déplacer)`);
        }
        return {...scene, hotspots: [...scene.hotspots, ...created]};
      }),
    };
  }

  return {project: result, changes};
}
