import {useState} from 'react';
import {Check,Image as ImageIcon,LoaderCircle,Palette as PaletteIcon,Plus,Search,Star,X} from 'lucide-react';
import type {BarStyle,ClientProfile} from './storage';
import {fetchSocialImages} from './socialImages';
import {proposalsFromImages,PRESET_PROPOSALS,type SkinProposal} from './skinPalette';

export type Palette=Pick<BarStyle,'background'|'outline'|'button'|'buttonOutline'|'icon'>;
const FALLBACK:Palette={background:'#c2c5c6',outline:'#987974',button:'#5d131a',buttonOutline:'#4a1518',icon:'#f4d69a'};
const COLOR_FIELDS:[keyof Palette,string][]=[['background','Fond de la barre'],['outline','Contour de la barre'],['button','Boutons'],['buttonOutline','Contour des boutons'],['icon','Pictogrammes']];
const https=(u?:string)=>{try{const x=new URL((u||'').trim());return x.protocol==='https:'&&x.href.length<=2048?x.href:'';}catch{return '';}};

/**
 * Modification d'un client : logo, photos (retenir / écarter / ajouter / chercher sur le site et les réseaux sociaux) et couleurs du skin.
 * Les couleurs choisies ici remplacent celles de la barre du projet (le skin) lors de l'enregistrement.
 */
export function ClientMediaEditor({profile,onProfile,initialPool=[],style,onStyle,proposals=[],proposalNote=''}:{
  profile:ClientProfile;onProfile:(p:ClientProfile)=>void;initialPool?:string[];
  style?:Palette;onStyle:(s:Palette)=>void;proposals?:SkinProposal[];proposalNote?:string;
}){
  const [pool,setPool]=useState<string[]>(()=>[...new Set([...initialPool,...(profile.photoUrls||[]),...(profile.logoUrl?[profile.logoUrl]:[])].map(https).filter(Boolean))]);
  const [socialSource,setSocialSource]=useState<Record<string,string>>({});
  const [url,setUrl]=useState(''),[logoUrl,setLogoUrl]=useState('');
  const [busy,setBusy]=useState(''),[message,setMessage]=useState('');
  const [mine,setMine]=useState<SkinProposal[]>([]);
  const kept=new Set(profile.photoUrls||[]);
  const palette=style??FALLBACK;
  const setPhotos=(list:string[])=>onProfile({...profile,photoUrls:list.slice(0,30)});
  const toggle=(src:string)=>setPhotos(kept.has(src)?[...kept].filter(x=>x!==src):[...kept,src]);
  const addToPool=(srcs:string[],keep:boolean)=>{
    setPool(prev=>[...new Set([...prev,...srcs])].slice(0,60));
    if(keep)setPhotos([...new Set([...(profile.photoUrls||[]),...srcs])]);
  };
  const addUrl=()=>{
    const clean=https(url);
    if(!clean){setMessage('Adresse d’image invalide : elle doit commencer par https://');return;}
    addToPool([clean],true);setUrl('');setMessage('Photo ajoutée.');
  };
  const useLogo=(src:string)=>{onProfile({...profile,logoUrl:src});setMessage('Logo mis à jour.');};
  const searchMore=async()=>{
    setBusy('search');setMessage('');
    try{
      const {found,notes}=await fetchSocialImages([
        {label:'Site internet',url:profile.website},{label:'Facebook',url:profile.facebook},{label:'Instagram',url:profile.instagram}]);
      const fresh=found.filter(f=>!pool.includes(f.src));
      setSocialSource(prev=>({...prev,...Object.fromEntries(found.map(f=>[f.src,f.source]))}));
      addToPool(fresh.map(f=>f.src),false);
      const logos=fresh.filter(f=>f.kind==='logo');
      if(!profile.logoUrl&&logos[0])useLogo(logos[0].src);
      setMessage((fresh.length?fresh.length+' image(s) trouvée(s) — clique sur celles à retenir. ':'Aucune nouvelle image. ')+notes.join(' · ')+
        (notes.some(n=>/Facebook|Instagram/.test(n))?' (Facebook et Instagram bloquent souvent la lecture automatique : tu peux coller l’adresse d’une image ci-dessous.)':''));
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}
    finally{setBusy('');}
  };
  const fromLogo=async()=>{
    setBusy('colors');setMessage('');
    try{setMine(await proposalsFromImages([profile.logoUrl||'',...[...kept].slice(0,2)].filter(Boolean)));}
    catch(e){setMine(PRESET_PROPOSALS);setMessage((e instanceof Error?e.message:String(e))+' Palettes standard proposées à la place.');}
    finally{setBusy('');}
  };
  const choices=[...proposals,...mine];
  const canSearch=!!(https(profile.website)||https(profile.facebook)||https(profile.instagram));
  return <div className="nv-media-editor">
    <section>
      <div className="nv-directory-section-head"><Star size={16}/> Logo</div>
      <div className="nv-media-logo-row">
        <span className="nv-media-logo">{https(profile.logoUrl)?<img src={profile.logoUrl} alt="Logo"/>:<em>Aucun logo</em>}</span>
        <div className="nv-media-logo-edit">
          <label>Adresse du logo (https)<input value={logoUrl} placeholder="https://…" onChange={e=>setLogoUrl(e.target.value)}/></label>
          <div><button type="button" disabled={!https(logoUrl)} onClick={()=>{useLogo(https(logoUrl));setLogoUrl('');}}>Utiliser cette adresse</button>
            {!!profile.logoUrl&&<button type="button" className="is-quiet" onClick={()=>onProfile({...profile,logoUrl:''})}>Retirer le logo</button>}</div>
        </div>
      </div>
    </section>
    <section>
      <div className="nv-directory-section-head"><ImageIcon size={16}/> Photos ({kept.size} retenue{kept.size>1?'s':''} sur {pool.length})</div>
      <div className="nv-media-actions">
        <button type="button" disabled={!canSearch||busy==='search'} onClick={()=>void searchMore()} title={canSearch?'Lit les images publiques du site, de Facebook et d’Instagram':'Renseigne un site, une page Facebook ou Instagram'}>
          {busy==='search'?<LoaderCircle size={14}/>:<Search size={14}/>} Chercher des photos (site, Facebook, Instagram)</button>
      </div>
      {pool.length>0&&<div className="nv-discovery-photos">{pool.map((src,i)=><div key={src} className={'nv-media-tile'+(kept.has(src)?' is-on':'')}>
        <button type="button" className="nv-media-pick" aria-pressed={kept.has(src)} onClick={()=>toggle(src)} title={kept.has(src)?'Écarter cette photo':'Retenir cette photo'}>
          <img src={src} alt={'Photo '+(i+1)} loading="lazy"/><i>{kept.has(src)?<Check size={13}/>:null}</i>
        </button>
        <div className="nv-media-tile-bar">
          <button type="button" onClick={()=>useLogo(src)} title="Utiliser comme logo"><Star size={12}/> Logo</button>
          {socialSource[src]&&<small>{socialSource[src]}</small>}
          <button type="button" onClick={()=>{setPool(prev=>prev.filter(x=>x!==src));setPhotos([...kept].filter(x=>x!==src));}} title="Supprimer de la liste" aria-label="Supprimer"><X size={12}/></button>
        </div>
      </div>)}</div>}
      <div className="nv-media-add"><input value={url} placeholder="Coller l’adresse (https) d’une photo…" onChange={e=>setUrl(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addUrl();}}/>
        <button type="button" onClick={addUrl}><Plus size={14}/> Ajouter</button></div>
    </section>
    <section>
      <div className="nv-directory-section-head"><PaletteIcon size={16}/> Couleurs du skin</div>
      {proposalNote&&<p className="nv-directory-muted">{proposalNote}</p>}
      <div className="nv-media-actions"><button type="button" disabled={busy==='colors'} onClick={()=>void fromLogo()}>{busy==='colors'?<LoaderCircle size={14}/>:<PaletteIcon size={14}/>} Proposer des couleurs d’après le logo et les photos</button></div>
      {choices.length>0&&<div className="nv-skin-choices">{choices.map(p=><button type="button" key={p.name+p.style.button} onClick={()=>onStyle(p.style)}>
        <span className="nv-skin-preview" style={{background:p.style.background,borderColor:p.style.outline}}>{[0,1,2].map(k=><i key={k} style={{background:p.style.button,borderColor:p.style.buttonOutline}}><b style={{background:p.style.icon}}/></i>)}</span><span>{p.name}</span></button>)}</div>}
      <div className="nv-media-colors">{COLOR_FIELDS.map(([key,label])=><label key={key}>{label}
        <input type="color" aria-label={label} value={palette[key]} onChange={e=>onStyle({...palette,[key]:e.target.value})}/></label>)}</div>
      <span className="nv-skin-preview nv-media-live" style={{background:palette.background,borderColor:palette.outline}}>{[0,1,2,3,4].map(k=><i key={k} style={{background:palette.button,borderColor:palette.buttonOutline}}><b style={{background:palette.icon}}/></i>)}</span>
      <p className="nv-directory-muted">Ces couleurs modifient le skin (la barre du bas) de la visite lors de l’enregistrement.</p>
    </section>
    {message&&<p role="status" className="nv-discovery-notice">{message}</p>}
  </div>;
}
