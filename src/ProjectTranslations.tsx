import {useMemo,useState} from 'react';
import {PreparationDialog} from './PreparationControls';
import {readLink,supabase} from './cloud';
import {STUDIO_LANGUAGES,type StudioLanguage,type StudioProject} from './storage';
import {applyTranslationRows,translationRows,type TargetLanguage,type TranslationRow} from './projectTranslations';

export function ProjectTranslations({project,onApply,onClose}:{project:StudioProject;onApply:(fn:(p:StudioProject)=>StudioProject)=>void;onClose:()=>void}){
  const [selected,setSelected]=useState<StudioLanguage[]>(()=>['fr',...(project.languages??[]).filter(l=>l!=='fr')]);
  const [rows,setRows]=useState<TranslationRow[]|null>(null);
  const [replaceExisting,setReplaceExisting]=useState(false);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[generationProjectId,setGenerationProjectId]=useState<string|null>(null);
  const pending=useMemo(()=>translationRows(project,selected.filter((x):x is TargetLanguage=>x!=='fr')),[project,selected]);
  async function generate(){
    const link=readLink();
    const output=pending.map(r=>({...r}));
    const toGenerate=output.filter(r=>replaceExisting||!r.text.trim());
    if(!toGenerate.length){setGenerationProjectId(link?.projectId??null);setRows(output);setMessage('Relis et modifie les traductions avant de les appliquer.');return;}
    if(!link){setMessage('Ouvre ou enregistre d’abord le projet dans ton Cloud.');return;}
    setBusy(true);setMessage('');
    try{
      const {data:{session}}=await supabase().auth.getSession();if(!session)throw Error('Connecte-toi au Cloud pour traduire.');
      let count=0;
      for(const lang of selected.filter((x):x is TargetLanguage=>x!=='fr')){
        const subset=toGenerate.filter(r=>r.lang===lang);
        for(let offset=0;offset<subset.length;){
          const batch:TranslationRow[]=[];let length=0;
          while(offset<subset.length&&batch.length<20&&length+JSON.stringify(subset[offset].source).length<11000){const row=subset[offset++];batch.push(row);length+=JSON.stringify(row.source).length;}
          if(!batch.length)throw Error('Un texte est trop long pour être traduit.');
          setMessage('Traduction en cours : '+count+' / '+toGenerate.length+' textes…');
          const resp=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({projectId:link.projectId,lang,items:batch.map((r,i)=>({id:String(i),text:r.source}))})});
          const json=await resp.json().catch(()=>({}));if(!resp.ok)throw Error(json.error||'Service de traduction indisponible.');
          if(!Array.isArray(json.items)||json.items.length!==batch.length)throw Error('Réponse de traduction incomplète.');
          batch.forEach((r,i)=>{const value=json.items.find((item:{id:string})=>item.id===String(i))?.text;if(typeof value!=='string'||!value.trim())throw Error('Traduction incomplète.');r.text=value;});count+=batch.length;
        }
      }
      setGenerationProjectId(link.projectId);setRows(output);setMessage('Relis et modifie les traductions avant de les appliquer.');
    }catch(e){setMessage(e instanceof Error?e.message:'Impossible de traduire.');}finally{setBusy(false);}
  }
  const invalid=rows?.some(r=>!r.text.trim()||r.text.length>r.max)??false;
  return <PreparationDialog title="Traduire la visite" onClose={busy?()=>{}:onClose}>
    <div className="nv-preparation-content nv-translate-content">
      {!rows?<>
        <p>Choisis les langues, puis génère des propositions pour les textes français de la visite : noms des panoramas et espaces, boutons, galeries et informations.</p>
        <div className="nv-setup-languages">{STUDIO_LANGUAGES.map(l=><label key={l.code}><input type="checkbox" checked={selected.includes(l.code)} disabled={busy||l.code==='fr'} onChange={e=>setSelected(current=>e.target.checked?[...current,l.code]:current.filter(x=>x!==l.code))}/><span>{l.flag}</span>{l.name}</label>)}</div>
        <small>Les traductions déjà renseignées sont conservées et pourront aussi être relues. Les pages externes, images et vidéos ne sont pas modifiées. Les textes sont envoyés au service de traduction pour créer les propositions.</small>
        <label><input type="checkbox" checked={replaceExisting} disabled={busy} onChange={e=>setReplaceExisting(e.target.checked)}/> Proposer aussi de nouvelles traductions pour les textes déjà traduits</label>
        <p>{pending.filter(r=>replaceExisting||!r.text.trim()).length} traduction{pending.filter(r=>replaceExisting||!r.text.trim()).length===1?'':'s'} à générer.</p>
        {pending.length?<button type="button" disabled={busy} onClick={()=>void generate()}>{busy?'Traduction en cours…':pending.some(r=>replaceExisting||!r.text.trim())?'Générer et relire':'Relire les traductions'}</button>:<button type="button" disabled={busy} onClick={()=>{onApply(p=>applyTranslationRows(p,[],selected));onClose();}}>Appliquer les langues sélectionnées</button>}
      </>:<>
        <p>Modifie les propositions si nécessaire. Rien n’est appliqué avant validation.</p>
        <div className="nv-translate-list">{rows.map((r,i)=><label key={r.key} className="nv-translate-row"><strong>{r.label} · {STUDIO_LANGUAGES.find(l=>l.code===r.lang)?.name}</strong><span>{r.source}</span><textarea value={r.text} rows={r.source.length>100?4:2} onChange={e=>setRows(current=>current?.map((row,n)=>n===i?{...row,text:e.target.value}:row)??null)}/>{r.text.length>r.max&&<small>Maximum : {r.max} caractères.</small>}</label>)}</div>
        <div className="nv-translate-actions"><button type="button" onClick={()=>{setRows(null);setMessage('');}}>Retour</button><button type="button" disabled={invalid} onClick={()=>{if((readLink()?.projectId??null)!==generationProjectId){setMessage('Le projet ouvert a changé. Ferme cette fenêtre et recommence.');return;}const latest=new Map(translationRows(project,selected.filter((l):l is TargetLanguage=>l!=='fr')).map(r=>[r.key,r]));if(rows.some(r=>{const now=latest.get(r.key);return !now||now.source!==r.source||now.original!==r.original;})){setMessage('Un texte a changé pendant la traduction. Reviens en arrière et relance les propositions.');return;}onApply(p=>applyTranslationRows(p,rows,selected));onClose();}}>Appliquer les traductions</button></div>
      </>}
      <p role="status">{message}</p>
    </div>
  </PreparationDialog>;
}
