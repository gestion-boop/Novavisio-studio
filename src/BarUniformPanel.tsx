import {useState} from 'react';
import type {BarStyle,BottomBarItem,StudioProject} from './storage';
import {BAR_ICON_DEFAULT,barIconSize,withBarSize} from './storage';
import {autoIconZoom} from './iconFit';
import {PRESET_PROPOSALS} from './skinPalette';
import {ClientColorProposals} from './ClientSetupSteps';

type Props={
  project:StudioProject;
  selectedBar:BottomBarItem|null;
  setProject:(update:(p:StudioProject)=>StudioProject)=>void;
  onStyle:(style:Partial<BarStyle>)=>void;
  onMessage:(message:string)=>void;
};

/** Raccourcis visibles pour toute la barre du bas : mêmes tailles d'icônes, mêmes marges, mêmes couleurs. Chaque bouton agit sur TOUS les boutons à la fois. */
export function BarUniformPanel({project,selectedBar,setProject,onStyle,onMessage}:Props){
  const [busy,setBusy]=useState(false);
  const size=selectedBar?barIconSize(selectedBar):BAR_ICON_DEFAULT;
  const count=project.bottomBar.length;
  if(!count)return null;
  const uniformSize=()=>{
    setProject(p=>withBarSize(p,size));
    onMessage('Toutes les icônes de la barre ont maintenant la même taille : '+size+' px.');
  };
  const uniformFit=async()=>{
    setBusy(true);
    try{
      const zooms=new Map<string,number>();
      for(const item of project.bottomBar){
        const src=project.icons.find(i=>i.id===item.iconId)?.dataUrl;
        if(src)zooms.set(item.id,await autoIconZoom(src));
      }
      setProject(p=>({...withBarSize(p,size),barIconTrim:true,
        bottomBar:p.bottomBar.map(b=>({...b,iconSize:size,...(zooms.has(b.id)?{iconZoom:zooms.get(b.id)}:{})}))}));
      onMessage(zooms.size
        ?'Barre uniformisée : même taille ('+size+' px) et marges transparentes des '+zooms.size+' icône(s) ajustées.'
        :'Barre uniformisée : même taille ('+size+' px). Aucune icône importée à ajuster.');
    }finally{setBusy(false);}
  };
  /** Copie le réglage du bouton choisi (taille, zoom de l'icône, animation d'ouverture, police) vers tous les autres boutons. */
  const copyStyle=()=>{
    if(!selectedBar)return;
    const src=selectedBar;
    setProject(p=>({...withBarSize(p,barIconSize(src)),
      bottomBar:p.bottomBar.map(b=>({...b,iconSize:barIconSize(src),
        ...(src.iconZoom!==undefined&&b.iconId?{iconZoom:src.iconZoom}:{}),
        openAnimation:src.openAnimation,fontFamily:src.fontFamily}))}));
    onMessage('Le style du bouton « '+src.title+' » (taille, zoom, animation, police) est copié sur tous les boutons.');
  };
  return <section className="nv-bar-uniform" aria-label="Appliquer à toute la barre">
    <h4>Appliquer à toute la barre <small>({count} boutons)</small></h4>
    <div className="nv-bar-uniform-actions">
      <button type="button" disabled={busy} onClick={uniformSize}>Mêmes tailles<small>{size} px pour tous</small></button>
      <button type="button" disabled={busy} onClick={()=>void uniformFit()}>Icônes uniformes<small>taille + marges ajustées</small></button>
      <button type="button" disabled={busy||!selectedBar} title={selectedBar?undefined:'Choisis d’abord un bouton dans la liste ou dans la barre'} onClick={copyStyle}>Copier ce bouton à tous<small>{selectedBar?'« '+selectedBar.title+' » : taille, zoom, animation':'choisis d’abord un bouton'}</small></button>
    </div>
    <p className="nv-bar-uniform-label">Couleurs et style pour tous les boutons :</p>
    <div className="nv-skin-choices">{PRESET_PROPOSALS.map(p=><button type="button" key={p.name} onClick={()=>{onStyle(p.style);onMessage('Style « '+p.name+' » appliqué à toute la barre.');}}>
      <span className="nv-skin-preview" style={{background:p.style.background,borderColor:p.style.outline}}>{[0,1,2].map(k=><i key={k} style={{background:p.style.button,borderColor:p.style.buttonOutline}}><b style={{background:p.style.icon}}/></i>)}</span>
      <span>{p.name}</span></button>)}</div>
    <ClientColorProposals project={project} onPick={style=>{onStyle(style);onMessage('Couleurs d’après le logo appliquées à toute la barre.');}}/>
  </section>;
}
