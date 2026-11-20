import {useEffect,useRef,useState} from 'react';

/**
 * Confirmation unifiée (remplace window.confirm) : même style partout, clavier (Entrée / Échap), focus sur le bon bouton.
 * Utilisation : `if(!await confirmAsk('Supprimer ce point ?',{danger:true}))return;`
 */
export type ConfirmOptions={title?:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean};
type Pending={message:string;options:ConfirmOptions;resolve:(ok:boolean)=>void};
let listener:((p:Pending)=>void)|null=null;
const waiting:Pending[]=[];

export function confirmAsk(message:string,options:ConfirmOptions={}):Promise<boolean>{
  return new Promise(resolve=>{
    const item={message,options,resolve};
    if(listener)listener(item);
    else if(typeof window!=='undefined'&&!document.getElementById('nv-confirm-host'))resolve(window.confirm(message)); // filet de sécurité hors éditeur
    else waiting.push(item);
  });
}

export function ConfirmHost(){
  const [queue,setQueue]=useState<Pending[]>([]);
  const okRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    listener=item=>setQueue(q=>[...q,item]);
    if(waiting.length)setQueue(q=>[...q,...waiting.splice(0)]);
    return ()=>{listener=null;};
  },[]);
  const current=queue[0];
  useEffect(()=>{if(current)window.setTimeout(()=>okRef.current?.focus(),0);},[current]);
  if(!current)return <span id="nv-confirm-host" hidden/>;
  const close=(ok:boolean)=>{current.resolve(ok);setQueue(q=>q.slice(1));};
  const o=current.options;
  return <><span id="nv-confirm-host" hidden/>
    <div className="nv-confirm-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close(false);}}>
      <section className={'nv-confirm-dialog'+(o.danger?' is-danger':'')} role="alertdialog" aria-modal="true" aria-label={o.title??'Confirmation'}
        onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close(false);}}}>
        {o.title&&<h2>{o.title}</h2>}
        <p>{current.message}</p>
        <div className="nv-confirm-actions">
          <button type="button" className="nv-confirm-cancel" onClick={()=>close(false)}>{o.cancelLabel??'Annuler'}</button>
          <button type="button" ref={okRef} className="nv-confirm-ok" onClick={()=>close(true)}>{o.confirmLabel??(o.danger?'Supprimer':'Confirmer')}</button>
        </div>
      </section>
    </div></>;
}
