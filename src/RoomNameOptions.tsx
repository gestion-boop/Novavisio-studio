import type {Scene} from './storage';

type Tri = 'inherit' | 'on' | 'off';
const toTri = (v: boolean | undefined): Tri => (v === undefined ? 'inherit' : v ? 'on' : 'off');
const fromTri = (t: Tri): boolean | undefined => (t === 'inherit' ? undefined : t === 'on');

/**
 * Rectangle avec le nom de la pièce, en haut de l'écran : réglé séparément pour la visite immersive et pour le casque.
 * Panorama : « selon le dossier » (défaut), « afficher » ou « masquer ». Dossier : case cochée = affiché.
 */
export function SceneRoomNameOptions({scene, onChange}: {scene: Pick<Scene, 'showRoomName' | 'showRoomNameVr'>; onChange: (change: Pick<Scene, 'showRoomName' | 'showRoomNameVr'>) => void}) {
  const select = (label: string, value: boolean | undefined, key: 'showRoomName' | 'showRoomNameVr') =>
    <label>{label}
      <select value={toTri(value)} onChange={(e) => onChange({showRoomName: scene.showRoomName, showRoomNameVr: scene.showRoomNameVr, [key]: fromTri(e.target.value as Tri)})}>
        <option value="inherit">Selon le dossier (par défaut : affiché)</option>
        <option value="on">Afficher</option>
        <option value="off">Masquer</option>
      </select>
    </label>;
  return <div className="nv-room-name-options" style={{display: 'grid', gap: 8, margin: '8px 0'}}>
    <strong style={{fontSize: 13}}>Rectangle avec le nom de la pièce (en haut)</strong>
    {select('Dans la visite immersive', scene.showRoomName, 'showRoomName')}
    {select('Dans le casque', scene.showRoomNameVr, 'showRoomNameVr')}
  </div>;
}

export function SpaceRoomNameOptions({space, onChange}: {space: {showRoomName?: boolean; showRoomNameVr?: boolean}; onChange: (change: {showRoomName?: boolean; showRoomNameVr?: boolean}) => void}) {
  return <div className="nv-room-name-options" style={{display: 'grid', gap: 6, margin: '8px 0'}}>
    <strong style={{fontSize: 13}}>Rectangle avec le nom des pièces de ce dossier</strong>
    <label className="toggle-row"><input type="checkbox" checked={space.showRoomName !== false}
      onChange={(e) => onChange({showRoomName: e.target.checked ? undefined : false})}/> Afficher dans la visite immersive</label>
    <label className="toggle-row"><input type="checkbox" checked={space.showRoomNameVr !== false}
      onChange={(e) => onChange({showRoomNameVr: e.target.checked ? undefined : false})}/> Afficher dans le casque</label>
    <small className="hint-inline">Chaque panorama peut imposer son propre choix dans ses réglages.</small>
  </div>;
}
