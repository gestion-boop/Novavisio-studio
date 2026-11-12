import {useEffect,useState} from 'react';
export function EmbeddedPage({url,title}:{url:string;title:string}){
 const [waiting,setWaiting]=useState(true);
 useEffect(()=>{setWaiting(true);const timer=setTimeout(()=>setWaiting(false),6000);return ()=>clearTimeout(timer)},[url]);
 return <div className="nv-embedded-page"><div className="nv-embedded-fallback"><span>{waiting?'Page intégrée':'Si le site refuse l’intégration, ouvre-le dans un nouvel onglet.'}</span><a href={url} target="_blank" rel="noopener noreferrer">Ouvrir dans un nouvel onglet ↗</a></div>
 <iframe title={title} src={url} onError={()=>setWaiting(false)} sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen"/></div>;
}
