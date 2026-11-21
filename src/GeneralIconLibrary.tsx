import {useState} from 'react';
import {GENERAL_ICONS,GENERAL_ICON_GROUPS} from './generalIconCatalog';
import {DEFAULT_GENERAL_ICON,readGeneralIconDesign,renderGeneralIcon,type GeneralIconDesign} from './generalIconDesign';
import type {IconSetImages} from './IconSetCreator';
import './generalIconLibrary.css';

const STORAGE_KEY='nvstudio-general-icon-models';
type Model={name:string;design:GeneralIconDesign};

function readModels():Model[]{
  try{
    const list:unknown=JSON.parse(localStorage.getItem(STORAGE_KEY)??'[]');
    if(!Array.isArray(list))return [];
    return list.filter(model=>typeof model?.name==='string'&&readGeneralIconDesign(model.design)).slice(0,100);
  }catch{return [];}
}

export function GeneralIconLibrary({onAdd,applyLabel,barTheme}:{
  /** Couleurs de la barre du bas : bouton, contour du bouton, icône. */
  barTheme?:{button:string;buttonOutline:string;icon:string};
  onAdd:(label:string,images:IconSetImages,apply:boolean)=>Promise<void>;
  applyLabel?:string;
}){
  const [design,setDesign]=useState(DEFAULT_GENERAL_ICON);
  const [category,setCategory]=useState('');
  const [query,setQuery]=useState('');
  const [name,setName]=useState('');
  const [models,setModels]=useState(readModels);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [state,setState]=useState<'normal'|'hover'|'pressed'>('normal');
  const label=name.trim()||design.motif;
  const patch=(value:Partial<GeneralIconDesign>)=>setDesign(d=>({...d,...value}));
  const searchable=(s:string)=>s.toLocaleLowerCase('fr').normalize('NFD').replace(/\p{Diacritic}/gu,'');
  const filtered=GENERAL_ICONS.filter(icon=>(!category||icon.category===category)&&
    searchable(icon.label).includes(searchable(query.trim())));
  const Selected=GENERAL_ICONS.find(icon=>icon.label===design.motif)!.Glyph;

  function writeModels(next:Model[]){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
      setModels(next);
      setStatus('Modèles enregistrés sur cet appareil.');
    }catch{setStatus('Impossible d’enregistrer les modèles sur cet appareil.');}
  }

  async function add(apply:boolean){
    setBusy(true);setStatus('');
    try{
      await onAdd(label,await renderGeneralIcon(design),apply);
      setStatus('Les trois états ont été ajoutés à la visite.');
    }catch(error){setStatus(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
  }

  async function downloadPack(){
    setBusy(true);setStatus('Création du pack PNG…');
    try{
      const {default:JSZip}=await import('jszip');
      const zip=new JSZip();
      for(const icon of filtered){
        const images=await renderGeneralIcon({...design,motif:icon.label});
        const slug=searchable(icon.label).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
        for(const [state,suffix] of [['normal','normal'],['hover','survol'],['pressed','presse']] as const){
          zip.file(slug+'_'+suffix+'.png',images[state].split(',')[1],{base64:true});
        }
      }
      const url=URL.createObjectURL(await zip.generateAsync({type:'blob'}));
      const link=document.createElement('a');
      link.href=url;link.download='NovaStudio-'+design.finish+'-'+design.shape+'.zip';
      document.body.append(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
      setStatus('Pack téléchargé : '+filtered.length+' pictogrammes en trois états.');
    }catch(error){setStatus(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
  }

  return <div className="nv-general-icons">
    <div className="nv-general-icon-filters">
      <label>Rechercher un pictogramme<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex. piscine, massage…"/></label>
      <label>Catégorie<select value={category} onChange={e=>setCategory(e.target.value)}>
        <option value="">Toutes les catégories</option>
        {GENERAL_ICON_GROUPS.map(group=><option key={group.name}>{group.name}</option>)}
      </select></label>
    </div>
    <div className="nv-general-icon-catalog" aria-label="Pictogrammes">
      {filtered.map(({label,Glyph})=><button type="button" key={label} aria-pressed={design.motif===label}
        onClick={()=>patch({motif:label})}><Glyph size={23} aria-hidden="true"/><span>{label}</span></button>)}
      {!filtered.length&&<p className="hint">Aucun pictogramme trouvé.</p>}
    </div>
    <div className="nv-general-icon-editor">
      <div className="nv-general-icon-sample">
        <div className={'nv-general-icon-swatch '+design.shape+' '+design.finish+' '+state}
          style={{backgroundColor:design.finish==='clear'?'transparent':design.background,
            borderColor:design.finish==='clear'?'transparent':design.outline,color:design.foreground}}>
          <Selected size={44} strokeWidth={2} aria-hidden="true"/>
        </div>
        <label>État de l’aperçu<select value={state} onChange={e=>setState(e.target.value as typeof state)}>
          <option value="normal">Normal</option><option value="hover">Survol</option><option value="pressed">Pressé</option>
        </select></label>
      </div>
      <div className="nv-general-icon-options">
        <label>Finition<select value={design.finish} onChange={e=>patch({finish:e.target.value as GeneralIconDesign['finish']})}>
          <option value="glossy">Glossy</option><option value="matte">Plat</option><option value="clear">Sans fond</option>
        </select></label>
        <label>Forme<select value={design.shape} disabled={design.finish==='clear'} onChange={e=>patch({shape:e.target.value as GeneralIconDesign['shape']})}>
          <option value="round">Rond</option><option value="square">Carré</option><option value="rounded">Carré arrondi</option>
        </select></label>
        <label>Fond<input type="color" value={design.background} disabled={design.finish==='clear'} onChange={e=>patch({background:e.target.value})}/></label>
        <label>Contour<input type="color" value={design.outline} disabled={design.finish==='clear'} onChange={e=>patch({outline:e.target.value})}/></label>
        <label>Pictogramme<input type="color" value={design.foreground} onChange={e=>patch({foreground:e.target.value})}/></label>
        {barTheme&&<button type="button" className="quiet" onClick={()=>patch({background:barTheme.button,outline:barTheme.buttonOutline,foreground:barTheme.icon,finish:design.finish==="clear"?"glossy":design.finish})}>Couleurs de la barre</button>}
      </div>
    </div>
    <label>Nom du modèle<input value={name} maxLength={100} onChange={e=>setName(e.target.value)} placeholder={design.motif}/></label>
    <div className="nv-general-icon-actions">
      <button type="button" className="primary" disabled={busy} onClick={()=>void add(!!applyLabel)}>
        {applyLabel?'Créer et appliquer '+applyLabel:'Ajouter à la visite'}
      </button>
      {applyLabel&&<button type="button" className="import" disabled={busy} onClick={()=>void add(false)}>Ajouter sans appliquer</button>}
      <button type="button" className="import" onClick={()=>writeModels([{name:label,design},...models.filter(m=>m.name!==label)].slice(0,100))}>Enregistrer le modèle</button>
    </div>
    <button type="button" className="import" disabled={busy||!filtered.length} onClick={()=>void downloadPack()}>
      Télécharger les {filtered.length} pictogrammes affichés en ZIP
    </button>
    {models.length>0&&<label>Mes modèles sur cet appareil<select value="" onChange={e=>{
      const model=models.find(m=>m.name===e.target.value);if(model){setDesign(model.design);setName(model.name);}
    }}>
      <option value="">Charger un modèle</option>{models.map(model=><option key={model.name}>{model.name}</option>)}
    </select></label>}
    {status&&<p className="hint" role="status">{status}</p>}
  </div>;
}
