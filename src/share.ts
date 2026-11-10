import {supabase,saveToCloud,writeLink,type CloudLink} from './cloud';
import type {StudioProject} from './storage';

/**
 * Liens publics à durée limitée. L'expiration est calculée et vérifiée par la base de données
 * (fonctions nvstudio_create_share / nvstudio_get_share) : le navigateur ne peut pas la contourner.
 */
export const SHARE_DAYS=[3,5,7,10] as const;
export type ShareDays=typeof SHARE_DAYS[number];
export type ShareRow={id:string;token:string;revision:number;days:number;created_at:string;expires_at:string;revoked_at:string|null};
export type ShareStatus='active'|'expired'|'revoked';

export const shareStatus=(row:Pick<ShareRow,'expires_at'|'revoked_at'>,now=Date.now()):ShareStatus=>
  row.revoked_at?'revoked':new Date(row.expires_at).getTime()<=now?'expired':'active';

/** Adresse publique. Sur un déploiement Vercel de test (protégé), on utilise l'adresse de production. */
export function shareUrl(token:string):string{
  const host=window.location.hostname;
  const base=host.endsWith('.vercel.app')?'https://novavisio-studio.vercel.app/':new URL('./',window.location.href).toString();
  return base+'share.html?t='+encodeURIComponent(token);
}

/** Adresse du Studio (celle à donner à une personne invitée). */
export function studioUrl():string{
  const host=window.location.hostname;
  return host.endsWith('.vercel.app')?'https://novavisio-studio.vercel.app/':new URL('./',window.location.href).toString();
}

const friendly=(message:string)=>
  /nvstudio_publish|nvstudio_unpublish|nvstudio_publications/i.test(message)?'La publication permanente n’est pas encore installée : exécute le fichier SQL « 20261110040000_nvstudio_publication » dans Supabase.':
  /not_owner/.test(message)?'Seul le propriétaire de la visite peut publier.':
  /not_authenticated/.test(message)?'Connecte-toi d’abord.':
  /unknown_revision/.test(message)?'Cette révision n’existe pas dans le cloud.':
  /invalid_duration/.test(message)?'Durée non autorisée (3, 5, 7 ou 10 jours).':
  /nvstudio_(create|get|revoke)_share|schema cache|Could not find the function/i.test(message)?
    'Les liens publics ne sont pas encore activés : exécute le fichier SQL « 20261110010000_nvstudio_share_links » dans Supabase.':
  message;

export async function createShareLink(project:StudioProject,link:CloudLink|null,days:ShareDays,onProgress:(msg:string)=>void):Promise<{link:CloudLink;token:string;expires_at:string}>{
  // 1) La visite telle qu'elle est maintenant est enregistrée dans le cloud (nouvelle révision, rien n'est écrasé).
  const saved=await saveToCloud(project,link,onProgress);
  // On mémorise tout de suite le lien local ↔ cloud : si la création du lien échoue (ex. fonctions SQL pas encore installées),
  // la prochaine tentative ajoute une révision à la MÊME visite au lieu d'en créer une seconde en double.
  writeLink(saved);
  // 2) Le lien pointe sur CETTE révision : les modifications ultérieures ne changent pas ce qu'il montre.
  onProgress('Création du lien…');
  const {data,error}=await supabase().rpc('nvstudio_create_share',{p_project:saved.projectId,p_revision:saved.revision,p_days:days});
  if(error)throw new Error(friendly(error.message));
  const res=data as {token:string;expires_at:string};
  return {link:saved,token:res.token,expires_at:res.expires_at};
}
export async function listShares(projectId:string):Promise<ShareRow[]>{
  const {data,error}=await supabase().from('nvstudio_shares')
    .select('id,token,revision,days,created_at,expires_at,revoked_at').eq('project_id',projectId).order('created_at',{ascending:false});
  if(error)throw new Error(friendly(error.message));
  return (data??[]) as ShareRow[];
}
export async function revokeShare(id:string){
  const {error}=await supabase().rpc('nvstudio_revoke_share',{p_share:id});
  if(error)throw new Error(friendly(error.message));
}

/* ---------- Lien permanent (publication) ---------- */
export type Publication={token:string;published_revision:number;published_at:string;revoked_at:string|null};
export const publicationActive=(p:Publication|null)=>!!p&&!p.revoked_at;

export async function getPublication(projectId:string):Promise<Publication|null>{
  const {data,error}=await supabase().from('nvstudio_publications').select('token,published_revision,published_at,revoked_at').eq('project_id',projectId).maybeSingle();
  if(error)throw new Error(friendly(error.message));
  return (data as Publication|null)??null;
}
/** Enregistre la visite telle qu'elle est maintenant (nouvelle révision) puis fait pointer l'adresse permanente dessus. */
export async function publishPermanent(project:StudioProject,link:CloudLink|null,onProgress:(msg:string)=>void):Promise<{link:CloudLink;publication:Publication}>{
  const saved=await saveToCloud(project,link,onProgress);
  writeLink(saved);
  onProgress('Publication…');
  const {data,error}=await supabase().rpc('nvstudio_publish',{p_project:saved.projectId,p_revision:saved.revision});
  if(error)throw new Error(friendly(error.message));
  const out=data as {token:string;published_at:string;revision:number};
  return {link:saved,publication:{token:out.token,published_revision:out.revision,published_at:out.published_at,revoked_at:null}};
}
export async function unpublish(projectId:string){
  const {error}=await supabase().rpc('nvstudio_unpublish',{p_project:projectId});
  if(error)throw new Error(friendly(error.message));
}

/**
 * Petit fichier index.html à envoyer UNE SEULE FOIS dans NovaTour : il affiche la visite publiée depuis le Studio.
 * Ensuite, « Publier » dans le Studio met à jour ce que voient les visiteurs, sans renvoyer de dossier.
 * Un seul fichier, sans dépendance : il fonctionne aussi derrière un lien signé temporaire.
 */
export function wrapperHtml(url:string,title:string):string{
  const esc=(v:string)=>v.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  html,body{margin:0;height:100%;background:#07131c}
  iframe{position:fixed;inset:0;width:100%;height:100%;border:0}
  a.fallback{position:fixed;left:10px;bottom:8px;z-index:1;font:11px system-ui,sans-serif;color:#9fd4dc;opacity:.55;text-decoration:none}
  a.fallback:hover{opacity:1}
</style>
</head>
<body>
<iframe src="${esc(url)}" title="${esc(title)}" allow="fullscreen; autoplay; accelerometer; gyroscope; magnetometer; xr-spatial-tracking" allowfullscreen referrerpolicy="no-referrer"></iframe>
<a class="fallback" href="${esc(url)}" target="_blank" rel="noopener">Ouvrir la visite dans un nouvel onglet</a>
</body>
</html>
`;
}
