import {useEffect,useState} from 'react';
import {Download,Share2,X} from 'lucide-react';
import {addMember,saveToCloud,cloudConfigured,listCloudProjects,openCloudProject,saveWorking,readLink,type CloudProject} from './cloud';
import {loadParticipants,type Person} from './LiveShareDialog';
import {readSpaceCloudLink,writeSpaceCloudLink,projectForSpaceExport,type StudioSpace} from './spaces';
import {exportSpacesProject,mergeImportedSpaces} from './spaceTransfer';
import {projectJsonParts,type StudioProject} from './storage';

/**
 * Actions sur plusieurs espaces à la fois :
 *  - « share » : donner accès à ces espaces à un ou plusieurs membres (chaque espace devient une visite Cloud isolée) ;
 *  - « transfer » : emporter ces espaces dans un fichier pour les importer dans un autre projet (copie ou déplacement).
 */
export function SpacesActions({mode,project,spaces,onClose,onStatus,onMoved}:{
  mode:'share'|'transfer';project:StudioProject;spaces:StudioSpace[];onClose:()=>void;onStatus:(m:string)=>void;onMoved:(ids:string[])=>void;
}){
  const [people,setPeople]=useState<Person[]|null>(null);
  const [error,setError]=useState('');
  const [chosen,setChosen]=useState<Set<string>>(new Set());
  const [extra,setExtra]=useState('');
  const [busy,setBusy]=useState('');
  const [done,setDone]=useState('');
  const [move,setMove]=useState(false);
  // Envoi direct vers un autre projet du Cloud (sans fichier)
  const [targets,setTargets]=useState<CloudProject[]|null>(null);
  const [targetId,setTargetId]=useState('');
  useEffect(()=>{
    if(mode!=='transfer')return;
    let dead=false;
    if(!cloudConfigured){setTargets([]);return;}
    listCloudProjects().then(list=>{if(!dead){const here=readLink()?.projectId;setTargets(list.filter(p=>p.id!==here));}}).catch(()=>{if(!dead)setTargets([]);});
    return ()=>{dead=true;};
  },[mode]);
  useEffect(()=>{
    if(mode!=='share')return;
    let dead=false;
    if(!cloudConfigured){setPeople([]);setError('Le Cloud n’est pas configuré sur ce déploiement.');return;}
    loadParticipants().then(r=>{if(!dead)setPeople(r.people);}).catch(e=>{if(!dead){setPeople([]);setError(e instanceof Error?e.message:String(e));}});
    return ()=>{dead=true;};
  },[mode]);
  const toggle=(email:string)=>setChosen(cur=>{const n=new Set(cur);if(n.has(email))n.delete(email);else n.add(email);return n;});
  const names=spaces.map(space=>space.name).join(', ');

  async function share(){
    const emails=new Set(chosen);
    const typed=extra.trim().toLowerCase();
    if(typed){if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(typed)){setError('Adresse e-mail non valide.');return;}emails.add(typed);}
    if(!emails.size){setError('Choisis au moins une personne.');return;}
    setError('');setDone('');
    try{
      let count=0;
      for(const space of spaces){
        setBusy('Envoi de l’espace « '+space.name+' » dans le Cloud…');
        const saved=await saveToCloud(projectForSpaceExport(project,space),readSpaceCloudLink(space.id,'private'),setBusy);
        writeSpaceCloudLink(space.id,'private',saved);
        for(const email of emails){setBusy('Accès de '+email+' à « '+space.name+' »…');await addMember(saved.projectId,email,true);count++;}
      }
      setDone(spaces.length+' espace'+(spaces.length>1?'s':'')+' partagé'+(spaces.length>1?'s':'')+' avec '+emails.size+' personne'+(emails.size>1?'s':'')+' ('+count+' accès). Elle'+(emails.size>1?'s':'')+' les retrouve dans « Visites dans le cloud ».');
      onStatus('Espaces partagés : '+names);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy('');}
  }
  async function sendDirect(){
    const target=targets?.find(t=>t.id===targetId);
    if(!target){setError('Choisis le projet de destination.');return;}
    setError('');setDone('');
    try{
      const pack=exportSpacesProject(project,spaces);
      setBusy('Ouverture du projet « '+target.name+' »…');
      const opened=await openCloudProject(target.id,setBusy);
      const merged=mergeImportedSpaces(opened.project,pack);
      setBusy('Envoi des espaces dans « '+target.name+' »…');
      await saveWorking(merged.project,opened.link,setBusy);
      setDone(spaces.length+' espace'+(spaces.length>1?'s':'')+' ajouté'+(spaces.length>1?'s':'')+' au projet « '+target.name+' » ('+merged.scenes+' panorama'+(merged.scenes>1?'s':'')+' copié'+(merged.scenes>1?'s':'')+'). Ouvre ce projet pour les retrouver.');
      onStatus('Espaces envoyés dans « '+target.name+' » : '+names);
      if(move&&window.confirm('Retirer ces '+spaces.length+' espace(s) de ce projet ? Les panoramas restent dans le projet complet.'))onMoved(spaces.map(space=>space.id));
    }catch(e){setError((e instanceof Error?e.message:String(e))+' — rien n’a été retiré de ce projet.');}
    finally{setBusy('');}
  }
  function transfer(){
    setError('');
    try{
      const pack=exportSpacesProject(project,spaces);
      const blob=new Blob(projectJsonParts(pack),{type:'application/json'});
      if(blob.size>450*1024*1024){setError('Ces espaces pèsent '+Math.round(blob.size/1048576)+' Mo : trop gros pour un fichier (le navigateur ne pourrait pas le relire). Utilise « Envoyer directement dans un projet du Cloud ».');return;}
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;
      a.download=(names.replace(/[^a-zA-Z0-9-]+/g,'_').slice(0,60)||'espaces')+'.nvspaces.json';
      document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
      if(move&&window.confirm('Retirer ces '+spaces.length+' espace(s) de ce projet ? Les panoramas restent dans le projet complet.'))onMoved(spaces.map(space=>space.id));
      setDone('Fichier téléchargé. Ouvre l’autre projet, puis clique sur « Importer des espaces » dans la barre des espaces.');
      onStatus('Fichier d’espaces téléchargé : '+names);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  return <div className="overlay nv-spacesact-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="nv-spacesact" role="dialog" aria-modal="true" aria-label={mode==='share'?'Partager des espaces':'Envoyer des espaces vers un autre projet'}>
      <header><div><strong>{mode==='share'?<><Share2 size={18}/> Partager {spaces.length} espace{spaces.length>1?'s':''}</>:<><Download size={18}/> Envoyer {spaces.length} espace{spaces.length>1?'s':''} vers un autre projet</>}</strong>
        <small>{names}</small></div><button type="button" onClick={onClose} aria-label="Fermer"><X size={20}/></button></header>
      {mode==='share'?<>
        <p className="nv-spacesact-info">Chaque espace est envoyé dans le Cloud comme une visite indépendante : la personne n’a accès qu’aux espaces choisis, pas au reste du projet.</p>
        <div className="nv-spacesact-people" role="group" aria-label="Personnes">
          {people===null&&<small>Chargement…</small>}
          {people&&people.map(p=><button type="button" key={p.email} aria-pressed={chosen.has(p.email)} className={'nv-liveshare-person'+(chosen.has(p.email)?' is-on':'')} onClick={()=>toggle(p.email)}>
            <span className="nv-liveshare-check" aria-hidden="true">{chosen.has(p.email)?'✓':''}</span><span><b>{p.email.split('@')[0]}</b><small>{p.email}</small></span><em>{p.role}</em></button>)}
        </div>
        <label className="nv-spacesact-extra">Ou une autre adresse e-mail<input type="email" value={extra} placeholder="prenom@exemple.fr" onChange={e=>setExtra(e.target.value)}/></label>
        <p className="nv-spacesact-info small">La personne doit avoir un compte NovaStudio (créé via Menu › Partager › Invitations et lien privé).</p>
      </>:<>
        <p className="nv-spacesact-info"><b>Envoi direct (recommandé)</b> : choisis le projet du Cloud qui doit recevoir ces espaces. Les panoramas, points et icônes sont copiés tout seuls, sans fichier à télécharger.</p>
        <div className="nv-spacesact-people" role="radiogroup" aria-label="Projet de destination">
          {targets===null&&<small>Chargement de tes projets…</small>}
          {targets&&!targets.length&&<small>Aucun autre projet dans ton Cloud (ou Cloud non connecté).</small>}
          {targets&&targets.map(t=><button type="button" role="radio" aria-checked={targetId===t.id} key={t.id} className={'nv-liveshare-person'+(targetId===t.id?' is-on':'')} onClick={()=>setTargetId(t.id)}>
            <span className="nv-liveshare-check" aria-hidden="true">{targetId===t.id?'●':''}</span><span><b>{t.name||'Visite sans nom'}</b><small>modifié le {new Date(t.updated_at||t.created_at).toLocaleDateString('fr-FR')}</small></span>{t.shared&&<em>partagé</em>}</button>)}
        </div>
        <label className="nv-spacesact-check"><input type="checkbox" checked={move} onChange={e=>setMove(e.target.checked)}/> Déplacer : retirer ces espaces de ce projet après l’envoi (sinon ils sont copiés)</label>
        <p className="nv-spacesact-info small">Pour les envoyer vers un projet d’un autre compte ou hors ligne, tu peux aussi télécharger un fichier (limité aux espaces de moins de 450 Mo).</p>
      </>}
      {error&&<p className="nv-spacesact-error" role="alert">{error}</p>}
      {busy&&<p className="nv-spacesact-info" role="status">⏳ {busy}</p>}
      {done&&<p className="nv-spacesact-ok" role="status">✓ {done}</p>}
      <div className="nv-spacesact-actions">
        <button type="button" onClick={onClose}>Fermer</button>
        {mode==='share'?<button type="button" className="is-primary" disabled={!!busy} onClick={()=>void share()}><Share2 size={16}/> Partager</button>
          :<><button type="button" disabled={!!busy} onClick={transfer}><Download size={16}/> Télécharger un fichier</button>
            <button type="button" className="is-primary" disabled={!!busy||!targetId} onClick={()=>void sendDirect()}><Share2 size={16}/> Envoyer directement</button></>}
      </div>
    </section>
  </div>;
}
