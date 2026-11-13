import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import {Plus,Trash2} from 'lucide-react';
import type {CustomIcon} from './storage';

/**
 * Bibliothèque d'icônes : une carte = un jeu complet (normal · survol · pressé), classé par couleur.
 * Les icônes sont regroupées d'après leur nom (« …_normal », « …_survol », « …_presse »).
 */
type State='normal'|'hover'|'pressed';
export type IconSet={key:string;name:string;normal?:CustomIcon;hover?:CustomIcon;pressed?:CustomIcon;ids:string[]};
const STATE_RE=/[_\s-]+(normal|survol|hover|presse|pressed|press|clic|click|active)$/i;
const stateOf=(raw:string):State=>{const w=raw.toLowerCase();return w==='survol'||w==='hover'?'hover':w==='normal'?'normal':'pressed';};
const cleanName=(n:string)=>n.replace(/\.(png|webp|svg|jpe?g|gif)$/i,'');

export function buildIconSets(icons:CustomIcon[]):IconSet[]{
  const map=new Map<string,IconSet>();
  for(const icon of icons){
    const base=cleanName(icon.name);
    const match=STATE_RE.exec(base);
    const key=(match?base.slice(0,match.index):base).toLowerCase();
    const label=(match?base.slice(0,match.index):base).replace(/[_-]+/g,' ').trim()||base;
    const set=map.get(key)??{key,name:label,ids:[]};
    const st:State=match?stateOf(match[1]):'normal';
    if(!set[st])set[st]=icon;else if(st!=='normal'||set.normal)set.ids.push(icon.id);
    if(!set.ids.includes(icon.id))set.ids.push(icon.id);
    map.set(key,set);
  }
  // Un jeu sans « normal » reprend le premier état disponible comme aperçu principal.
  return [...map.values()];
}

/* ---- Couleur dominante → famille ---- */
type Family={id:string;label:string;swatch:string;order:number};
const FAMILIES:Family[]=[
  {id:'rouge',label:'Rouge',swatch:'#e5484d',order:1},{id:'orange',label:'Orange',swatch:'#f5842b',order:2},{id:'jaune',label:'Jaune',swatch:'#f4c430',order:3},
  {id:'vert',label:'Vert',swatch:'#3fae5a',order:4},{id:'turquoise',label:'Turquoise',swatch:'#2bb3b3',order:5},{id:'bleu',label:'Bleu',swatch:'#3b82f6',order:6},
  {id:'violet',label:'Violet',swatch:'#8b5cf6',order:7},{id:'rose',label:'Rose',swatch:'#ec6aa5',order:8},{id:'marron',label:'Marron',swatch:'#9a6b43',order:9},
  {id:'noir',label:'Noir',swatch:'#1d232b',order:10},{id:'gris',label:'Gris',swatch:'#9aa5ae',order:11},{id:'blanc',label:'Blanc',swatch:'#f2f4f5',order:12}
];
const familyById=new Map(FAMILIES.map(f=>[f.id,f]));
function classify(r:number,g:number,b:number):string{
  const max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255,l=(max+min)/2,d=max-min;
  const s=d===0?0:d/(1-Math.abs(2*l-1));
  if(s<.18||l<.12||l>.92){return l<.25?'noir':l>.82?'blanc':'gris';}
  let h=0;const R=r/255,G=g/255,B=b/255;
  if(max===R)h=((G-B)/d)%6;else if(max===G)h=(B-R)/d+2;else h=(R-G)/d+4;
  h=(h*60+360)%360;
  if(l<.34&&h>=10&&h<50)return 'marron';
  if(h<15||h>=345)return 'rouge';if(h<45)return 'orange';if(h<70)return 'jaune';if(h<165)return 'vert';
  if(h<200)return 'turquoise';if(h<255)return 'bleu';if(h<300)return 'violet';return 'rose';
}
const cache=new Map<string,string>();
function dominantFamily(dataUrl:string):Promise<string>{
  const hit=cache.get(dataUrl.length+':'+dataUrl.slice(-40));
  if(hit)return Promise.resolve(hit);
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      try{
        const size=28,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        if(!ctx){resolve('gris');return;}
        ctx.drawImage(img,0,0,size,size);
        const data=ctx.getImageData(0,0,size,size).data;
        // Couleur la plus présente parmi les pixels opaques, en privilégiant les teintes vives.
        const votes=new Map<string,number>();
        for(let i=0;i<data.length;i+=4){
          if(data[i+3]<140)continue;
          const fam=classify(data[i],data[i+1],data[i+2]);
          const mx=Math.max(data[i],data[i+1],data[i+2]),mn=Math.min(data[i],data[i+1],data[i+2]);
          const weight=fam==='gris'||fam==='blanc'||fam==='noir'?.35:1+(mx-mn)/255;
          votes.set(fam,(votes.get(fam)??0)+weight);
        }
        const best=[...votes.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]??'gris';
        cache.set(dataUrl.length+':'+dataUrl.slice(-40),best);resolve(best);
      }catch{resolve('gris');}
    };
    img.onerror=()=>resolve('gris');
    img.src=dataUrl;
  });
}

export function IconLibrary({icons,onImport,onDeleteSet,applyLabel,onApply}:{
  icons:CustomIcon[];onImport:()=>void;onDeleteSet:(ids:string[],name:string)=>void;
  applyLabel?:string;onApply?:(set:IconSet)=>void;
}){
  const sets=useMemo(()=>buildIconSets(icons),[icons]);
  const [families,setFamilies]=useState<Record<string,string>>({});
  const [filter,setFilter]=useState<string|null>(null);
  useEffect(()=>{
    let dead=false;
    (async()=>{
      const next:Record<string,string>={};
      for(const set of sets){
        const main=set.normal??set.hover??set.pressed;
        if(main)next[set.key]=await dominantFamily(main.dataUrl);
      }
      if(!dead)setFamilies(next);
    })();
    return ()=>{dead=true;};
  },[sets]);
  const present=useMemo(()=>FAMILIES.filter(f=>sets.some(set=>families[set.key]===f.id)),[sets,families]);
  const shown=useMemo(()=>sets.filter(set=>!filter||families[set.key]===filter)
    .sort((a,b)=>(familyById.get(families[a.key])?.order??99)-(familyById.get(families[b.key])?.order??99)||a.name.localeCompare(b.name,'fr')),[sets,families,filter]);
  return <div className="nv-iconlib">
    <div className="nv-iconlib-bar">
      <button type="button" className="nv-iconlib-import" onClick={onImport}><Plus size={17}/> Importer des icônes</button>
      <span className="nv-iconlib-count">{sets.length} jeu{sets.length>1?'x':''} · {icons.length} icône{icons.length>1?'s':''}</span>
    </div>
    {present.length>1&&<div className="nv-iconlib-colors" role="group" aria-label="Filtrer par couleur">
      <button type="button" className={'nv-color-chip is-all'+(!filter?' is-on':'')} onClick={()=>setFilter(null)} aria-pressed={!filter}>Toutes</button>
      {present.map(f=><button type="button" key={f.id} className={'nv-color-chip'+(filter===f.id?' is-on':'')} aria-pressed={filter===f.id} title={f.label}
        style={{'--chip':f.swatch} as CSSProperties} onClick={()=>setFilter(filter===f.id?null:f.id)}><span aria-hidden="true"/><i>{f.label}</i></button>)}
    </div>}
    {applyLabel&&<p className="nv-iconlib-apply">Touche un jeu pour l’appliquer à : <b>{applyLabel}</b></p>}
    {!icons.length&&<p className="nv-iconlib-empty">Ta bibliothèque est vide. Importe tes icônes (normal, survol, pressé) : elles seront rangées par jeu et par couleur.</p>}
    <div className="nv-iconlib-grid">
      {shown.map(set=><div key={set.key} className={'nv-iconset'+(onApply?' is-clickable':'')}>
        <button type="button" className="nv-iconset-main" disabled={!onApply} onClick={()=>onApply?.(set)} title={onApply?'Appliquer ce jeu':set.name}>
          <span className="nv-iconset-states">
            {(['normal','hover','pressed'] as const).map(st=><span key={st} className="nv-iconset-state">
              <span className="nv-iconset-img">{set[st]?<img src={set[st]!.dataUrl} alt="" draggable={false}/>:<em>—</em>}</span>
              <small>{st==='normal'?'Normal':st==='hover'?'Survol':'Pressé'}</small>
            </span>)}
          </span>
          <strong title={set.name}>{set.name}</strong>
        </button>
        <button type="button" className="nv-iconset-del" aria-label={'Supprimer '+set.name} title="Supprimer ce jeu" onClick={()=>onDeleteSet(set.ids,set.name)}><Trash2 size={14}/></button>
      </div>)}
    </div>
  </div>;
}
