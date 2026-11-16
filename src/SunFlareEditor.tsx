import type {SunFlare} from './storage';

const DEFAULT_SUN:SunFlare={yaw:0,pitch:20,intensity:0.6,length:400,orientation:0,rays:16};

/** Réglage du reflet de soleil d'un panorama : position (cap, hauteur), intensité, longueur, orientation, rayons. */
export function SunFlareEditor({value,onChange}:{value:SunFlare|undefined;onChange:(next:SunFlare|undefined)=>void}){
  const sun=value??DEFAULT_SUN;
  const set=(patch:Partial<SunFlare>)=>onChange({...sun,...patch});
  return <div className="nv-sun-flare-editor" role="group" aria-label="Reflet de soleil">
    <label className="toggle-row"><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked?DEFAULT_SUN:undefined)}/> Reflet de soleil sur ce panorama</label>
    {value&&<>
      <small>Cap : 0° = devant, positif = à droite. Hauteur : 0° = horizon, positif = vers le haut.</small>
      <label>Cap du soleil : {sun.yaw}°<input type="range" min={-180} max={180} step={1} value={sun.yaw} onChange={e=>set({yaw:Number(e.target.value)})}/></label>
      <label>Hauteur du soleil : {sun.pitch}°<input type="range" min={-80} max={80} step={1} value={sun.pitch} onChange={e=>set({pitch:Number(e.target.value)})}/></label>
      <label>Intensité : {Math.round(sun.intensity*100)} %<input type="range" min={0} max={1} step={0.05} value={sun.intensity} onChange={e=>set({intensity:Number(e.target.value)})}/></label>
      <label>Longueur des rayons : {sun.length} px<input type="range" min={40} max={1200} step={10} value={sun.length} onChange={e=>set({length:Number(e.target.value)})}/></label>
      <label>Orientation des rayons : {sun.orientation}°<input type="range" min={0} max={359} step={1} value={sun.orientation} onChange={e=>set({orientation:Number(e.target.value)})}/></label>
      <label>Nombre de rayons : {sun.rays}<input type="range" min={4} max={48} step={1} value={sun.rays} onChange={e=>set({rays:Number(e.target.value)})}/></label>
    </>}
  </div>;
}
