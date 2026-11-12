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
type Meta={id:string;label:string;joinedAt:number};
type Cursor={x:number;y:number;t:number};
export type LivePeer=Meta&{color:string;cursor?:Cursor;pulse?:{x:number;y:number;t:number}};

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

export function useLiveSession(opts:{projectId:string|null;enabled:boolean;label:string;state:LiveState;onRemoteState:(s:LiveState)=>void}){
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
        setPeers(list=>list.map(x=>x.id===p.id?{...x,cursor:{x:p.x,y:p.y,t:Date.now()},pulse:{x:p.x,y:p.y,t:Date.now()}}:x));
      });
      t.on('hand',p=>{setLeaderId(p.id);});
      t.on('release',p=>{setLeaderId(cur=>cur===p.id?null:cur);});
      t.on('state',p=>{
        if(p.id===leaderRef.current&&followRef.current&&p.sceneId)remoteRef.current({sceneId:p.sceneId,spaceId:p.spaceId??null});
      });
      t.on('hello',()=>{ // un nouvel arrivant demande qui pilote
        if(leaderRef.current===selfId)t.send('hand',{id:selfId});
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
    const click=(e:PointerEvent)=>{transport.current?.send('click',{id:selfId,...norm(e)});};
    window.addEventListener('pointermove',move,{passive:true});
    window.addEventListener('pointerdown',click,{passive:true,capture:true});
    return ()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerdown',click,true);};
  },[enabled,projectId,selfId]);

  // Le pilote diffuse le panorama / l'espace affiché.
  useEffect(()=>{
    if(!enabled||leaderId!==selfId)return;
    transport.current?.send('state',{id:selfId,...opts.state});
  },[enabled,leaderId,selfId,opts.state.sceneId,opts.state.spaceId]);

  const take=useCallback(()=>{
    setLeaderId(selfId);
    transport.current?.send('hand',{id:selfId});
    transport.current?.send('state',{id:selfId,...stateRef.current});
  },[selfId]);
  const release=useCallback(()=>{setLeaderId(null);transport.current?.send('release',{id:selfId});},[selfId]);
  return {selfId,peers,leaderId,follow,setFollow,take,release,error};
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
          {p.pulse&&now-p.pulse.t<700&&<span key={p.pulse.t} className="nv-live-pulse" style={{left:p.pulse.x*100+'%',top:p.pulse.y*100+'%',borderColor:p.color}}/>}
        </div>;
      })}
    </div>
    <div className="nv-live-bar" role="status">
      <span className="nv-live-dot" style={{background:me?.color??'#2f80ed'}}/>
      <b>Écran partagé</b>
      {others.length===0?<span>· En attente de l'autre personne… (elle doit cliquer aussi sur « Écran partagé »)</span>:
        <span>· avec {others.map(p=><i key={p.id} style={{color:p.color}}>{fmtName(p)}</i>).reduce<ReactNode[]>((a,x,i)=>i?[...a,', ',x]:[x],[])}</span>}
      {others.length>0&&(iHaveHand?
        <><span className="nv-live-chip is-hand">Vous êtes le pilote</span><button type="button" onClick={live.release}>Passer le pilotage</button></>:
        <>{leader?<span className="nv-live-chip">{fmtName(leader)} est le pilote</span>:<span className="nv-live-chip">Aucun pilote pour l'instant</span>}
          {leader&&<label className="nv-live-follow"><input type="checkbox" checked={live.follow} onChange={e=>live.setFollow(e.target.checked)}/> Suivre</label>}
          <button type="button" onClick={live.take}>Piloter</button></>)}
      {live.error&&<span className="nv-live-error">{live.error}</span>}
      <button type="button" className="nv-live-quit" onClick={onClose}>Quitter</button>
    </div>
  </>;
}
