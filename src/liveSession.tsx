import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';

/**
 * « Écran partagé » : deux personnes ouvrent le même projet Cloud et se voient travailler en direct.
 *  - la souris de chacun est visible chez l'autre (couleur et prénom différents) + un rond à chaque clic ;
 *  - un seul « pilote » à la fois : le panorama / l'espace qu'il ouvre s'affiche aussi chez l'autre (suivi, désactivable) ;
 *  - le pilotage se passe ou se prend d'un clic.
 * Ce sont uniquement des positions de souris et l'identifiant du panorama affiché : aucune donnée du projet ne transite, et
 * personne ne peut agir à la place de l'autre. Canal Supabase Realtime nommé d'après l'identifiant (secret) du projet.
 */
export type LiveState={sceneId:string;spaceId:string|null};
export type LiveView={sceneId:string;yaw:number;pitch:number;zoom:number};
type Meta={id:string;label:string;joinedAt:number};
type Cursor={x:number;y:number;t:number};
export type LivePeer=Meta&{color:string;cursor?:Cursor;pulse?:{x:number;y:number;t:number;label?:string}};

/** Transport minimal, remplaçable (Supabase Realtime en production). */
export type LiveTransport={
  send:(event:string,payload:unknown)=>void;
  on:(event:string,cb:(payload:any)=>void)=>void;
  join:(meta:Meta,onPeers:(peers:Meta[])=>void)=>void;
  close:()=>void;
};
const COLORS=['#2f80ed','#f2994a','#27ae60','#bb6bd9'];

async function supabaseTransport(projectId:string,selfId:string):Promise<LiveTransport>{
  const {supabase}=await import('./cloud');
  const channel=supabase().channel('nvlive:'+projectId,{config:{broadcast:{self:false},presence:{key:selfId}}});
  const handlers=new Map<string,(p:any)=>void>();
  return {
    send:(event,payload)=>{void channel.send({type:'broadcast',event,payload});},
    on:(event,cb)=>{handlers.set(event,cb);channel.on('broadcast',{event},({payload})=>cb(payload));},
    join:(meta,onPeers)=>{
      channel.on('presence',{event:'sync'},()=>{
        const state=channel.presenceState() as Record<string,Meta[]>;
        onPeers(Object.values(state).map(list=>list[list.length-1]).filter(Boolean));
      });
      channel.subscribe(async status=>{if(status==='SUBSCRIBED')await channel.track(meta);});
    },
    close:()=>{void supabase().removeChannel(channel);}
  };
}
function makeTransport(projectId:string,selfId:string):Promise<LiveTransport>{
  const custom=(window as unknown as {__nvLiveTransport?:(p:string,s:string)=>LiveTransport}).__nvLiveTransport;
  return custom?Promise.resolve(custom(projectId,selfId)):supabaseTransport(projectId,selfId);
}

export function useLiveSession(opts:{projectId:string|null;enabled:boolean;label:string;state:LiveState;onRemoteState:(s:LiveState)=>void;getView:()=>LiveView|null;onRemoteView:(v:LiveView)=>void;ui:string;onRemoteUi:(raw:string)=>void}){
  const selfId=useMemo(()=>Math.random().toString(36).slice(2,10),[]);
  const joinedAt=useRef(Date.now());
  const [peers,setPeers]=useState<LivePeer[]>([]);
  const [leaderId,setLeaderId]=useState<string|null>(null);
  const [follow,setFollow]=useState(true);
  const [error,setError]=useState('');
  const transport=useRef<LiveTransport|null>(null);
  const leaderRef=useRef<string|null>(null);leaderRef.current=leaderId;
  const followRef=useRef(follow);followRef.current=follow;
  const stateRef=useRef(opts.state);stateRef.current=opts.state;
  const remoteRef=useRef(opts.onRemoteState);remoteRef.current=opts.onRemoteState;
  const getViewRef=useRef(opts.getView);getViewRef.current=opts.getView;
  const remoteViewRef=useRef(opts.onRemoteView);remoteViewRef.current=opts.onRemoteView;
  const uiRef=useRef(opts.ui);uiRef.current=opts.ui;
  const remoteUiRef=useRef(opts.onRemoteUi);remoteUiRef.current=opts.onRemoteUi;
  const lastInput=useRef(0);                 // dernière action de l'utilisateur (clic, molette, clavier) hors barre de partage
  const [lastAction,setLastAction]=useState('');
  const {projectId,enabled,label}=opts;

  useEffect(()=>{
    if(!enabled||!projectId){setPeers([]);setLeaderId(null);return;}
    let closed=false;
    setError('');
    void makeTransport(projectId,selfId).then(t=>{
      if(closed){t.close();return;}
      transport.current=t;
      t.on('cursor',p=>{
        setPeers(list=>list.map(x=>x.id===p.id?{...x,cursor:{x:p.x,y:p.y,t:Date.now()}}:x));
      });
      t.on('click',p=>{
        setPeers(list=>list.map(x=>x.id===p.id?{...x,cursor:{x:p.x,y:p.y,t:Date.now()},pulse:{x:p.x,y:p.y,t:Date.now(),label:typeof p.label==='string'?p.label.slice(0,60):undefined}}:x));
      });
      t.on('hand',p=>{leaderRef.current=p.id;setLeaderId(p.id);}); // la référence est mise à jour tout de suite : le message suivant n'est pas ignoré
      t.on('release',p=>{setLeaderId(cur=>cur===p.id?null:cur);});
      t.on('state',p=>{
        if(p.id===leaderRef.current&&followRef.current&&p.sceneId)remoteRef.current({sceneId:p.sceneId,spaceId:p.spaceId??null});
      });
      t.on('view',p=>{
        if(p.id===leaderRef.current&&followRef.current&&typeof p.yaw==='number')remoteViewRef.current({sceneId:p.sceneId,yaw:p.yaw,pitch:p.pitch,zoom:p.zoom});
      });
      t.on('ui',p=>{ // panneaux ouverts (barre du bas, galerie, fenêtres d'information…)
        if(p.id===leaderRef.current&&followRef.current&&typeof p.ui==='string')remoteUiRef.current(p.ui);
      });
      t.on('hello',()=>{ // un nouvel arrivant demande qui pilote
        if(leaderRef.current===selfId){t.send('hand',{id:selfId});t.send('state',{id:selfId,...stateRef.current});t.send('ui',{id:selfId,ui:uiRef.current});}
      });
      t.join({id:selfId,label,joinedAt:joinedAt.current},list=>{
        const sorted=[...list].sort((a,b)=>a.joinedAt-b.joinedAt||a.id.localeCompare(b.id));
        setPeers(old=>sorted.map((m,i)=>({...m,color:COLORS[i%COLORS.length],cursor:old.find(o=>o.id===m.id)?.cursor,pulse:old.find(o=>o.id===m.id)?.pulse})));
        // Un départ libère le pilotage.
        setLeaderId(cur=>cur&&!sorted.some(m=>m.id===cur)?null:cur);
      });
      t.send('hello',{id:selfId});
    }).catch(e=>setError(e instanceof Error?e.message:String(e)));
    return ()=>{closed=true;transport.current?.send('release',{id:selfId});transport.current?.close();transport.current=null;setPeers([]);setLeaderId(null);};
  },[enabled,projectId,selfId,label]);

  // Souris et clics, en coordonnées relatives à la fenêtre (les écrans n'ont pas la même taille).
  useEffect(()=>{
    if(!enabled||!projectId)return;
    let last=0;
    const norm=(e:PointerEvent)=>({x:e.clientX/window.innerWidth,y:e.clientY/window.innerHeight});
    const move=(e:PointerEvent)=>{
      const now=performance.now();
      if(now-last<40)return;
      last=now;transport.current?.send('cursor',{id:selfId,...norm(e)});
    };
    const inBar=(e:Event)=>e.target instanceof Element&&!!e.target.closest('.nv-live-bar');
    const mark=(e:Event)=>{if(!inBar(e))lastInput.current=Date.now();};
    // Texte de l'élément cliqué (bouton, onglet, tuile…) : l'autre personne voit sur quoi on appuie.
    const labelOf=(e:Event)=>{
      const el=e.target instanceof Element?e.target.closest('button,[role=tab],[role=menuitem],a,label,summary,select,input'):null;
      if(!el)return undefined;
      const text=(el.getAttribute('aria-label')||el.getAttribute('title')||(el as HTMLElement).innerText||'').replace(/\s+/g,' ').trim();
      return text?text.slice(0,50):undefined;
    };
    const click=(e:PointerEvent)=>{mark(e);transport.current?.send('click',{id:selfId,...norm(e),label:labelOf(e)});};
    window.addEventListener('pointermove',move,{passive:true});
    window.addEventListener('pointerdown',click,{passive:true,capture:true});
    window.addEventListener('wheel',mark,{passive:true,capture:true});
    window.addEventListener('keydown',mark,{capture:true});
    window.addEventListener('touchmove',mark,{passive:true,capture:true});
    return ()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerdown',click,true);
      window.removeEventListener('wheel',mark,true);window.removeEventListener('keydown',mark,true);window.removeEventListener('touchmove',mark,true);};
  },[enabled,projectId,selfId]);

  // Quiconque agit (déplace la vue, change de panorama…) devient le pilote : l'autre voit exactement la même chose.
  const acting=()=>Date.now()-lastInput.current<1800;
  const becomeLeader=()=>{
    if(leaderRef.current===selfId)return;
    leaderRef.current=selfId;setLeaderId(selfId);
    transport.current?.send('hand',{id:selfId});
  };
  // Panorama / espace affiché.
  useEffect(()=>{
    if(!enabled||!projectId)return;
    if(leaderRef.current!==selfId){if(!acting())return;becomeLeader();}
    transport.current?.send('state',{id:selfId,...opts.state});
    setLastAction('');
  },[enabled,projectId,selfId,opts.state.sceneId,opts.state.spaceId]);
  // Panneaux et fenêtres ouverts (barre du bas, galerie, information, aperçu…).
  useEffect(()=>{
    if(!enabled||!projectId)return;
    if(leaderRef.current!==selfId){if(!acting())return;becomeLeader();}
    transport.current?.send('ui',{id:selfId,ui:opts.ui});
  },[enabled,projectId,selfId,opts.ui]);
  // Orientation et zoom de la vue : envoyés dès qu'ils changent sous la main de l'utilisateur.
  useEffect(()=>{
    if(!enabled||!projectId)return;
    let sent='';
    const timer=window.setInterval(()=>{
      const v=getViewRef.current();
      if(!v||!v.sceneId)return;
      const key=[v.sceneId,v.yaw.toFixed(3),v.pitch.toFixed(3),v.zoom.toFixed(1)].join('|');
      if(key===sent)return;
      if(leaderRef.current!==selfId){
        if(!acting())return;      // simple suivi de l'autre : on ne renvoie rien
        becomeLeader();
      }
      sent=key;
      transport.current?.send('view',{id:selfId,...v});
    },90);
    return ()=>window.clearInterval(timer);
  },[enabled,projectId,selfId]);

  const take=useCallback(()=>{
    setLeaderId(selfId);
    transport.current?.send('hand',{id:selfId});
    transport.current?.send('state',{id:selfId,...stateRef.current});
  },[selfId]);
  const release=useCallback(()=>{setLeaderId(null);transport.current?.send('release',{id:selfId});},[selfId]);
  return {selfId,peers,leaderId,follow,setFollow,take,release,error,lastAction};
}

const fmtName=(p:LivePeer)=>p.label||'Invité';
function Arrow({color,big}:{color:string;big:boolean}){
  const s=big?30:24;
  return <svg width={s} height={s} viewBox="0 0 24 24" style={{filter:'drop-shadow(0 2px 3px rgba(0,0,0,.45))'}}>
    <path d="M3 2l17 8-7.5 2.2L10 20z" fill={color} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>;
}

export function LiveOverlay({live,onClose}:{live:ReturnType<typeof useLiveSession>;onClose:()=>void}){
  const [now,setNow]=useState(Date.now());
  const [open,setOpen]=useState(false);
  const [banner,setBanner]=useState('');
  const prevLeader=useRef<string|null|undefined>(undefined);
  useEffect(()=>{
    // Annonce claire à chaque changement de pilote (sans le répéter au démarrage).
    const first=prevLeader.current===undefined;
    const before=prevLeader.current;prevLeader.current=live.leaderId;
    if(first||before===live.leaderId)return;
    const who=live.peers.find(x=>x.id===live.leaderId);
    setBanner(live.leaderId===live.selfId?'Vous êtes maintenant pilote : l’autre personne voit ce que vous faites.'
      :who?(who.label||'L’autre personne')+' est maintenant pilote : vous voyez son écran.':'Plus de pilote pour l’instant.');
    const t=window.setTimeout(()=>setBanner(''),4500);
    return ()=>window.clearTimeout(t);
  },[live.leaderId]);
  useEffect(()=>{const i=window.setInterval(()=>setNow(Date.now()),400);return ()=>window.clearInterval(i);},[]);
  const others=live.peers.filter(p=>p.id!==live.selfId);
  const me=live.peers.find(p=>p.id===live.selfId);
  const iHaveHand=live.leaderId===live.selfId;
  const leader=others.find(p=>p.id===live.leaderId);
  return <>
    <div className="nv-live-layer" aria-hidden="true">
      {others.map(p=>{
        const c=p.cursor;
        const show=c&&now-c.t<8000;
        return <div key={p.id}>
          {show&&<div className="nv-live-cursor" style={{left:c.x*100+'%',top:c.y*100+'%'}}>
            <Arrow color={p.color} big={live.leaderId===p.id}/>
            <span style={{background:p.color}}>{fmtName(p)}{live.leaderId===p.id?' · pilote':''}</span>
          </div>}
          {p.pulse&&p.pulse.label&&now-p.pulse.t<2200&&<span className="nv-live-click-label" style={{left:p.pulse.x*100+'%',top:p.pulse.y*100+'%',background:p.color}}>{fmtName(p)} clique : « {p.pulse.label} »</span>}
          {p.pulse&&now-p.pulse.t<700&&<span key={p.pulse.t} className="nv-live-pulse" style={{left:p.pulse.x*100+'%',top:p.pulse.y*100+'%',borderColor:p.color}}/>}
        </div>;
      })}
    </div>
    {banner&&<div className="nv-live-banner" role="status"><span>{banner}</span><button type="button" onClick={()=>setBanner('')} aria-label="Fermer le message">✕</button></div>}
    <div className={'nv-live-bar'+(open?' is-open':'')+(iHaveHand?' is-pilot':leader?' is-follower':'')} role="status">
      <button type="button" className="nv-live-pill" onClick={()=>setOpen(o=>!o)}
        title="Voir les détails de l’écran partagé">
        <span className="nv-live-dot" style={{background:me?.color??'#2f80ed'}}/>
        {others.length===0?'En attente de l’autre personne…':iHaveHand?<><b>VOUS ÊTES PILOTE</b><small>{others.map(fmtName).join(', ')} vous suit</small></>
          :leader?<><b>{fmtName(leader).toUpperCase()} EST PILOTE</b><small>{live.follow?'vous suivez son écran':'suivi désactivé'}</small></>
          :<><b>AUCUN PILOTE</b><small>agis pour le devenir</small></>}
      </button>
      <button type="button" className="nv-live-more" aria-expanded={open} aria-label="Détails de l’écran partagé" onClick={()=>setOpen(o=>!o)}>{open?'▴':'▾'}</button>
      {open&&<div className="nv-live-details">
        <div className="nv-live-details-head"><b>Écran partagé</b><button type="button" className="nv-live-close" onClick={()=>setOpen(false)} aria-label="Fermer cette fenêtre">✕</button></div>
        <p className="nv-live-explain">{iHaveHand?'Tu es le pilote : l’autre personne voit ton écran (panorama, onglets, réglages). Pour lui laisser la main, clique sur « Passer le pilotage ».'
          :leader?fmtName(leader)+' est le pilote : tu vois son écran. Décoche « Suivre » pour travailler de ton côté, ou prends le pilotage.'
          :'Personne ne pilote. La première personne qui agit devient pilote.'}</p>
        <span>Avec {others.length?others.map(p=><i key={p.id} style={{color:p.color}}>{fmtName(p)}</i>).reduce<ReactNode[]>((a,x,i)=>i?[...a,', ',x]:[x],[]):'personne pour l’instant (l’autre doit accepter l’invitation ou cliquer sur « Écran partagé »)'}</span>
        <div className="nv-live-actions">
          {others.length>0&&(iHaveHand?<button type="button" onClick={live.release}>Passer le pilotage</button>:<button type="button" onClick={live.take}>Prendre le pilotage</button>)}
          {others.length>0&&!iHaveHand&&leader&&<label className="nv-live-follow"><input type="checkbox" checked={live.follow} onChange={e=>live.setFollow(e.target.checked)}/> Suivre son écran</label>}
          <button type="button" className="nv-live-quit" onClick={onClose}>Quitter le partage</button>
        </div>
        {live.error&&<span className="nv-live-error">{live.error}</span>}
      </div>}
    </div>
  </>;
}


/* ---------- Invitations : « Je te propose de partager mon écran » ---------- */
export type LiveInvite={fromLabel:string;fromEmail:string;at:number};
const inviteChannel=(projectId:string)=>'inv:'+projectId;

/** Écoute (en continu, très léger) les invitations adressées à cette adresse e-mail sur ce projet. */
export type LiveShot={id:string;fromLabel:string;fromEmail:string;comment:string;image:string;at:number};
export function useLiveInvites(identity:{projectId:string;email:string}|null,enabled:boolean){
  const [invite,setInvite]=useState<LiveInvite|null>(null);
  const [shots,setShots]=useState<LiveShot[]>([]);
  const projectId=identity?.projectId,email=identity?.email;
  useEffect(()=>{
    if(!enabled||!projectId||!email)return;
    let closed=false;let transport:LiveTransport|null=null;
    const selfId=Math.random().toString(36).slice(2,10);
    void makeTransport(inviteChannel(projectId),selfId).then(t=>{
      if(closed){t.close();return;}
      transport=t;
      t.on('invite',p=>{
        if(!p||!Array.isArray(p.to)||!p.to.includes(email)||p.fromEmail===email)return;
        setInvite({fromLabel:String(p.fromLabel||'Quelqu’un').slice(0,40),fromEmail:String(p.fromEmail||''),at:Date.now()});
      });
      // Capture annotée envoyée par un collègue
      t.on('shot',p=>{
        if(!p||!Array.isArray(p.to)||!p.to.includes(email)||p.fromEmail===email)return;
        if(typeof p.image!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.image)||p.image.length>900_000)return;
        setShots(list=>[{id:Math.random().toString(36).slice(2),fromLabel:String(p.fromLabel||'Quelqu’un').slice(0,40),fromEmail:String(p.fromEmail||''),
          comment:String(p.comment||'').slice(0,600),image:p.image,at:Date.now()},...list].slice(0,6));
      });
      t.join({id:selfId,label:email,joinedAt:Date.now()},()=>undefined);
    }).catch(()=>undefined);
    return ()=>{closed=true;transport?.close();};
  },[enabled,projectId,email]);
  return {invite,dismiss:()=>setInvite(null),shots,dismissShot:(id:string)=>setShots(list=>list.filter(x=>x.id!==id))};
}
/** Envoie l'invitation aux personnes choisies (elles la voient si leur éditeur est ouvert sur ce projet). */
export async function sendLiveInvite(projectId:string,fromLabel:string,fromEmail:string,to:string[]):Promise<void>{
  const selfId=Math.random().toString(36).slice(2,10);
  const t=await makeTransport(inviteChannel(projectId),selfId);
  t.join({id:selfId,label:fromEmail,joinedAt:Date.now()},()=>undefined);
  await new Promise(resolve=>window.setTimeout(resolve,1000)); // laisse la connexion s'établir
  t.send('invite',{fromLabel,fromEmail,to});
  window.setTimeout(()=>t.close(),700);
}

/** Envoie une capture annotée aux personnes choisies (elles la reçoivent si leur éditeur est ouvert sur ce projet). */
export async function sendLiveShot(projectId:string,fromLabel:string,fromEmail:string,to:string[],comment:string,image:string):Promise<void>{
  const selfId=Math.random().toString(36).slice(2,10);
  const t=await makeTransport(inviteChannel(projectId),selfId);
  t.join({id:selfId,label:fromEmail,joinedAt:Date.now()},()=>undefined);
  await new Promise(resolve=>window.setTimeout(resolve,1000));
  t.send('shot',{fromLabel,fromEmail,to,comment:comment.slice(0,600),image});
  window.setTimeout(()=>t.close(),1500);
}
