import {useCallback,useEffect,useRef,useState} from 'react';
import {cloudConfigured,getWriteState,readLink,setWriteHolder,supabase,type WriteState} from './cloud';

/**
 * « Qui a la main ? » — indicateur en haut de l'éditeur pour les visites partagées dans le Cloud.
 * Une seule personne à la fois peut enregistrer (contrôle côté Supabase : même une ancienne fenêtre ouverte est refusée).
 * Le propriétaire peut transmettre, reprendre ou libérer la main ; la personne qui l'a peut la transmettre à un autre participant.
 */
const name=(email:string|null)=>email?email.split('@')[0]:'tout le monde';

export function WriteHand({onStatus}:{onStatus:(m:string)=>void}){
  const [projectId,setProjectId]=useState<string|null>(()=>readLink()?.projectId??null);
  const [state,setState]=useState<WriteState|null>(null);
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [denied,setDenied]=useState<{holderEmail:string|null}|null>(null);
  const alive=useRef(true);
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);

  const refresh=useCallback(async()=>{
    const id=readLink()?.projectId??null;
    setProjectId(cur=>cur===id?cur:id);
    if(!id||!cloudConfigured){setState(null);return;}
    try{
      const {data}=await supabase().auth.getSession();
      if(!data.session){setState(null);return;}
      const next=await getWriteState(id);
      if(alive.current)setState(next);
    }catch{/* réseau coupé : on garde l'état précédent */}
  },[]);

  useEffect(()=>{
    void refresh();
    const timer=window.setInterval(()=>void refresh(),20000);
    const onFocus=()=>void refresh();
    const onDenied=(e:Event)=>{
      setDenied({holderEmail:(e as CustomEvent<{holderEmail:string|null}>).detail?.holderEmail??null});
      void refresh();
    };
    window.addEventListener('focus',onFocus);
    window.addEventListener('nv-write-denied',onDenied);
    window.addEventListener('storage',onFocus);
    return ()=>{window.clearInterval(timer);window.removeEventListener('focus',onFocus);window.removeEventListener('nv-write-denied',onDenied);window.removeEventListener('storage',onFocus);};
  },[refresh]);

  async function give(email:string|null,message:string){
    if(!projectId||!state)return;
    setBusy(true);setError('');
    try{
      const next=await setWriteHolder(projectId,email,state.revision);
      setState(next);onStatus(message);setDenied(null);
    }catch(e){setError(e instanceof Error?e.message:String(e));void refresh();}
    finally{setBusy(false);}
  }

  if(!projectId||!state)return denied?<DeniedDialog holder={denied.holderEmail} state={null} busy={busy} error={error} onClose={()=>setDenied(null)} onTake={()=>{}}/>:null;
  const holder=state.holderEmail;
  const mine=holder===state.myEmail;
  const label=holder===null?'Tout le monde':mine?'Moi':name(holder);
  const people=state.participants;
  return <>
    <div className="nv-hand">
      <button type="button" className={'nv-hand-chip'+(holder===null?' is-free':mine?' is-mine':' is-other')} onClick={()=>setOpen(v=>!v)} aria-expanded={open}
        title="Qui peut enregistrer cette visite dans le Cloud ?">
        <span aria-hidden="true">✍</span> La main : <b>{label}</b>
      </button>
      {open&&<div className="nv-hand-pop" role="dialog" aria-label="Qui a la main pour enregistrer ?">
        <div className="nv-hand-head"><b>Qui enregistre ?</b><button type="button" className="quiet" onClick={()=>setOpen(false)} aria-label="Fermer">✕</button></div>
        <p>Une seule personne à la fois peut enregistrer dans le Cloud. {holder===null?'Pour l’instant, tout participant peut enregistrer.':mine?'C’est vous : les autres voient une fenêtre s’ils essaient d’enregistrer.':'Vous pouvez travailler, mais vous ne pouvez pas enregistrer tant que la main ne vous est pas transmise.'}</p>
        <ul>
          {people.map(p=>{
            const isHolder=p.email===holder;
            const isMe=p.email===state.myEmail;
            return <li key={p.email}>
              <span><b>{name(p.email)}{isMe?' (moi)':''}</b><small>{p.email}{p.owner?' · propriétaire':''}{isHolder?' · a la main':''}</small></span>
              {state.canManage&&!isHolder&&<button type="button" disabled={busy} onClick={()=>void give(p.email,isMe?'Vous avez repris la main.':'La main est transmise à '+name(p.email)+'.')}>{isMe?'Reprendre la main':'Donner la main'}</button>}
            </li>;
          })}
        </ul>
        {state.isOwner&&holder!==null&&<button type="button" className="quiet" disabled={busy} onClick={()=>void give(null,'La main est libérée : tout participant peut enregistrer.')}>Libérer (tout le monde peut enregistrer)</button>}
        {error&&<p className="warning">{error}</p>}
      </div>}
    </div>
    {denied&&<DeniedDialog holder={denied.holderEmail??holder} state={state} busy={busy} error={error} onClose={()=>setDenied(null)}
      onTake={()=>void give(state.myEmail,'Vous avez repris la main.')}/>}
  </>;
}

function DeniedDialog({holder,state,busy,error,onClose,onTake}:{holder:string|null;state:WriteState|null;busy:boolean;error:string;onClose:()=>void;onTake:()=>void}){
  return <div className="overlay nv-hand-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="modal nv-hand-denied" role="alertdialog" aria-modal="true" aria-label="Enregistrement impossible">
      <h2>✍ {holder?name(holder)+' a la main':'Une autre personne a la main'}</h2>
      <p>Vous ne pouvez pas enregistrer pour le moment : la main sur cette visite est à <b>{holder??'une autre personne'}</b>. Demandez-lui de vous la transmettre (bouton « La main » en haut). <b>Vos modifications restent sur cet appareil</b>, rien n’est perdu.</p>
      {state?.isOwner&&<p>En tant que propriétaire, vous pouvez la reprendre.</p>}
      {error&&<p className="warning">{error}</p>}
      <div className="nv-hand-actions">
        {state?.isOwner&&<button type="button" className="primary" disabled={busy} onClick={onTake}>Reprendre la main</button>}
        <button type="button" onClick={onClose}>J’ai compris</button>
      </div>
    </section>
  </div>;
}
