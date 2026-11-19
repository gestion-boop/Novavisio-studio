import type {Dispatch, SetStateAction} from 'react';
import type {StudioProject, VrMenuConfig} from './storage';
import {PreparationDialog} from './PreparationControls';
import {DEFAULT_VR_MENU, VR_BTN, VR_MAX_PER_COLUMN, VR_SHELL, availableVrActions, layoutColumns, vrActionSymbol, vrMenuOf} from './vrMenu';

/** Aperçu à l'échelle de l'interface jaune : 1 m = SCALE pixels. Même mise en page que le casque. */
const SCALE = 230;

function Preview({menu, labelOf, symbolOf}: {menu: VrMenuConfig; labelOf: (id: string) => string; symbolOf: (id: string) => string}) {
  const grid = layoutColumns(menu.left, menu.right);
  const W = VR_SHELL.w * SCALE, H = VR_SHELL.h * SCALE, B = VR_BTN * SCALE;
  const slots = [...grid.left, ...grid.right];
  return <div role="img" aria-label="Aperçu de l’interface jaune du casque" style={{
    position: 'relative', width: W, height: H, margin: '0 auto', borderRadius: 26,
    background: 'rgba(30,31,35,.92)', border: '3px solid rgba(238,180,52,.85)', boxSizing: 'border-box',
  }}>
    <div style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: '#8b8678', fontSize: 13, textAlign: 'center', width: W * .5}}>
      Zone centrale : galeries, plan, pages, photos, vidéo
    </div>
    {slots.map((slot) => slot.id === 'counter'
      ? <div key={slot.id} title={labelOf(slot.id)} style={{
          position: 'absolute', left: W / 2 + slot.x * SCALE - 0.075 * SCALE, top: H / 2 - slot.y * SCALE - 0.045 * SCALE,
          width: 0.15 * SCALE, height: 0.09 * SCALE, borderRadius: 8, background: '#25262a', border: '2px solid #d6a13d',
          color: '#fff', fontWeight: 700, fontSize: 13, display: 'grid', placeItems: 'center', boxSizing: 'border-box',
        }}>3 / 9</div>
      : <div key={slot.id} title={labelOf(slot.id)} style={{
          position: 'absolute', left: W / 2 + slot.x * SCALE - B / 2, top: H / 2 - slot.y * SCALE - B / 2,
          width: B, height: B, borderRadius: '50%', background: '#1c1d20', border: '3px solid #daa025',
          color: '#f6bb34', fontWeight: 700, fontSize: 18, display: 'grid', placeItems: 'center', boxSizing: 'border-box',
        }}>{symbolOf(slot.id)}</div>)}
  </div>;
}

/** Onglet « Vue casque » : choix des boutons et des actions de l'interface jaune, enregistrés avec la visite. */
export function VrMenuEditor({project, setProject, onClose}: {project: StudioProject; setProject: Dispatch<SetStateAction<StudioProject>>; onClose: () => void}) {
  const menu = vrMenuOf(project);
  const actions = availableVrActions(project);
  const labelOf = (id: string) => actions.find((a) => a.id === id)?.label ?? id;
  // Pictogramme d'un bouton de la barre : le même type d'icône que dans le casque (lien, information, photos…).
  const symbolOf = (id: string) => {
    if (id.startsWith('bar:')) {
      const type = project.bottomBar.find((b) => b.id === id.slice(4))?.type;
      return type === 'lien' ? '↗' : type === 'information' ? 'i' : type === 'photos' ? '▦' : type === 'plan' ? '◫' : '▣';
    }
    return vrActionSymbol(id);
  };
  const used = new Set([...menu.left, ...menu.right]);
  const free = actions.filter((a) => !used.has(a.id));
  const save = (next: VrMenuConfig) => setProject((p) => ({...p, vrMenu: next}));
  const edit = (side: 'left' | 'right', change: (list: string[]) => string[]) =>
    save({...menu, [side]: change(menu[side]).slice(0, VR_MAX_PER_COLUMN)});
  const move = (side: 'left' | 'right', index: number, delta: number) => edit(side, (list) => {
    const to = index + delta;
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    [next[index], next[to]] = [next[to], next[index]];
    return next;
  });
  const column = (side: 'left' | 'right', title: string) => <div style={{display: 'grid', gap: 6, alignContent: 'start'}}>
    <strong>{title} ({menu[side].length}/{VR_MAX_PER_COLUMN})</strong>
    {menu[side].map((id, i) => <div key={id} style={{display: 'flex', gap: 4, alignItems: 'center'}}>
      <span style={{flex: 1, fontSize: 13}}>{labelOf(id)}</span>
      <button type="button" aria-label={'Monter ' + labelOf(id)} disabled={i === 0} onClick={() => move(side, i, -1)}>↑</button>
      <button type="button" aria-label={'Descendre ' + labelOf(id)} disabled={i === menu[side].length - 1} onClick={() => move(side, i, 1)}>↓</button>
      <button type="button" aria-label={'Retirer ' + labelOf(id)} onClick={() => edit(side, (list) => list.filter((x) => x !== id))}>✕</button>
    </div>)}
    {menu[side].length < VR_MAX_PER_COLUMN && free.length > 0 && <select aria-label={'Ajouter un bouton à la colonne ' + title.toLowerCase()} value=""
      onChange={(e) => {const id = e.target.value; if (id) edit(side, (list) => [...list, id]);}}>
      <option value="">＋ Ajouter un bouton…</option>
      {free.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
    </select>}
  </div>;
  return <PreparationDialog title="Vue casque" onClose={onClose}>
    <div className="nv-preparation-content" style={{display: 'grid', gap: 14}}>
      <p className="nv-setup-note">L’aperçu ci-dessous suit la même mise en page que le casque : mêmes marges au cadre, même écart entre les boutons, colonnes centrées. Les réglages sont enregistrés avec la visite et repris à chaque ouverture dans le casque.</p>
      {project.vrEnabled !== true && <label className="toggle-row"><input type="checkbox" checked={false}
        onChange={() => setProject((p) => ({...p, vrEnabled: true}))}/> Le mode casque est désactivé pour cette visite : cocher pour l’autoriser</label>}
      <div style={{overflowX: 'auto', padding: '6px 0', flexShrink: 0, minHeight: VR_SHELL.h * SCALE + 16}}><Preview menu={menu} labelOf={labelOf} symbolOf={symbolOf}/></div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18}}>
        {column('left', 'Colonne de gauche')}
        {column('right', 'Colonne de droite')}
      </div>
      <label className="toggle-row"><input type="checkbox" checked={!!menu.autoOpen} onChange={(e) => save({...menu, autoOpen: e.target.checked})}/>
        Ouvrir l’interface jaune dès l’entrée dans le casque (sans appuyer sur A ou B)</label>
      <small className="hint-inline">Les boutons de la barre du bas (Vitrine, Photos, Informations…) apparaissent dans la liste d’ajout : ils ouvrent dans le casque la même page que dans la visite. Pour afficher le contenu d’un site, le site doit proposer un fichier vr.json.</small>
      <button type="button" className="style-reset" onClick={() => setProject((p) => ({...p, vrMenu: undefined}))}
        disabled={!project.vrMenu || JSON.stringify(project.vrMenu) === JSON.stringify(DEFAULT_VR_MENU)}>Rétablir l’interface par défaut</button>
    </div>
  </PreparationDialog>;
}
