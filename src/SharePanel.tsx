import {useEffect,useState} from 'react';
import {cloudConfigured,supabase,readLink,writeLink,type CloudLink} from './cloud';
import {SHARE_DAYS,createShareLink,getPublication,listShares,publicationActive,publishPermanent,revokeShare,shareStatus,shareUrl,unpublish,wrapperHtml,type Publication,type ShareDays,type ShareRow} from './share';
import type {StudioProject} from './storage';
import {LoginBox} from './LoginBox';

const fmt=(iso:string)=>new Date(iso).toLocaleString('fr-FR',{weekday:'short',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'});

type Props={project:StudioProject;onClose:()=>void;onStatus:(message:string)=>void};
export function SharePanel({project,onClose,onStatus}:Props){
  const [userEmail,setUserEmail]=useState<string|null>(null);
  const [days,setDays]=useState<ShareDays>(7);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [link,setLink]=useState<CloudLink|null>(readLink());
  const [shares,setShares]=useState<ShareRow[]>([]);
  const [pub,setPub]=useState<Publication|null>(null);
  const [pubNote,setPubNote]=useState('');
  const [pubCopied,setPubCopied]=useState(false);
  const [created,setCreated]=useState<{url:string;expires:string;copied:boolean}|null>(null);
  const [copiedId,setCopiedId]=useState('');

  async function refresh(projectId:string|undefined){
    if(!projectId){setShares([]);setPub(null);return;}
    try{setPub(await getPublication(projectId));setPubNote('');}catch(e){setPub(null);setPubNote(e instanceof Error?e.message:String(e));}
    try{setShares(await listShares(projectId));}catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  useEffect(()=>{
    if(!cloudConfigured)return;
    const db=supabase();
    void db.auth.getSession().then(({data})=>{
      setUserEmail(data.session?.user.email??null);
      if(data.session)void refresh(link?.projectId);
    });
    const {data:sub}=db.auth.onAuthStateChange((_e,session)=>{
      setUserEmail(session?.user.email??null);
      if(session)void refresh(readLink()?.projectId);else setShares([]);
    });
    return ()=>sub.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function copy(text:string):Promise<boolean>{
    try{await navigator.clipboard.writeText(text);return true;}
    catch{
      try{
        const area=document.createElement('textarea');
        area.value=text;area.style.position='fixed';area.style.opacity='0';
        document.body.append(area);area.select();
        const ok=document.execCommand('copy');area.remove();return ok;
      }catch{return false;}
    }
  }
  async function run(label:string,task:()=>Promise<void>){
    setBusy(label);setError('');
    try{await task();}catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy('');}
  }
  const create=()=>run('Préparation…',async()=>{
    let res;
    try{res=await createShareLink(project,link,days,setBusy);}
    finally{setLink(readLink());} // le lien local est mémorisé dès l'enregistrement, même si la suite échoue
    writeLink(res.link);
    const url=shareUrl(res.token);
    const copied=await copy(url);
    setCreated({url,expires:res.expires_at,copied});
    onStatus('Lien public créé : valable '+days+' jours');
    await refresh(res.link.projectId);
  });
  const publish=()=>run('Préparation…',async()=>{
    const res=await publishPermanent(project,link,setBusy);
    writeLink(res.link);setLink(res.link);setPub(res.publication);setPubNote('');
    onStatus('Visite publiée : l’adresse permanente est à jour');
    await refresh(res.link.projectId);
  });
  const stopPublication=()=>{
    if(!link||!window.confirm('Arrêter la publication ? L’adresse permanente cessera de fonctionner (rien n’est supprimé : tu pourras republier).'))return;
    void run('Arrêt…',async()=>{await unpublish(link.projectId);onStatus('Publication arrêtée');await refresh(link.projectId);});
  };
  const downloadWrapper=()=>{
    if(!pub)return;
    const blob=new Blob([wrapperHtml(shareUrl(pub.token),project.name||'Visite 360°',project.introEnabled?project.introUrl:'',project.introDuration??6)],{type:'text/html'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='index.html';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  const revoke=(row:ShareRow)=>{
    if(!window.confirm('Désactiver ce lien tout de suite ? Les personnes qui l’ont reçu n’auront plus accès à la visite.'))return;
    void run('Désactivation…',async()=>{await revokeShare(row.id);onStatus('Lien désactivé');await refresh(link?.projectId);});
  };

  return <div className="overlay" onClick={onClose}><div className="modal cloud-panel share-panel" onClick={e=>e.stopPropagation()}>
    <button className="close" onClick={onClose}>✕</button>
    <h2>Lien public</h2>
    {!cloudConfigured?<p className="warning">Supabase n’est pas configuré sur ce déploiement : les liens publics sont indisponibles.</p>
    :!userEmail?<LoginBox intro="Pour envoyer un lien, connecte-toi d’abord (lien magique par e-mail, ou e-mail et mot de passe)."/>
    :<>
      <div className="permanent-card">
        <div className="icon-state-label">LIEN PERMANENT · POUR NOVATOUR</div>
        <small className="hint-inline">Envoie le fichier <b>index.html</b> ci-dessous <b>une seule fois</b> dans NovaTour. Ensuite, chaque clic sur <b>« Publier »</b> met à jour la visite affichée dans NovaTour : plus de dossier à renvoyer.</small>
        {pubNote&&<small className="warning-inline">{pubNote}</small>}
        {publicationActive(pub)&&pub?<>
          <input readOnly value={shareUrl(pub.token)} onFocus={e=>e.currentTarget.select()}/>
          <small className="hint-inline">Publiée le <b>{fmt(pub.published_at)}</b>. Les visiteurs voient cette version.</small>
          <div className="cloud-actions">
            <button className="primary" disabled={!!busy||!project.scenes.length} onClick={()=>void publish()}>Publier la mise à jour</button>
            <button className="quiet" onClick={downloadWrapper}>Télécharger index.html pour NovaTour</button>
            <button className="quiet" onClick={()=>void navigator.clipboard.writeText(shareUrl(pub.token)).then(()=>{setPubCopied(true);setTimeout(()=>setPubCopied(false),1800);}).catch(()=>undefined)}>{pubCopied?'Copié ✓':'Copier l’adresse'}</button>
            <a className="quiet share-open" href={shareUrl(pub.token)} target="_blank" rel="noopener">Ouvrir</a>
            <button className="quiet" disabled={!!busy} onClick={stopPublication}>Arrêter la publication</button>
          </div>
        </>:<>
          {pub&&<small className="hint-inline">Publication arrêtée le {fmt(pub.revoked_at??pub.published_at)}. L’adresse est fermée.</small>}
          <button className="primary" disabled={!!busy||!project.scenes.length||!!pubNote} onClick={()=>void publish()}>{pub?'Republier la visite':'Publier la visite'}</button>
        </>}
      </div>
      <div className="icon-state-label">LIEN À DURÉE LIMITÉE</div>
      <p className="hint-inline">Choisis combien de temps le lien reste ouvert. Passé ce délai, <b>plus rien n’est accessible</b>.</p>
      <div className="share-days" role="radiogroup" aria-label="Durée du lien">
        {SHARE_DAYS.map(d=><button type="button" key={d} role="radio" aria-checked={days===d} className={'share-day'+(days===d?' is-on':'')} onClick={()=>setDays(d)}>
          <strong>{d}</strong><small>jours</small></button>)}
      </div>
      <button className="primary" disabled={!!busy||!project.scenes.length} onClick={()=>void create()}>Créer le lien public ({days} jours)</button>
      {!project.scenes.length&&<small className="warning-inline">Importe au moins un panorama avant de créer un lien.</small>}
      <small className="hint-inline">Le lien montre la visite <b>telle qu’elle est maintenant</b> (une copie est enregistrée dans le cloud). Pour publier des modifications, crée un nouveau lien.</small>
      {created&&<div className="share-result">
        <div className="icon-state-label">LIEN PRÊT{created.copied?' · COPIÉ DANS LE PRESSE-PAPIERS':''}</div>
        <input readOnly value={created.url} onFocus={e=>e.currentTarget.select()}/>
        <div className="cloud-actions">
          <button className="primary" onClick={()=>void copy(created.url).then(ok=>setCreated(c=>c?{...c,copied:ok}:c))}>Copier le lien</button>
          <a className="quiet share-open" href={created.url} target="_blank" rel="noopener">Ouvrir</a>
        </div>
        <small className="hint-inline">Valable jusqu’au <b>{fmt(created.expires)}</b>.</small>
      </div>}
      {shares.length>0&&<>
        <h3>Liens déjà créés pour cette visite</h3>
        <ul className="cloud-list">{shares.map(row=>{
          const st=shareStatus(row);
          return <li key={row.id}>
            <span><b>{st==='active'?'Actif':st==='expired'?'Expiré':'Désactivé'}</b> · {row.days} j · contenu figé du {fmt(row.created_at)}
              <small>{st==='active'?'expire le ':st==='expired'?'a expiré le ':'désactivé · devait expirer le '}{fmt(row.expires_at)}</small></span>
            {st==='active'&&<span className="share-row-actions">
              <button className="quiet" onClick={()=>void copy(shareUrl(row.token)).then(ok=>{setCopiedId(ok?row.id:'');})}>{copiedId===row.id?'Copié ✓':'Copier'}</button>
              <button className="quiet" onClick={()=>revoke(row)} disabled={!!busy}>Désactiver</button>
            </span>}
          </li>;
        })}</ul>
      </>}
    </>}
    {busy&&<p className="status-adding">{busy}</p>}
    {error&&<p className="warning">{error}</p>}
  </div></div>;
}
