import {useState,type ChangeEvent,type CSSProperties} from 'react';
import {Plus,Trash2,X} from 'lucide-react';
import {isSafeIconDataUrl,newProject,type BarStyle,type BottomBarItem,type CustomIcon,type StudioProject} from './storage';
import {validateSkin,type Skin} from './skins';
import {buildIconSets} from './IconLibrary';
import {XMark} from './XMark';

/**
 * Création de skin : on compose la barre du bas (Bouton 1 à 8), on importe l'icône de chaque bouton
 * (normal, survol, pressé) et on lui donne une signification (accueil, galerie, appeler…).
 * Le skin pourra ensuite être choisi à la création de n'importe quel projet : la barre se construit toute seule.
 */
const MEANINGS=[
  {key:'accueil',label:'Accueil',type:'navigation' as const,glyph:'home',title:'Accueil'},
  {key:'galerie',label:'Galerie des panoramas',type:'gallery' as const,glyph:'images',title:'Panoramas'},
  {key:'espaces',label:'Espaces',type:'gallery' as const,glyph:'grid',title:'Espaces'},
  {key:'plan',label:'Plan / itinéraire',type:'lien' as const,glyph:'map',title:'Plan'},
  {key:'appeler',label:'Appeler',type:'lien' as const,glyph:'phone',title:'Appeler'},
  {key:'information',label:'Information',type:'information' as const,glyph:'info',title:'Infos'},
  {key:'web',label:'Site web',type:'lien' as const,glyph:'web',title:'Site web'},
  {key:'reservation',label:'Réserver',type:'lien' as const,glyph:'calendar',title:'Réserver'}
];
type Meaning=typeof MEANINGS[number]['key'];
type State='normal'|'hover'|'pressed';
type Slot={id:string;meaning:Meaning;title:string;icons:Partial<Record<State,CustomIcon>>};
const STATE_LABEL:Record<State,string>={normal:'Normal',hover:'Survol',pressed:'Pressé'};
const DEFAULT_MEANINGS:Meaning[]=['accueil','galerie','plan','appeler','information'];
const meaningOf=(key:Meaning)=>MEANINGS.find(m=>m.key===key)!;
const COLOR_FIELDS:{key:'background'|'outline'|'button'|'buttonOutline'|'icon';label:string}[]=[
  {key:'background',label:'Fond de la barre'},{key:'outline',label:'Contour de la barre'},{key:'button',label:'Fond des boutons'},
  {key:'buttonOutline',label:'Contour des boutons'},{key:'icon',label:'Pictogrammes'}
];

function readIcon(file:File):Promise<CustomIcon>{
  return new Promise((resolve,reject)=>{
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){reject(new Error('Format non pris en charge (PNG, JPG, WebP, GIF).'));return;}
    if(file.size>1_500_000){reject(new Error('Image trop lourde (1,5 Mo maximum).'));return;}
    const reader=new FileReader();
    reader.onload=()=>{
      const dataUrl=String(reader.result);
      if(!isSafeIconDataUrl(dataUrl)){reject(new Error('Image non valide.'));return;}
      resolve({id:crypto.randomUUID(),name:file.name.replace(/\.[^.]+$/,'').slice(0,100),dataUrl});
    };
    reader.onerror=()=>reject(new Error('Lecture impossible.'));
    reader.readAsDataURL(file);
  });
}
const guessState=(name:string,index:number):State=>/surv|hover/i.test(name)?'hover':/press|clic|click|active/i.test(name)?'pressed':/normal/i.test(name)?'normal':(['normal','hover','pressed'] as const)[Math.min(index,2)];

export function SkinCreator({project,onSave,onClose}:{project:StudioProject;onSave:(skin:Skin)=>Promise<void>;onClose:()=>void}){
  const [name,setName]=useState('Mon skin');
  const [style,setStyle]=useState<BarStyle>({...project.barStyle});
  const [slots,setSlots]=useState<Slot[]>(()=>DEFAULT_MEANINGS.map((m,i)=>({id:crypto.randomUUID(),meaning:m,title:'Bouton '+(i+1),icons:{}})));
  const [index,setIndex]=useState(0);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [libraryOpen,setLibraryOpen]=useState(false);
  const slot=slots[index]??slots[0];
  const sets=buildIconSets(project.icons);
  const patch=(change:Partial<Slot>)=>setSlots(list=>list.map((s,i)=>i===index?{...s,...change}:s));
  const setIcon=(state:State,icon?:CustomIcon)=>setSlots(list=>list.map((s,i)=>i===index?{...s,icons:{...s.icons,[state]:icon}}:s));

  async function importOne(state:State,e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.target.value='';
    if(!file)return;
    try{setIcon(state,await readIcon(file));setMessage('');}catch(err){setMessage(err instanceof Error?err.message:String(err));}
  }
  // Plusieurs images d'un coup : rangées selon leur nom (normal / survol / pressé) ou, à défaut, dans l'ordre.
  async function importMany(e:ChangeEvent<HTMLInputElement>){
    const files=[...(e.target.files??[])].slice(0,3);e.target.value='';
    if(!files.length)return;
    try{
      const icons:Partial<Record<State,CustomIcon>>={};
      for(let i=0;i<files.length;i++){icons[guessState(files[i].name,i)]=await readIcon(files[i]);}
      patch({icons:{...slot.icons,...icons}});setMessage('');
    }catch(err){setMessage(err instanceof Error?err.message:String(err));}
  }
  function chooseMeaning(key:Meaning){
    const oldDefault=meaningOf(slot.meaning).title,next=meaningOf(key);
    const generic=/^Bouton \d+$/.test(slot.title)||slot.title===oldDefault;
    patch({meaning:key,...(generic?{title:next.title}:{})});
  }
  function addSlot(){
    if(slots.length>=8)return;
    setSlots(list=>[...list,{id:crypto.randomUUID(),meaning:'information',title:'Bouton '+(list.length+1),icons:{}}]);
    setIndex(slots.length);
  }
  function removeSlot(){
    if(slots.length<=1)return;
    setSlots(list=>list.filter((_,i)=>i!==index));
    setIndex(i=>Math.max(0,i-1));
  }
  async function save(){
    if(!name.trim()){setMessage('Donne un nom à ton skin.');return;}
    setBusy(true);setMessage('');
    try{
      const icons:CustomIcon[]=[];
      const keep=(icon?:CustomIcon)=>{
        if(!icon)return undefined;
        const same=icons.find(i=>i.dataUrl===icon.dataUrl);
        if(same)return same.id;
        icons.push(icon);return icon.id;
      };
      const bottomBar:BottomBarItem[]=slots.map(sl=>{
        const m=meaningOf(sl.meaning);
        const normal=keep(sl.icons.normal??sl.icons.hover??sl.icons.pressed);
        return {id:crypto.randomUUID(),title:sl.title.trim()||m.title,type:m.type,...(m.type==='gallery'?{gallery:[]}:{}),
          target:'',text:'',url:'',builtinIcon:m.glyph,iconId:normal,
          hoverIconId:keep(sl.icons.hover),pressedIconId:keep(sl.icons.pressed),iconSize:42};
      });
      const appearance:StudioProject={...newProject(),name:'Skin',barStyle:{...style},bottomBar,icons,languages:project.languages};
      await onSave(validateSkin({version:1,id:crypto.randomUUID(),name:name.trim(),updatedAt:new Date().toISOString(),appearance}));
      onClose();
    }catch(err){setMessage(err instanceof Error?err.message:String(err));}
    finally{setBusy(false);}
  }
  const barStyle:CSSProperties={background:style.background,border:`${style.outlineWidth}px solid ${style.outline}`,borderRadius:Math.min(style.roundness,40)};
  return <div className="overlay nv-skincreator-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="nv-skincreator" role="dialog" aria-modal="true" aria-label="Création de skin">
      <header><div><strong>Création de skin</strong><small>Compose ta barre, importe les boutons et donne-leur une signification.</small></div>
        <button type="button" onClick={onClose} aria-label="Fermer"><X size={20}/></button></header>
      <label className="nv-sc-name">Nom du skin<input value={name} maxLength={80} onChange={e=>setName(e.target.value)}/></label>

      <div className="nv-sc-barwrap">
        <div className="nv-sc-bar" style={barStyle} role="tablist" aria-label="Boutons de la barre">
          {slots.map((sl,i)=>{
            const icon=sl.icons.normal??sl.icons.hover??sl.icons.pressed;
            return <button type="button" key={sl.id} role="tab" aria-selected={i===index} className={'nv-sc-btn'+(i===index?' is-selected':'')} onClick={()=>setIndex(i)}
              style={{background:style.button,border:`${style.buttonOutlineWidth}px solid ${style.buttonOutline}`,color:style.icon}} title={sl.title+' · '+meaningOf(sl.meaning).label}>
              {icon?<img src={icon.dataUrl} alt=""/>:<span aria-hidden="true">{i+1}</span>}
            </button>;
          })}
          {slots.length<8&&<button type="button" className="nv-sc-add" onClick={addSlot} aria-label="Ajouter un bouton"><Plus size={18}/></button>}
        </div>
        <div className="nv-sc-bar-labels">{slots.map((sl,i)=><small key={sl.id} className={i===index?'is-on':''}>{sl.title}</small>)}</div>
      </div>

      <div className="nv-sc-editor">
        <div className="nv-sc-editor-head"><strong>Bouton {index+1}</strong>
          <button type="button" className="nv-sc-remove" onClick={removeSlot} disabled={slots.length<=1}><Trash2 size={14}/> Retirer ce bouton</button></div>
        <div className="nv-sc-label">Signification</div>
        <div className="nv-sc-meanings" role="radiogroup" aria-label="Signification du bouton">
          {MEANINGS.map(m=><button type="button" role="radio" aria-checked={slot.meaning===m.key} key={m.key} className={'nv-sc-meaning'+(slot.meaning===m.key?' is-on':'')} onClick={()=>chooseMeaning(m.key)}>{m.label}</button>)}
        </div>
        <label className="nv-sc-text">Nom affiché<input value={slot.title} maxLength={60} onChange={e=>patch({title:e.target.value})}/></label>
        <div className="nv-sc-label">Images du bouton</div>
        <div className="nv-sc-states">
          {(['normal','hover','pressed'] as const).map(st=><div key={st} className="nv-sc-state">
            <span className="nv-sc-state-img">{slot.icons[st]?<img src={slot.icons[st]!.dataUrl} alt=""/>:<em>—</em>}</span>
            <small>{STATE_LABEL[st]}</small>
            <label className="nv-sc-file">{slot.icons[st]?'Changer':'Importer'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void importOne(st,e)}/></label>
            {slot.icons[st]&&<button type="button" className="nv-sc-clear" onClick={()=>setIcon(st,undefined)} aria-label={'Retirer '+STATE_LABEL[st]}><XMark/></button>}
          </div>)}
        </div>
        <div className="nv-sc-import-row">
          <label className="nv-sc-file is-big">Importer les 3 images d’un coup<input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void importMany(e)}/></label>
          {sets.length>0&&<button type="button" className="nv-sc-lib" onClick={()=>setLibraryOpen(o=>!o)} aria-expanded={libraryOpen}>Choisir dans ma bibliothèque</button>}
        </div>
        {libraryOpen&&<div className="nv-sc-library">
          {sets.map(set=><button type="button" key={set.key} className="nv-sc-set" title={set.name}
            onClick={()=>{patch({icons:{normal:set.normal,hover:set.hover,pressed:set.pressed}});setLibraryOpen(false);}}>
            <span>{[set.normal,set.hover,set.pressed].map((ic,i)=>ic?<img key={i} src={ic.dataUrl} alt=""/>:<em key={i}>—</em>)}</span><small>{set.name}</small>
          </button>)}
        </div>}
      </div>

      <div className="nv-sc-colors">
        <div className="nv-sc-label">Couleurs de la barre</div>
        <div className="nv-sc-color-grid">{COLOR_FIELDS.map(f=><label key={f.key}><span>{f.label}</span>
          <input type="color" value={style[f.key]} onChange={e=>setStyle(s=>({...s,[f.key]:e.target.value}))}/></label>)}</div>
      </div>

      {message&&<p className="nv-sc-error" role="alert">{message}</p>}
      <div className="nv-sc-actions">
        <button type="button" onClick={onClose}>Annuler</button>
        <button type="button" className="is-primary" disabled={busy} onClick={()=>void save()}>Enregistrer ce skin</button>
      </div>
    </section>
  </div>;
}
