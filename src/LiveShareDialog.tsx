import {useEffect,useState} from 'react';
import {Users,X} from 'lucide-react';
import {getWriteState,listMembers,readLink,supabase} from './cloud';

/** « Partager l'écran avec… » : on choisit la ou les personnes du projet à inviter. */
type Person={email:string;role:string};
const name=(email:string)=>email.split('@')[0];

export function LiveShareDialog({onStart,onClose}:{onStart:(emails:string[])=>void;onClose:()=>void}){
  const [people,setPeople]=useState<Person[]|null>(null);
  const [chosen,setChosen]=useState<Set<string>>(new Set());
  const [error,setError]=useState('');
  useEffect(()=>{
    let dead=false;
    (async()=>{
      const link=readLink();
      if(!link){setError('Ouvre d’abord le projet depuis le Cloud pour partager ton écran.');setPeople([]);return;}
      try{
        const {data}=await supabase().auth.getSession();
        const me=(data.session?.user?.email??'').toLowerCase();
        let list:Person[]=[];
        const state=await getWriteState(link.projectId);
        if(state){
          list=state.participants.map(p=>({email:p.email,role:p.owner?'Propriétaire':p.role==='admin'?'Admin':'Collaborateur'}));
        }else{
          list=(await listMembers(link.projectId)).map(m=>({email:m.email,role:'Collaborateur'}));
        }
        if(!dead)setPeople(list.filter(p=>p.email&&p.email!==me));
      }catch(e){if(!dead){setError(e instanceof Error?e.message:String(e));setPeople([]);}}
    })();
    return ()=>{dead=true;};
  },[]);
  const toggle=(email:string)=>setChosen(cur=>{const next=new Set(cur);if(next.has(email))next.delete(email);else next.add(email);return next;});
  return <div className="overlay nv-liveshare-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="nv-liveshare" role="dialog" aria-modal="true" aria-label="Partager l’écran avec…">
      <header><div><strong><Users size={18}/> Partager l’écran avec…</strong><small>La personne reçoit une invitation dans son NovaStudio ouvert sur ce projet.</small></div>
        <button type="button" onClick={onClose} aria-label="Fermer"><X size={20}/></button></header>
      {people===null&&<p className="nv-liveshare-info">Chargement des participants…</p>}
      {error&&<p className="nv-liveshare-error">{error}</p>}
      {people&&people.length>0&&<div className="nv-liveshare-list" role="group" aria-label="Participants">
        {people.map(p=><button type="button" key={p.email} aria-pressed={chosen.has(p.email)} className={'nv-liveshare-person'+(chosen.has(p.email)?' is-on':'')} onClick={()=>toggle(p.email)}>
          <span className="nv-liveshare-check" aria-hidden="true">{chosen.has(p.email)?'✓':''}</span>
          <span><b>{name(p.email)}</b><small>{p.email}</small></span><em>{p.role}</em>
        </button>)}
      </div>}
      {people&&people.length===0&&!error&&<p className="nv-liveshare-info">Personne d’autre n’est invité sur ce projet. Invite d’abord quelqu’un depuis Menu › Partager › Invitations.</p>}
      <div className="nv-liveshare-actions">
        <button type="button" className="nv-liveshare-start" disabled={!people} onClick={()=>onStart([...chosen])}>
          {chosen.size?'Partager et inviter '+chosen.size+' personne'+(chosen.size>1?'s':''):'Démarrer sans inviter'}
        </button>
      </div>
    </section>
  </div>;
}
