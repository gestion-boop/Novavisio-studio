import {useState} from 'react';
import {glossyIconStates,type GlossyStates} from './glossyIcon';
import {isSafeIconDataUrl,type GlossyStyle} from './storage';

/** Panneau de création d'un pack glossy : couleur, reflet, ombre et pictogramme facultatif.
 *  `initial` = charte du projet (ou du thème appliqué) ; la charte utilisée est renvoyée à la création. */
/** Boutons que l'on peut ajouter à la barre du bas, avec leur type de bouton. */
export const BAR_CHOICES:ReadonlyArray<{key:string;label:string;type:'navigation'|'information'|'lien'|'gallery'|'plan'}>=[
  {key:'arrow',label:'Flèche',type:'navigation'},
  {key:'camera',label:'Photo',type:'information'},
  {key:'video',label:'Vidéo',type:'information'},
  {key:'map',label:'Localisation',type:'information'},
  {key:'images',label:'Images',type:'gallery'},
  {key:'plan',label:'Carte',type:'plan'},
  {key:'panorama',label:'Panorama',type:'navigation'},
  {key:'utensils',label:'Restaurant',type:'information'},
  {key:'phone',label:'Appeler',type:'lien'},
  {key:'info',label:'Information',type:'information'},
];

/** Couleurs prêtes à l'emploi pour une charte rapide. */
const PRESETS:ReadonlyArray<{name:string;base:string}>=[
  {name:'Or',base:'#c79c5a'},
  {name:'Bleu nuit',base:'#2f4f7a'},
  {name:'Vert olive',base:'#5f7a3a'},
  {name:'Bordeaux',base:'#7a2435'},
  {name:'Anthracite',base:'#3d4248'},
];

export function GlossyPackMaker({onCreate,onCreateBar,onCreateMotifs,onAddToBar,defaultLabel,initial}:{onCreate:(states:GlossyStates,label:string,style:GlossyStyle,applyBar:boolean)=>void;onCreateBar?:(style:GlossyStyle)=>void;onCreateMotifs?:(style:GlossyStyle)=>void;onAddToBar?:(keys:string[],style:GlossyStyle)=>void;defaultLabel:string;initial?:GlossyStyle}){
  const [applyBar,setApplyBar]=useState(false);
  const [chosen,setChosen]=useState<string[]>([]);
  const [base,setBase]=useState(initial?.base??'#2f7f9e');
  const [rim,setRim]=useState(initial?.rim??'');
  const [gloss,setGloss]=useState(initial?.gloss??0.7);
  const [shadow,setShadow]=useState(initial?.shadow??0.5);
  const [glyph,setGlyph]=useState<string|undefined>();
  const [label,setLabel]=useState(defaultLabel);
  const [preview,setPreview]=useState<GlossyStates|null>(null);
  const [error,setError]=useState('');

  async function render(){
    setError('');
    try{
      const states=await glossyIconStates({base,rim:rim||undefined,gloss,shadow,glyph});
      setPreview(states);
      return states;
    }catch(e){setError(String(e instanceof Error?e.message:e));return null;}
  }
  function pickGlyph(file?:File){
    if(!file)return;
    if(!['image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){setError('Pictogramme : PNG ou WebP de 2 Mo maximum.');return;}
    const reader=new FileReader();
    reader.onload=()=>{
      const url=String(reader.result??'');
      if(!isSafeIconDataUrl(url)){setError('Pictogramme incompatible.');return;}
      setGlyph(url);setPreview(null);
    };
    reader.readAsDataURL(file);
  }

  return <div className="nv-glossy-maker" style={{display:'grid',gap:8,marginTop:10}}>
    <span className="section-title">Style glossy réutilisable</span>
    <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
      {PRESETS.map(p=><button key={p.base} type="button" className="style-reset" title={p.name} aria-label={'Couleur '+p.name} onClick={()=>{setBase(p.base);setPreview(null);}}
        style={{width:30,height:30,borderRadius:'50%',padding:0,background:p.base,border:base===p.base?'3px solid #111':'1px solid #0005'}}/>)}
    </div>
    <label>Couleur du bouton <input type="color" value={base} onChange={e=>{setBase(e.target.value);setPreview(null);}}/></label>
    <label>Liseré extérieur <input type="color" value={rim||'#000000'} onChange={e=>{setRim(e.target.value);setPreview(null);}}/>
      {rim&&<button type="button" className="style-reset" onClick={()=>{setRim('');setPreview(null);}}>Automatique</button>}</label>
    <label>Reflet : <b>{Math.round(gloss*100)} %</b>
      <input type="range" min="0" max="100" value={Math.round(gloss*100)} onChange={e=>{setGloss(Number(e.target.value)/100);setPreview(null);}}/></label>
    <label>Ombre : <b>{Math.round(shadow*100)} %</b>
      <input type="range" min="0" max="100" value={Math.round(shadow*100)} onChange={e=>{setShadow(Number(e.target.value)/100);setPreview(null);}}/></label>
    <label>Pictogramme au centre (facultatif, PNG transparent)
      <input type="file" accept="image/png,image/webp" onChange={e=>{pickGlyph(e.target.files?.[0]);e.currentTarget.value='';}}/></label>
    {glyph&&<button type="button" className="style-reset" onClick={()=>{setGlyph(undefined);setPreview(null);}}>Retirer le pictogramme</button>}
    <label>Nom du pack <input type="text" value={label} maxLength={60} onChange={e=>setLabel(e.target.value)}/></label>
    <button type="button" className="style-reset" onClick={()=>void render()}>Aperçu</button>
    {preview&&<div style={{display:'flex',gap:10,alignItems:'center'}}>
      {(['normal','hover','pressed'] as const).map(k=><div key={k} style={{textAlign:'center',fontSize:12}}><img src={preview[k]} alt={k} style={{width:64,height:64}}/><div>{k==='normal'?'Normal':k==='hover'?'Survol':'Pressé'}</div></div>)}
    </div>}
    {error&&<small style={{color:'#ffb4a8'}}>{error}</small>}
    <label className="toggle-row"><input type="checkbox" checked={applyBar} onChange={e=>setApplyBar(e.target.checked)}/> Utiliser aussi pour tous les boutons de la barre</label>
    <button type="button" className="import" onClick={async()=>{const states=preview??await render();if(states)onCreate(states,label.trim()||defaultLabel,{base,rim:rim||undefined,gloss,shadow},applyBar);}}>
      ✦ Créer et utiliser ce pack glossy (Normal · Survol · Pressé)</button>
    {onCreateBar&&<button type="button" className="import" onClick={()=>onCreateBar({base,rim:rim||undefined,gloss,shadow})}>
      ✦ Créer une icône glossy avec son pictogramme pour chaque bouton de la barre</button>}
    {onCreateMotifs&&<button type="button" className="import" onClick={()=>onCreateMotifs({base,rim:rim||undefined,gloss,shadow})}>
      ✦ Créer les icônes glossy de la visite : flèche, photo, vidéo, localisation, images, carte, panorama, restaurant, son, paramètres</button>}
    {onAddToBar&&<div style={{display:'grid',gap:6}}>
      <span className="section-title">Boutons de la barre du bas à ajouter</span>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:6}}>
        {BAR_CHOICES.map(choice=><label key={choice.key} className="toggle-row"><input type="checkbox" checked={chosen.includes(choice.key)}
          onChange={e=>setChosen(list=>e.target.checked?[...list,choice.key]:list.filter(k=>k!==choice.key))}/> {choice.label}</label>)}
      </div>
      <button type="button" className="import" disabled={!chosen.length} onClick={()=>{onAddToBar(chosen,{base,rim:rim||undefined,gloss,shadow});setChosen([]);}}>
        ✦ Ajouter les boutons cochés à la barre ({chosen.length})</button>
    </div>}
  </div>;
}
