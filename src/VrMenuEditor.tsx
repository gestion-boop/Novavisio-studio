import {useEffect, useMemo, useState, type CSSProperties, type Dispatch, type DragEvent, type ReactNode, type SetStateAction} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown, ChevronUp, ExternalLink, Eye, HelpCircle, Home, Images, Info, LayoutGrid, Map as MapIcon, Pencil, Play, RotateCcw, Trash2, Volume2, VolumeX, X} from 'lucide-react';
import {getFloorPlans, plansByLevel, planLevelLabel, type BottomBarItem, type StudioProject} from './storage';
import {DEFAULT_VR_MENU, VR_BTN, VR_GAP, VR_MAX_PER_COLUMN, VR_SHELL, availableVrActions, layoutColumns, vrMenuOf, type VrSlot} from './vrMenu';
import {resolveLink} from './mediaLinks';
import './vrMenuEditor.css';

type Side = 'left' | 'right';
type SlotRef = {side: Side; row: number};
type Panel = {kind: 'gallery'} | {kind: 'plan'} | {kind: 'help'} | {kind: 'bar'; item: BottomBarItem} | null;

const pct = (v: number, total: number) => (v / total) * 100 + '%';
const DND = 'application/x-nv-vr';

/** Pictogramme d'une action : même famille de symboles que le casque. */
function ActionIcon({id, project, sound = true, size = 22}: {id: string; project: StudioProject; sound?: boolean; size?: number}) {
  if (id.startsWith('bar:')) {
    const barItem = project.bottomBar.find((b) => b.id === id.slice(4));
    const type = barItem?.type;
    const custom = project.icons?.find((i) => i.id === barItem?.iconId)?.dataUrl;
    if (custom && type === 'lien') return <img className="nv-vrx-icon-img" src={custom} alt="" style={{width: size + 8, height: size + 8}}/>;
    const I = type === 'lien' ? ExternalLink : type === 'information' ? Info : type === 'photos' ? Images : type === 'plan' ? MapIcon : LayoutGrid;
    return <I size={size} strokeWidth={2.2}/>;
  }
  switch (id) {
    case 'gallery': return <LayoutGrid size={size} strokeWidth={2.2}/>;
    case 'up': return <ChevronUp size={size + 4} strokeWidth={2.6}/>;
    case 'down': return <ChevronDown size={size + 4} strokeWidth={2.6}/>;
    case 'home': return <Home size={size} strokeWidth={2.2}/>;
    case 'sound': return sound ? <Volume2 size={size} strokeWidth={2.2}/> : <VolumeX size={size} strokeWidth={2.2}/>;
    case 'plan': return <MapIcon size={size} strokeWidth={2.2}/>;
    case 'help': return <HelpCircle size={size} strokeWidth={2.2}/>;
    case 'exit': return <X size={size} strokeWidth={2.6}/>;
    default: return <span>●</span>;
  }
}

/** Description courte de ce que fait l'action dans le casque. */
function actionHint(id: string, project: StudioProject): string {
  if (id.startsWith('bar:')) {
    const item = project.bottomBar.find((b) => b.id === id.slice(4));
    switch (item?.type) {
      case 'photos': return 'Ouvre la galerie photos de ce bouton au centre.';
      case 'information': return 'Affiche le texte d’information au centre.';
      case 'lien': return 'Ouvre la page liée (si le site propose un vr.json).';
      case 'plan': return 'Affiche le plan au centre.';
      case 'gallery': return 'Affiche les panoramas de ce bouton au centre.';
      default: return 'Même action que le bouton de la barre du bas.';
    }
  }
  switch (id) {
    case 'gallery': return 'Affiche tous les panoramas au centre pour en choisir un.';
    case 'up': return 'Passe au panorama précédent.';
    case 'counter': return 'Indique la position : panorama n sur N.';
    case 'down': return 'Passe au panorama suivant.';
    case 'home': return 'Revient au premier panorama.';
    case 'sound': return 'Active ou coupe la musique.';
    case 'plan': return 'Affiche le plan au centre.';
    case 'help': return 'Rappelle les commandes des manettes.';
    case 'exit': return 'Referme l’interface jaune (A ou B pour la rouvrir).';
    default: return '';
  }
}

/** Interface du casque : éditeur plein écran (glisser-déposer sur deux colonnes alignées) + simulation. */
export function VrMenuEditor({project, setProject, onClose}: {project: StudioProject; setProject: Dispatch<SetStateAction<StudioProject>>; onClose: () => void}) {
  const menu = vrMenuOf(project);
  const actions = availableVrActions(project);
  const labelOf = (id: string) => actions.find((a) => a.id === id)?.label ?? id;
  const [mode, setMode] = useState<'edit' | 'sim'>('edit');
  const [selected, setSelected] = useState<SlotRef | null>(null);
  const [dragOver, setDragOver] = useState<string>('');

  useEffect(() => {
    const key = (e: KeyboardEvent) => {if (e.key === 'Escape') {e.stopPropagation(); if (selected) setSelected(null); else onClose();}};
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [selected, onClose]);

  // --- Modèle : deux colonnes de 6 cases (cases vides = alignement des lignes).
  const cols = useMemo(() => {
    const pad = (l: string[]) => Array.from({length: VR_MAX_PER_COLUMN}, (_, i) => l[i] ?? VR_GAP);
    return {left: pad(menu.left), right: pad(menu.right)};
  }, [menu.left, menu.right]);
  const commit = (next: {left: string[]; right: string[]}) => {
    const trim = (l: string[]) => {const out = [...l]; while (out.length && !out[out.length - 1]) out.pop(); return out;};
    setProject((p) => ({...p, vrMenu: {left: trim(next.left), right: trim(next.right), autoOpen: !!menu.autoOpen, themed: !!menu.themed}}));
  };
  const clone = () => ({left: [...cols.left], right: [...cols.right]});
  const findSlot = (id: string): SlotRef | null => {
    for (const side of ['left', 'right'] as const) {const row = cols[side].indexOf(id); if (row >= 0) return {side, row};}
    return null;
  };
  const place = (id: string, to: SlotRef) => {
    const next = clone();
    const from = findSlot(id);
    const occupant = next[to.side][to.row];
    if (from) next[from.side][from.row] = occupant; // échange si on déplace un bouton existant
    next[to.side][to.row] = id;
    commit(next);
    setSelected(to);
  };
  const removeAt = (at: SlotRef) => {const next = clone(); next[at.side][at.row] = VR_GAP; commit(next); setSelected(null);};

  const used = new Set([...cols.left, ...cols.right].filter(Boolean));
  const free = actions.filter((a) => !used.has(a.id));

  // --- Glisser-déposer
  const onDragStart = (e: DragEvent, id: string) => {e.dataTransfer.setData(DND, id); e.dataTransfer.effectAllowed = 'move';};
  const dropOn = (to: SlotRef) => ({
    onDragOver: (e: DragEvent) => {if (e.dataTransfer.types.includes(DND)) {e.preventDefault(); setDragOver(to.side + to.row);}},
    onDragLeave: () => setDragOver((k) => (k === to.side + to.row ? '' : k)),
    onDrop: (e: DragEvent) => {e.preventDefault(); setDragOver(''); const id = e.dataTransfer.getData(DND); if (id) place(id, to);},
  });
  const paletteDrop = {
    onDragOver: (e: DragEvent) => {if (e.dataTransfer.types.includes(DND)) {e.preventDefault(); setDragOver('palette');}},
    onDragLeave: () => setDragOver((k) => (k === 'palette' ? '' : k)),
    onDrop: (e: DragEvent) => {e.preventDefault(); setDragOver(''); const at = findSlot(e.dataTransfer.getData(DND)); if (at) removeAt(at);},
  };

  // --- Géométrie : la même que le casque (mètres → pourcentages du cadre).
  const W = VR_SHELL.w, H = VR_SHELL.h;
  const editGrid = layoutColumns(Array(VR_MAX_PER_COLUMN).fill('x'), Array(VR_MAX_PER_COLUMN).fill('x'));
  const posStyle = (s: Pick<VrSlot, 'x' | 'y'>, wide = false) => {
    const bw = wide ? 0.15 : VR_BTN, bh = wide ? 0.09 : VR_BTN;
    return {left: pct(W / 2 + s.x - bw / 2, W), top: pct(H / 2 - s.y - bh / 2, H), width: pct(bw, W), height: pct(bh, H)};
  };

  // --- Simulation
  const scenes = project.scenes.filter((s) => !s.excluded);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);
  const [flash, setFlash] = useState('');
  const plans = plansByLevel(getFloorPlans(project).filter((p) => !!p.imageDataUrl));
  const [planIdx, setPlanIdx] = useState(0);
  const plan = plans[Math.min(planIdx, Math.max(0, plans.length - 1))];
  const runSim = (id: string) => {
    setFlash(id); window.setTimeout(() => setFlash((f) => (f === id ? '' : f)), 260);
    switch (id) {
      case 'gallery': setPanel((p) => (p?.kind === 'gallery' ? null : {kind: 'gallery'})); return;
      case 'up': setSceneIdx((i) => Math.max(0, i - 1)); setPanel(null); return;
      case 'down': setSceneIdx((i) => Math.min(scenes.length - 1, i + 1)); setPanel(null); return;
      case 'home': setSceneIdx(0); setPanel(null); return;
      case 'sound': setSoundOn((s) => !s); return;
      case 'plan': setPanel((p) => (p?.kind === 'plan' ? null : {kind: 'plan'})); return;
      case 'help': setPanel((p) => (p?.kind === 'help' ? null : {kind: 'help'})); return;
      case 'exit': setPanel(null); setMenuOpen(false); return;
    }
    if (id.startsWith('bar:')) {
      const item = project.bottomBar.find((b) => b.id === id.slice(4));
      if (item) setPanel((p) => (p?.kind === 'bar' && p.item.id === item.id ? null : {kind: 'bar', item}));
    }
  };
  const simGrid = layoutColumns(menu.left, menu.right);
  const current = scenes[Math.min(sceneIdx, Math.max(0, scenes.length - 1))];

  const centerContent = (): ReactNode => {
    if (!panel) return null;
    if (panel.kind === 'gallery' || (panel.kind === 'bar' && panel.item.type === 'gallery')) {
      return <div className="nv-vrx-panel"><strong>Panoramas</strong><div className="nv-vrx-thumbs">
        {scenes.map((sc, i) => <button type="button" key={sc.id} className={i === sceneIdx ? 'is-on' : ''} onClick={() => {setSceneIdx(i); setPanel(null);}}>
          <img src={sc.dataUrl} alt=""/><span>{sc.name}</span></button>)}
      </div></div>;
    }
    if (panel.kind === 'plan' || (panel.kind === 'bar' && panel.item.type === 'plan')) {
      return <div className="nv-vrx-panel"><strong>{plan?.name || 'Plan'}</strong>
        {plan ? <div className="nv-vrx-plan-row">
          {plans.length > 1 && <div className="nv-vrx-levels" aria-label="Étages">
            <span className="nv-vrx-stairs" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20v-4h4v-4h4V8h4V4h6"/></svg></span>
            {plans.map((p, i) => <button type="button" key={p.id ?? i} className={plans[Math.min(planIdx, plans.length - 1)] === p ? 'is-on' : ''} title={p.name} onClick={() => setPlanIdx(i)}>{planLevelLabel(p, i)}</button>)}
          </div>}
          <img className="nv-vrx-plan" src={plan.imageDataUrl} alt="Plan"/></div> : <p>Aucun plan dans cette visite.</p>}</div>;
    }
    if (panel.kind === 'help') {
      return <div className="nv-vrx-panel"><strong>Navigation VR</strong>
        <p>Droite : laser et gâchette. Gauche : joystick et gâchette. A/B ou X/Y : ouvrir / fermer le menu. Clic joystick : tout masquer.</p></div>;
    }
    const item = panel.item;
    if (item.type === 'photos') {
      const photos = (item.photos ?? []).map((m) => ({m, r: resolveLink(m)}));
      return <div className="nv-vrx-panel"><strong>{item.title || 'Photos'}</strong>
        {photos.length ? <div className="nv-vrx-thumbs">{photos.map(({m, r}) => <span key={m.id} className="nv-vrx-photo">{r.thumb ?? r.image ? <img src={r.thumb ?? r.image} alt="" referrerPolicy="no-referrer"/> : '▶'}</span>)}</div>
          : <p>Aucune photo dans ce bouton.</p>}</div>;
    }
    if (item.type === 'information') return <div className="nv-vrx-panel"><strong>{item.title || 'Information'}</strong><p>{item.text || 'Aucun texte.'}</p></div>;
    if (item.type === 'lien') return <div className="nv-vrx-panel"><strong>{item.title || 'Lien'}</strong><p>Page ouverte dans le casque :<br/><code>{item.url || '—'}</code></p></div>;
    return <div className="nv-vrx-panel"><strong>{item.title}</strong><p>{actionHint('bar:' + item.id, project)}</p></div>;
  };

  const selectedId = selected ? cols[selected.side][selected.row] : '';
  const alignedRows = Math.max(menu.left.length, menu.right.length);
  const balanced = menu.left.filter(Boolean).length === menu.right.filter(Boolean).length;

  const shell = mode === 'edit'
    ? <div className="nv-vrx-shell" role="group" aria-label="Interface jaune : deux colonnes de 6 cases">
        <div className="nv-vrx-center-hint">Zone centrale<br/><small>galeries, plan, pages, photos, vidéo</small></div>
        {(['left', 'right'] as const).map((side) => editGrid[side].map((slot) => {
          const id = cols[side][slot.row];
          const ref = {side, row: slot.row};
          const isSel = selected?.side === side && selected.row === slot.row;
          const key = side + slot.row;
          return <div key={key} className={'nv-vrx-slot' + (id ? ' is-full' : '') + (isSel ? ' is-selected' : '') + (dragOver === key ? ' is-over' : '') + (id === 'counter' ? ' is-counter' : '')}
            style={posStyle(slot, id === 'counter')} {...dropOn(ref)}
            onClick={() => setSelected(isSel ? null : ref)} title={id ? labelOf(id) : 'Case vide : glisse un bouton ici ou clique pour en choisir un'}>
            {id ? <span className="nv-vrx-btn" draggable onDragStart={(e) => onDragStart(e, id)}>
              {id === 'counter' ? '3 / 9' : <ActionIcon id={id} project={project}/>}</span> : <span className="nv-vrx-plus">+</span>}
            <span className="nv-vrx-row">{slot.row + 1}</span>
          </div>;
        }))}
      </div>
    : <div className="nv-vrx-sim" style={current ? {backgroundImage: `url("${current.dataUrl}")`} : undefined}>
        {menuOpen ? <div className="nv-vrx-shell is-sim" role="group" aria-label="Simulation de l’interface du casque">
          <div className="nv-vrx-center">{centerContent() ?? <div className="nv-vrx-center-hint is-sim">{current?.name ?? 'Aucun panorama'}<br/><small>Clique sur les boutons comme avec la manette</small></div>}</div>
          {[...simGrid.left, ...simGrid.right].map((slot) => slot.id === 'counter'
            ? <div key={slot.id} className="nv-vrx-slot is-full is-counter is-sim" style={posStyle(slot, true)}><span className="nv-vrx-btn">{(scenes.length ? sceneIdx + 1 : 0) + ' / ' + scenes.length}</span></div>
            : <button type="button" key={slot.id} className={'nv-vrx-slot is-full is-sim' + (flash === slot.id ? ' is-flash' : '')} style={posStyle(slot)} title={labelOf(slot.id)} onClick={() => runSim(slot.id)}>
                <span className="nv-vrx-btn"><ActionIcon id={slot.id} project={project} sound={soundOn}/></span></button>)}
        </div> : <button type="button" className="nv-vrx-reopen" onClick={() => setMenuOpen(true)}>Menu fermé · clique ici (bouton A ou B dans le casque) pour le rouvrir</button>}
      </div>;

  const bs = project.barStyle;
  const hex = (c?: string) => !!c && /^#[0-9a-f]{6}$/i.test(c);
  const themedOk = !!menu.themed && hex(bs.button) && hex(bs.icon);
  const themeVars = (themedOk ? {
    '--vr-btn': bs.button, '--vr-accent': bs.icon, '--vr-label-bg': bs.button, '--vr-label-ink': bs.icon,
    ...(hex(bs.background) ? {'--vr-shell': bs.background + 'e6'} : {}), ...(hex(bs.outline) ? {'--vr-line': bs.outline} : {}),
  } : {}) as CSSProperties;
  return createPortal(<div className="nv-vrx" style={themeVars} role="dialog" aria-modal="true" aria-label="Interface du casque">
    <header className="nv-vrx-top">
      <div className="nv-vrx-title"><small>Casque VR</small><strong>Interface du casque</strong></div>
      <div className="nv-vrx-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'edit'} className={mode === 'edit' ? 'is-on' : ''} onClick={() => setMode('edit')}><Pencil size={16}/> Modifier</button>
        <button type="button" role="tab" aria-selected={mode === 'sim'} className={mode === 'sim' ? 'is-on' : ''} onClick={() => {setMode('sim'); setMenuOpen(true); setPanel(null); setSelected(null);}}><Play size={16}/> Simulation</button>
      </div>
      <button type="button" className="nv-vrx-close" onClick={onClose} aria-label="Fermer"><X size={20}/></button>
    </header>
    {project.vrEnabled !== true && <div className="nv-vrx-warn">
      <Eye size={16}/> Le mode casque est désactivé pour cette visite.
      <button type="button" onClick={() => setProject((p) => ({...p, vrEnabled: true}))}>Autoriser le casque</button>
    </div>}
    <div className={'nv-vrx-body' + (mode === 'sim' ? ' is-sim' : '')}>
      {mode === 'edit' && <aside className={'nv-vrx-palette' + (dragOver === 'palette' ? ' is-over' : '')} {...paletteDrop} aria-label="Boutons disponibles">
        <strong>Boutons disponibles</strong>
        <small>Glisse un bouton dans une case du cadre. Remets-le ici pour le retirer.</small>
        <div className="nv-vrx-tiles">
          {free.length ? free.map((a) => <button type="button" key={a.id} className="nv-vrx-tile" draggable onDragStart={(e) => onDragStart(e, a.id)}
            onClick={() => {
              const target = selected && !selectedId ? selected : (['left', 'right'] as const).flatMap((side) => cols[side].map((id, row) => (!id ? {side, row} : null))).find(Boolean) ?? null;
              if (target) place(a.id, target);
            }} title={actionHint(a.id, project)}>
            <span className="nv-vrx-tile-ico">{a.id === 'counter' ? '1/9' : <ActionIcon id={a.id} project={project} size={18}/>}</span>
            <span>{a.label.replace(/^Bouton « (.*) »$/, '$1')}{a.id.startsWith('bar:') && <em>barre du bas</em>}</span>
          </button>) : <p className="nv-vrx-empty">Tous les boutons sont placés.</p>}
        </div>
      </aside>}
      <main className="nv-vrx-stage">
        {shell}
        {mode === 'edit' && <p className={'nv-vrx-align' + (balanced ? ' is-ok' : '')}>
          {balanced ? '✓ ' : ''}{alignedRows} ligne{alignedRows > 1 ? 's' : ''} · les deux colonnes partagent les mêmes lignes et le bloc est centré dans le cadre.
          {!balanced && ' Astuce : laisse une case vide en haut d’une colonne pour décaler ses boutons.'}</p>}
        {mode === 'sim' && <p className="nv-vrx-align">Simulation : même mise en page que dans le casque. Les contenus s’ouvrent dans la zone centrale.</p>}
      </main>
      {mode === 'edit' && <aside className="nv-vrx-card" aria-label="Bouton sélectionné">
        {!selected ? <div className="nv-vrx-card-empty"><strong>Clique sur un bouton du cadre</strong><small>pour voir ce qu’il fait, changer son action, le déplacer ou le retirer.</small></div>
          : <>
            <span className="nv-vrx-card-where">Colonne {selected.side === 'left' ? 'de gauche' : 'de droite'} · ligne {selected.row + 1}</span>
            {selectedId ? <>
              <div className="nv-vrx-card-head"><span className="nv-vrx-card-ico">{selectedId === 'counter' ? '1/9' : <ActionIcon id={selectedId} project={project}/>}</span><strong>{labelOf(selectedId)}</strong></div>
              <p>{actionHint(selectedId, project)}</p>
            </> : <p>Case vide : elle garde l’alignement des lignes.</p>}
            <label>Ce bouton fait
              <select value={selectedId} onChange={(e) => {const id = e.target.value; if (id) place(id, selected); else removeAt(selected);}}>
                <option value="">— Case vide —</option>
                {actions.filter((a) => a.id === selectedId || !used.has(a.id)).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </label>
            {selectedId && <div className="nv-vrx-card-actions">
              <button type="button" disabled={selected.row === 0} onClick={() => {const to = {side: selected.side, row: selected.row - 1}; place(selectedId, to);}}><ChevronUp size={16}/> Monter</button>
              <button type="button" disabled={selected.row === VR_MAX_PER_COLUMN - 1} onClick={() => {const to = {side: selected.side, row: selected.row + 1}; place(selectedId, to);}}><ChevronDown size={16}/> Descendre</button>
              <button type="button" onClick={() => place(selectedId, {side: selected.side === 'left' ? 'right' : 'left', row: selected.row})}>⇄ Autre colonne</button>
              <button type="button" className="is-danger" onClick={() => removeAt(selected)}><Trash2 size={16}/> Retirer</button>
            </div>}
          </>}
        <div className="nv-vrx-card-foot">
          <label>Couleurs de l’interface
            <select value={menu.themed ? 'theme' : 'yellow'} onChange={(e) => setProject((p) => ({...p, vrMenu: {...vrMenuOf(p), themed: e.target.value === 'theme'}}))}>
              <option value="yellow">Jaune (actuel)</option>
              <option value="theme">Thème de la barre du bas</option>
            </select>
          </label>
          <label className="toggle-row"><input type="checkbox" checked={!!menu.autoOpen} onChange={(e) => setProject((p) => ({...p, vrMenu: {...vrMenuOf(p), autoOpen: e.target.checked}}))}/>
            Ouvrir l’interface dès l’entrée dans le casque</label>
          <button type="button" className="nv-vrx-reset" disabled={!project.vrMenu || JSON.stringify(project.vrMenu) === JSON.stringify(DEFAULT_VR_MENU)}
            onClick={() => {setProject((p) => ({...p, vrMenu: undefined})); setSelected(null);}}><RotateCcw size={14}/> Interface par défaut</button>
          <small>Enregistre la visite avec la disquette pour conserver ces réglages.</small>
        </div>
      </aside>}
    </div>
  </div>, document.fullscreenElement ?? document.body);
}
