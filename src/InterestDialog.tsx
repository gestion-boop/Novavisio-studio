import {useMemo} from 'react';
import {INTEREST_CATEGORIES,buildSuggestions,type InterestCategory,type VerifiedInfo,type Suggestion} from './interestPoints';
import {XMark} from './XMark';
import './interestDialog.css';

const FIELDS:Array<{key:keyof VerifiedInfo;label:string;list?:boolean}>=[
  {key:'phone',label:'Téléphone'},{key:'email',label:'E-mail'},{key:'bookingUrl',label:'Lien de réservation'},
  {key:'address',label:'Adresse'},{key:'website',label:'Site internet'},{key:'menuUrl',label:'Lien de la carte'},
  {key:'tariffUrl',label:'Lien des tarifs'},{key:'openingHours',label:'Horaires'},
  {key:'services',label:'Services (un par ligne)',list:true},{key:'specialties',label:'Spécialités (une par ligne)',list:true},
  {key:'activities',label:'Activités (une par ligne)',list:true},{key:'equipments',label:'Équipements (un par ligne)',list:true},
  {key:'rooms',label:'Pièces (une par ligne)',list:true},{key:'surfaces',label:'Surfaces'},
  {key:'pool',label:'Piscine (oui / non, précisions)'},{key:'accessibility',label:'Accessibilité'}
];
const toText=(v:unknown)=>Array.isArray(v)?v.join('\n'):typeof v==='string'?v:'';
const fromText=(v:string,list?:boolean)=>list?v.split('\n').map(x=>x.trim()).filter(Boolean):v;

/**
 * Points d'information (phase 4). Tu saisis les informations VÉRIFIÉES ; l'écran ne propose que les points
 * correspondants. Rien n'est publié : « Confirmer » et « Placer » sont les seules actions qui gardent un point.
 */
export function InterestDialog({category,info,points,canPlace,onPatch,onPlace,onClose}:{
  category?:InterestCategory;info:VerifiedInfo;points:Suggestion[];canPlace:boolean;
  onPatch:(patch:{category?:InterestCategory;info?:VerifiedInfo;points?:Suggestion[]})=>void;
  onPlace:(s:Suggestion)=>void;onClose:()=>void;
}){
  const cat=category??'autre';
  const {ready,missing}=useMemo(()=>buildSuggestions(cat,info),[cat,info]);
  const statusOf=(id:string)=>points.find(p=>p.id===id)?.status??'proposed';
  const setStatus=(s:Suggestion,status:Suggestion['status'])=>{
    const rest=points.filter(p=>p.id!==s.id);onPatch({points:[...rest,{...s,status}]});
  };
  const visible=ready.map(s=>({...s,status:statusOf(s.id)}));
  return <div className="overlay nv-interest-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="modal nv-interest-dialog" role="dialog" aria-modal="true" aria-label="Points d’information">
      <button className="close" onClick={onClose} aria-label="Fermer"><XMark/></button>
      <h2>Points d’information <small>NovaStudio AI · phase 4</small></h2>
      <p className="hint">Saisis seulement ce qui est vérifié. Un point n’apparaît que si son information existe. Rien n’est publié sans ta confirmation.</p>
      <label>Activité
        <select value={cat} onChange={e=>onPatch({category:e.target.value as InterestCategory})}>
          {INTEREST_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      <details className="nv-interest-info">
        <summary>Informations vérifiées ({Object.keys(info).length})</summary>
        {FIELDS.map(f=><label key={f.key}>{f.label}
          {f.list?<textarea rows={2} value={toText(info[f.key])} onChange={e=>onPatch({info:{...info,[f.key]:fromText(e.target.value,true)}})}/>
            :<input value={toText(info[f.key])} onChange={e=>onPatch({info:{...info,[f.key]:fromText(e.target.value)}})}/>}
        </label>)}
      </details>

      <h3 className="nv-interest-h3">Points proposés ({visible.filter(v=>v.status==='proposed').length})</h3>
      {!visible.length&&<p className="hint-inline">Aucun point prêt : complète les informations vérifiées ci-dessus.</p>}
      <ul className="nv-interest-list">
        {visible.map(s=><li key={s.id} className={'is-'+s.status}>
          <span><b>{s.title}</b><small>{s.kind==='link'?'Lien':s.kind==='phone'?'Téléphone':s.kind==='map'?'Localisation':s.kind==='navigate'?'Navigation':'Texte'} · {s.status==='proposed'?'à valider':s.status==='confirmed'?'confirmé':'refusé'}</small></span>
          <div className="nv-interest-actions">
            {s.status!=='rejected'&&<button type="button" className="quiet" onClick={()=>setStatus(s,'confirmed')}>Confirmer</button>}
            {s.status!=='rejected'&&<button type="button" className="quiet" disabled={!canPlace} title={canPlace?'Crée le point à la position actuelle de la caméra':'Ouvre d’abord un panorama et oriente la vue'} onClick={()=>{onPlace(s);setStatus(s,'confirmed');}}>Placer ici</button>}
            {s.status!=='rejected'&&<button type="button" className="quiet" onClick={()=>setStatus(s,'rejected')}>Refuser</button>}
            {s.status==='rejected'&&<button type="button" className="quiet" onClick={()=>setStatus(s,'proposed')}>Rétablir</button>}
          </div>
        </li>)}
      </ul>

      {missing.length>0&&<><h3 className="nv-interest-h3">À compléter ({missing.length})</h3>
        <ul className="nv-interest-missing">{missing.map(m=><li key={m.key}><b>{m.title}</b> <small>— il manque : {m.needs.map(n=>FIELDS.find(f=>f.key===n)?.label??n).join(', ')}</small></li>)}</ul></>}
    </section>
  </div>;
}
