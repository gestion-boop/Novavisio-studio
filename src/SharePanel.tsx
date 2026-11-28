import './publicationState.css';
import {confirmAsk} from './confirmDialog';
import {useEffect,useState} from 'react';
import {overlayClose} from './overlayClose';
import {cloudConfigured,supabase,readLink,writeLink,type CloudLink} from './cloud';
import {SHARE_DAYS,autoPublishOn,setAutoPublish,createShareLink,getPublication,listShares,publicationActive,publishPermanent,revokeShare,shareStatus,shareUrl,unpublish,wrapperHtml,type Publication,type ShareDays,type ShareRow} from './share';
import type {StudioProject} from './storage';
import {LoginBox} from './LoginBox';
import {readSpaceCloudLink,writeSpaceCloudLink,type StudioSpace} from './spaces';
import {XMark} from './XMark';

const fmt=(iso:string)=>new Date(iso).toLocaleString('fr-FR',{weekday:'short',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'});

type Props={project:StudioProject;space?:StudioSpace|null;onClose:()=>void;onStatus:(message:string)=>void};
export function SharePanel({project,space,onClose,onStatus}:Props){
  const [userEmail,setUserEmail]=useState<string|null>(null);
  const [days,setDays]=useState<ShareDays>(7);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [link,setLink]=useState<CloudLink|null>(space?readSpaceCloudLink(space.id,'public'):readLink());
  const [shares,setShares]=useState<ShareRow[]>([]);
  const [pub,setPub]=useState<Publication|null>(null);
  const [pubNote,setPubNote]=useState('');
  const [pubCopied,setPubCopied]=useState(false);
  const [iframeCopied,setIframeCopied]=useState(false);
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
      if(session)void refresh((space?readSpaceCloudLink(space.id,'public'):readLink())?.projectId);else setShares([]);
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
    try{res=await createShareLink(project,link,days,setBusy,!space);}
    finally{setLink(space?readSpaceCloudLink(space.id,'public'):readLink());}
    if(space)writeSpaceCloudLink(space.id,'public',res.link);else writeLink(res.link);
    setLink(res.link);
    const url=shareUrl(res.token);
    const copied=await copy(url);
    setCreated({url,expires:res.expires_at,copied});
    onStatus('Lien public créé : valable '+days+' jours');
    await refresh(res.link.projectId);
  });
  const publish=()=>run('Préparation…',async()=>{
    const res=await publishPermanent(project,link,setBusy,!space);
    if(space)writeSpaceCloudLink(space.id,'public',res.link);else writeLink(res.link);
    setLink(res.link);setPub(res.publication);setPubNote('');
    onStatus('Visite publiée : l’adresse permanente est à jour');
    await refresh(res.link.projectId);
  });
  const stopPublication=async ()=>{
    if(!link||!await confirmAsk('Arrêter la publication ? L’adresse permanente cessera de fonctionner (rien n’est supprimé : tu pourras republier).'))return;
    void run('Arrêt…',async()=>{await unpublish(link.projectId);onStatus('Publication arrêtée');await refresh(link.projectId);});
  };
  const copyIntegration=async (format:'url'|'iframe')=>{
    if(!pub||!publicationActive(pub))return;
    const url=shareUrl(pub.token);
    const esc=(v:string)=>v.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const value=format==='url'?url:`<iframe src="${esc(url)}" title="${esc(project.name||'Visite 360°')}" style="display:block;width:100%;height:clamp(320px,65vh,700px);border:0" allow="fullscreen; autoplay; accelerometer; gyroscope; magnetometer; xr-spatial-tracking" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe>`;
    const ok=await copy(value);
    if(!ok){setError('Copie impossible : sélectionne manuellement l’adresse permanente ci-dessus.');return;}
    setError('');
    if(format==='url'){setPubCopied(true);setTimeout(()=>setPubCopied(false),1800);}
    else{setIframeCopied(true);setTimeout(()=>setIframeCopied(false),1800);}
    onStatus(format==='url'?'Lien permanent copié pour NovaWeb et NovaTour':'Code iFrame permanent copié');
  };
  const downloadWrapper=()=>{
    if(!pub)return;
    const blob=new Blob([wrapperHtml(shareUrl(pub.token),project.name||'Visite 360°',project.introEnabled?project.introUrl:'',project.introDuration??6)],{type:'text/html'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='index.html';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  const revoke=async (row:ShareRow)=>{
    if(!await confirmAsk('Désactiver ce lien tout de suite ? Les personnes qui l’ont reçu n’auront plus accès à la visite.'))return;
    void run('Désactivation…',async()=>{await revokeShare(row.id);onStatus('Lien désactivé');await refresh(link?.projectId);});
  };

  return <div className="overlay" {...overlayClose(onClose)}><div className="modal cloud-panel share-panel" onClick={e=>e.stopPropagation()}>
    <button className="close" onClick={onClose}><XMark/></button>
    <h2>Lien public · {space?space.name:'Projet complet'}</h2>
    {space?
      <p className="hint-inline"><b>Espace publié : {space.name}</b> — {project.scenes.length} panoramas uniquement. Aucun autre espace ne figure dans ce lien. Les médias et icônes inutilisés sont exclus. Les publications précédentes du projet complet restent distinctes.</p>:
      <p className="warning-inline"><b>Attention : tu publies le projet complet ({project.scenes.length} panoramas).</b> Pour envoyer une visite de 3 ou 4 panoramas seulement, ferme cette fenêtre, sélectionne l’espace correspondant dans la barre « Espaces », puis ouvre à nouveau « Lien public ».</p>}
    {!cloudConfigured?<p className="warning">Supabase n’est pas configuré sur ce déploiement : les liens publics sont indisponibles.</p>
    :!userEmail?<LoginBox intro="Pour envoyer un lien, connecte-toi d’abord (lien magique par e-mail, ou e-mail et mot de passe)."/>
    :<>
      <div className="permanent-card">
        <div className="icon-state-label">LIEN PERMANENT · NOVATOUR & NOVAWEB{space?' · '+space.name.toUpperCase():''}</div>
        <small className="hint-inline">Utilise le même lien permanent dans NovaWeb (bloc Visite 360°) et NovaTour. Le fichier <b>index.html</b> reste disponible pour NovaTour et les hébergements HTML, notamment pour l’introduction externe. Ensuite, <b>« Publier »</b> actualise la visite à la prochaine ouverture, sans renvoyer de dossier. Les liens temporaires ci-dessous restent figés.</small>
        {pubNote&&<small className="warning-inline">{pubNote}</small>}
        {publicationActive(pub)&&pub?<>
          <input readOnly value={shareUrl(pub.token)} onFocus={e=>e.currentTarget.select()}/>
          <small className="hint-inline">Publiée le <b>{fmt(pub.published_at)}</b>. <b>Chaque enregistrement met à jour ce lien automatiquement</b> (tu peux le désactiver ci-dessous).</small>
          <div className="nv-pub-state" role="status">
            <div><span>Ce lien affiche</span><b>{space?'l’espace « '+space.name+' »':'le projet complet'}</b></div>
            <div><span>Version publiée</span><b>révision {pub.published_revision} · {fmt(pub.published_at)}</b></div>
            {link&&<div><span>Dernier enregistrement Cloud</span><b>révision {link.revision}</b></div>}
            {link&&link.revision>pub.published_revision
              ?<p className="warning-inline">Des enregistrements plus récents ne sont <b>pas encore publiés</b> : les visiteurs voient encore la révision {pub.published_revision}. Clique sur « Mettre à jour maintenant ».</p>
              :link&&<p className="hint-inline">✓ La visite en ligne est à jour avec le dernier enregistrement Cloud de cet appareil.</p>}
          </div>
          <label className="toggle-row"><input type="checkbox" defaultChecked={autoPublishOn()} onChange={e=>setAutoPublish(e.target.checked)}/> Mettre à jour ce lien à chaque enregistrement</label>
          <div className="cloud-actions">
            <button className="primary" disabled={!!busy||!project.scenes.length} onClick={()=>void publish()}>Mettre à jour maintenant</button>
            <button className="quiet" onClick={downloadWrapper}>Télécharger index.html pour NovaTour</button>
            <button className="quiet" onClick={()=>void copyIntegration('url')}>{pubCopied?'Copié ✓':'Copier le lien d’intégration permanent'}</button>
            <button className="quiet" onClick={()=>void copyIntegration('iframe')}>{iframeCopied?'Code copié ✓':'Copier le code iFrame'}</button>
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
