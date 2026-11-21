import {useMemo,useState} from 'react';
import {supabase,readLink,cloudConfigured} from './cloud';
import {summarizeProject} from './projectSummary';
import type {StudioProject} from './storage';
import {XMark} from './XMark';
import './projectSummary.css';

const ICON={ok:'✓',todo:'⚠',info:'·'} as const;
/** Synthèse avant application (module 10) : lecture seule, aucune action qui modifie le projet. */
export function ProjectSummaryDialog({project,onClose,onPatch}:{project:StudioProject;onClose:()=>void;onPatch:(fn:(p:StudioProject)=>Partial<StudioProject>)=>void}){
  const lines=useMemo(()=>summarizeProject(project),[project]);
  const todo=lines.filter(l=>l.state==='todo').length;
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const langs=(project.languages??['fr']).filter(l=>l!=='fr').filter(l=>['en','es','de','nl'].includes(l)) as Array<'en'|'es'|'de'|'nl'>;
  const hasGaps=langs.some(l=>project.bottomBar.some(b=>b.title.trim()&&!b.titleTranslations?.[l])||project.scenes.some(s=>!s.nameTranslations?.[l]));
  const translate=async()=>{
    const projectId=readLink()?.projectId;
    if(!projectId){setMsg('Enregistre d’abord le projet dans le Cloud : la traduction passe par le serveur.');return;}
    const items=[
      ...project.bottomBar.filter(b=>b.title.trim()).map(b=>({id:'bar:'+b.id,text:b.title})),
      ...project.scenes.map(s=>({id:'scene:'+s.id,text:s.name}))
    ];
    setBusy(true);setMsg('Traduction en cours…');
    try{
      const {data,error}=await supabase().functions.invoke('nova-ai-translate',{body:{projectId,langs,items,protected:[project.name,project.clientProfile?.name].filter(Boolean)}});
      if(error||!data?.translations)throw new Error(error?.message??data?.error??'traduction impossible');
      const tr=data.translations as Record<string,Record<string,string>>;
      onPatch(p=>({
        bottomBar:p.bottomBar.map(b=>({...b,titleTranslations:{...(b.titleTranslations??{}),...(tr['bar:'+b.id]??{})}})),
        scenes:p.scenes.map(s=>({...s,nameTranslations:{...(s.nameTranslations??{}),...(tr['scene:'+s.id]??{})}})),
        translationsValidated:false
      }));
      setMsg('Traductions ajoutées. Relis-les, puis valide-les.');
    }catch(e){
      const m=e instanceof Error?e.message:String(e);
      setMsg(/daily_limit/.test(m)?'Limite quotidienne de traductions atteinte. Réessaie demain.':'Traduction impossible : '+m);
    }finally{setBusy(false);}
  };
  return <div className="overlay nv-summary-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="modal nv-summary-dialog" role="dialog" aria-modal="true" aria-label="Synthèse du projet">
      <button className="close" onClick={onClose} aria-label="Fermer"><XMark/></button>
      <h2>Synthèse avant publication <small>NovaStudio AI</small></h2>
      <p className="hint">{todo?`${todo} point(s) à vérifier avant de publier.`:'Rien à vérifier : le projet est complet.'} Cette fenêtre ne modifie rien.</p>
      <ul className="nv-summary-list">
        {lines.map(l=><li key={l.id} className={'is-'+l.state}>
          <span className="nv-summary-ico" aria-hidden="true">{ICON[l.state]}</span>
          <span><b>{l.label}</b><small>{l.detail}</small></span>
        </li>)}
      </ul>
      {langs.length>0&&<div className="nv-summary-actions">
        {hasGaps&&<button type="button" className="primary" disabled={busy||!cloudConfigured} onClick={()=>void translate()}>{busy?'Traduction…':'Traduire automatiquement'}</button>}
        {!hasGaps&&project.translationsValidated!==true&&<button type="button" className="primary" onClick={()=>onPatch(()=>({translationsValidated:true}))}>Valider les traductions</button>}
      </div>}
      {msg&&<p className="hint-inline" role="status">{msg}</p>}
    </section>
  </div>;
}
