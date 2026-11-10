import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {validateProject,type StudioProject} from './storage';

/**
 * Cloud sync — ADDITIVE ONLY.
 * - Never uses upsert / update / delete / truncate. Each save INSERTs a new immutable revision.
 * - A save is refused if the cloud already holds a newer revision than the one this browser knows.
 * - Media are content-addressed objects in a private bucket; existing objects are never replaced.
 */
const env=import.meta.env;
const URL_ENV=env.VITE_SUPABASE_URL??env.NEXT_PUBLIC_SUPABASE_URL;
// Clé publique uniquement (anon / publishable). Jamais service_role.
const KEY_ENV=env.VITE_SUPABASE_ANON_KEY??env.VITE_SUPABASE_PUBLISHABLE_KEY??env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(KEY_ENV&&/service_role|^sb_secret_/.test(KEY_ENV))throw new Error('Clé secrète détectée : utilise uniquement la clé publishable/anon.');
export const cloudConfigured=!!URL_ENV&&!!KEY_ENV&&/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(URL_ENV);
export const BUCKET='nvstudio-media';
export const MEDIA_PREFIX='nvmedia:';

let client:SupabaseClient|null=null;
export function supabase():SupabaseClient{
  if(!cloudConfigured)throw new Error('Supabase n’est pas configuré (URL + clé publishable).');
  client??=createClient(URL_ENV!,KEY_ENV!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
}

/** `revision` = dernière révision immuable ; `version` = dernière version de la copie de travail connue de cet appareil. */
export type CloudLink={projectId:string;revision:number;version?:number};
const LINK_KEY='nvstudio-cloud-link';
export function readLink():CloudLink|null{
  try{
    const v=JSON.parse(localStorage.getItem(LINK_KEY)||'null');
    return v&&typeof v.projectId==='string'&&Number.isInteger(v.revision)?{projectId:v.projectId,revision:v.revision,...(Number.isInteger(v.version)?{version:v.version}:{})}:null;
  }catch{return null;}
}
export function writeLink(link:CloudLink|null){
  try{if(link)localStorage.setItem(LINK_KEY,JSON.stringify(link));else localStorage.removeItem(LINK_KEY);}catch{/* storage unavailable */}
}

export type MediaKind='panorama'|'icon'|'frame'|'video'|'audio';
export type Slot={kind:MediaKind;get:()=>string|undefined;set:(v:string)=>void};
export function mediaSlots(p:StudioProject):Slot[]{
  const slots:Slot[]=[];
  const add=<T extends object>(o:T,key:keyof T,kind:MediaKind)=>slots.push({
    kind,
    get:()=>{const v=o[key];return typeof v==='string'?v:undefined;},
    set:v=>{(o as Record<keyof T,unknown>)[key]=v;}
  });
  p.icons.forEach(i=>add(i,'dataUrl','icon'));
  p.audioTracks.forEach(t=>add(t,'dataUrl','audio'));
  p.scenes.forEach(s=>{
    add(s,'dataUrl','panorama');add(s,'audioDataUrl','audio');
    s.hotspots.forEach(h=>{add(h,'imageDataUrl','frame');add(h,'videoDataUrl','video');});
  });
  return slots;
}
const EXT:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','audio/mpeg':'mp3','audio/mp3':'mp3','audio/ogg':'ogg','audio/wav':'wav','audio/x-wav':'wav','audio/webm':'weba','audio/mp4':'m4a'};
async function sha256(blob:Blob){
  const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
function blobToDataUrl(blob:Blob):Promise<string>{
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result));
    r.onerror=()=>reject(r.error);
    r.readAsDataURL(blob);
  });
}
async function currentUserId(){
  const {data,error}=await supabase().auth.getUser();
  if(error||!data.user)throw new Error('Connecte-toi d’abord à Supabase.');
  return data.user.id;
}
async function latestRevision(projectId:string):Promise<number>{
  const {data,error}=await supabase().from('nvstudio_revisions').select('revision').eq('project_id',projectId).order('revision',{ascending:false}).limit(1);
  if(error)throw new Error('Lecture des révisions impossible : '+error.message);
  return data?.[0]?.revision??0;
}

export async function signInWithEmail(email:string){
  const {error}=await supabase().auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin+window.location.pathname}});
  if(error)throw new Error(error.message);
}
export async function signOut(){await supabase().auth.signOut();}

export type CloudProject={id:string;name:string;created_at:string;revision:number;updated_at:string;autosave:boolean};
export async function listCloudProjects():Promise<CloudProject[]>{
  const db=supabase();
  let projectsRes=await db.from('nvstudio_projects').select('id,name,created_at,working_version,working_updated_at').order('created_at',{ascending:false});
  if(projectsRes.error&&setupMissing(projectsRes.error.message)){
    // Sauvegarde automatique pas encore installée : liste simple, sans les copies de travail.
    projectsRes=await db.from('nvstudio_projects').select('id,name,created_at').order('created_at',{ascending:false}) as typeof projectsRes;
  }
  const revisions=await db.from('nvstudio_revisions').select('project_id,revision,name,created_at').order('revision',{ascending:false});
  if(projectsRes.error)throw new Error(projectsRes.error.message);
  if(revisions.error)throw new Error(revisions.error.message);
  const latest=new Map<string,{revision:number;name:string;created_at:string}>();
  for(const r of revisions.data??[])if(!latest.has(r.project_id))latest.set(r.project_id,r);
  return (projectsRes.data??[]).map(p=>{
    const row=p as {id:string;name:string;created_at:string;working_version?:number;working_updated_at?:string|null};
    const l=latest.get(row.id);
    const hasWorking=(row.working_version??0)>0;
    const times=[l?.created_at,hasWorking?row.working_updated_at??undefined:undefined,row.created_at].filter(Boolean) as string[];
    return {id:row.id,name:row.name||l?.name||'Visite',created_at:row.created_at,revision:l?.revision??0,
      updated_at:times.sort().reverse()[0],autosave:hasWorking};
  });
}

/** Copie la structure du projet SANS dupliquer les (très longues) chaînes base64 : les chaînes sont immuables, on les partage. */
function cloneStructure<T>(value:T):T{
  if(Array.isArray(value))return value.map(cloneStructure) as unknown as T;
  if(value&&typeof value==='object'){
    const out:Record<string,unknown>={};
    for(const [k,v] of Object.entries(value as Record<string,unknown>))out[k]=cloneStructure(v);
    return out as T;
  }
  return value;
}

/** Médias déjà envoyés pendant cette session : on ne les relit, ne les recalcule et ne les renvoie pas à chaque enregistrement. */
const uploadedMedia=new Map<string,Map<string,string>>();
async function uploadMedia(snapshot:StudioProject,projectId:string,uid:string,onProgress:(msg:string)=>void){
  const db=supabase();
  const cache=uploadedMedia.get(projectId)??new Map<string,string>();
  uploadedMedia.set(projectId,cache);
  const slots=mediaSlots(snapshot).filter(s=>s.get()?.startsWith('data:'));
  const todo=slots.filter(s=>!cache.has(s.get()!)).length;
  let n=0;
  for(const slot of slots){
    const dataUrl=slot.get()!;
    const known=cache.get(dataUrl);
    if(known){slot.set(known);continue;}
    n++;
    onProgress('Envoi des médias '+n+'/'+todo+'…');
    const blob=await (await fetch(dataUrl)).blob();
    const path=uid+'/'+projectId+'/'+await sha256(blob)+'.'+(EXT[blob.type]??'bin');
    const {error}=await db.storage.from(BUCKET).upload(path,blob,{upsert:false,contentType:blob.type});
    // Un objet identique déjà présent (même hash) est un succès : on ne le réécrit jamais.
    if(error&&!/already exists|duplicate|409/i.test(error.message+' '+((error as {statusCode?:string}).statusCode??'')))
      throw new Error('Envoi d’un média impossible : '+error.message);
    cache.set(dataUrl,MEDIA_PREFIX+path);
    slot.set(MEDIA_PREFIX+path);
  }
}

export class CloudConflictError extends Error{
  cloudVersion:number;
  constructor(cloudVersion:number){super('Cette visite a été modifiée ailleurs dans le cloud.');this.name='CloudConflictError';this.cloudVersion=cloudVersion;}
}
/** Les tables / fonctions de sauvegarde automatique ne sont pas encore installées dans Supabase. */
export class CloudSetupError extends Error{constructor(message:string){super(message);this.name='CloudSetupError';}}
const setupMissing=(m:string)=>/Could not find the function|schema cache|working_version|working_updated_at|nvstudio_save_working|relation .* does not exist|does not exist/i.test(m);
const SETUP_HELP='La sauvegarde automatique n’est pas encore installée dans Supabase : exécute le fichier SQL « 20261110020000_nvstudio_autosave » (et « 20261110000000_nvstudio_init » si ce n’est pas déjà fait).';

/** Inserts a NEW immutable revision. `link` null => brand-new cloud project with a fresh UUID. */
export async function saveToCloud(project:StudioProject,link:CloudLink|null,onProgress:(msg:string)=>void):Promise<CloudLink>{
  const db=supabase();
  const uid=await currentUserId();
  let projectId=link?.projectId;
  let base=0;
  if(projectId){
    base=await latestRevision(projectId);
    if(base!==link!.revision){
      throw new Error('Le cloud contient la révision '+base+' alors que cette copie est basée sur la '+link!.revision+'. Enregistrement refusé pour ne rien écraser : ouvre la version cloud ou envoie-la comme nouvelle visite.');
    }
  }else{
    const {data,error}=await db.from('nvstudio_projects').insert({name:project.name.slice(0,200)||'Visite'}).select('id').single();
    if(error||!data)throw new Error('Création de la visite cloud impossible : '+(error?.message??'inconnue'));
    projectId=data.id as string;
  }
  const snapshot=cloneStructure(project);
  await uploadMedia(snapshot,projectId!,uid,onProgress);
  onProgress('Enregistrement de la révision…');
  const revision=base+1;
  const {error}=await db.from('nvstudio_revisions').insert({project_id:projectId,revision,name:project.name.slice(0,200)||'Visite',snapshot});
  if(error)throw new Error('Révision refusée (rien n’a été écrasé) : '+error.message);
  return {...(link??{}),projectId:projectId!,revision};   // conserve la version de la copie de travail déjà connue
}
export async function cloudLatestRevision(projectId:string):Promise<number>{return latestRevision(projectId);}

/** Numéro de version de la copie de travail dans le cloud (0 = jamais enregistrée). */
export async function fetchWorkingMeta(projectId:string):Promise<{version:number;updatedAt:string|null}>{
  const {data,error}=await supabase().from('nvstudio_projects').select('working_version,working_updated_at').eq('id',projectId).maybeSingle();
  if(error){if(setupMissing(error.message))throw new CloudSetupError(SETUP_HELP);throw new Error('Lecture du cloud impossible : '+error.message);}
  if(!data)throw new Error('Cette visite n’existe plus dans le cloud.');
  return {version:data.working_version as number,updatedAt:(data.working_updated_at as string|null)??null};
}

/**
 * Sauvegarde INSTANTANÉE : met à jour la copie de travail dans le cloud (en place, une ligne par visite).
 * Refuse (CloudConflictError) si une autre version a été enregistrée ailleurs depuis la dernière synchronisation de cet appareil.
 */
export async function saveWorking(project:StudioProject,link:CloudLink|null,onProgress:(msg:string)=>void):Promise<CloudLink>{
  const db=supabase();
  const uid=await currentUserId();
  let projectId=link?.projectId;
  let expected:number;
  if(!projectId){
    const {data,error}=await db.from('nvstudio_projects').insert({name:project.name.slice(0,200)||'Visite'}).select('id').single();
    if(error||!data){
      if(error&&setupMissing(error.message))throw new CloudSetupError(SETUP_HELP);
      throw new Error('Création de la visite cloud impossible : '+(error?.message??'inconnue'));
    }
    projectId=data.id as string;expected=0;
    writeLink({projectId,revision:0,version:0}); // mémorisé aussitôt : un échec ultérieur ne crée jamais de doublon
  }else{
    const meta=await fetchWorkingMeta(projectId);
    if(link!.version===undefined){
      if(meta.version!==0)throw new CloudConflictError(meta.version);
      expected=0;
    }else{
      if(meta.version!==link!.version)throw new CloudConflictError(meta.version);
      expected=link!.version;
    }
  }
  const snapshot=cloneStructure(project);
  await uploadMedia(snapshot,projectId,uid,onProgress);
  onProgress('Enregistrement…');
  const {data,error}=await db.rpc('nvstudio_save_working',{p_project:projectId,p_expected:expected,p_name:project.name.slice(0,200)||'Visite',p_snapshot:snapshot});
  if(error){
    if(/conflict/.test(error.message)){
      const meta=await fetchWorkingMeta(projectId);
      throw new CloudConflictError(meta.version);
    }
    if(setupMissing(error.message))throw new CloudSetupError(SETUP_HELP);
    if(/unknown_project/.test(error.message))throw new Error('Cette visite n’existe plus dans le cloud.');
    throw new Error('Enregistrement cloud refusé : '+error.message);
  }
  const version=(data as {version:number}).version;
  return {projectId,revision:link?.revision??0,version};
}

/** Remplace les références `nvmedia:` d'un instantané par les vrais médias téléchargés. */
async function hydrateSnapshot(snapshot:StudioProject,onProgress:(msg:string)=>void):Promise<StudioProject>{
  const db=supabase();
  const slots=mediaSlots(snapshot).filter(s=>s.get()?.startsWith(MEDIA_PREFIX));
  const cache=new Map<string,string>();
  let n=0;
  for(const slot of slots){
    n++;
    const ref=slot.get()!;
    const cached=cache.get(ref);
    if(cached){slot.set(cached);continue;}
    onProgress('Téléchargement des médias '+n+'/'+slots.length+'…');
    const {data:blob,error:dlError}=await db.storage.from(BUCKET).download(ref.slice(MEDIA_PREFIX.length));
    if(dlError||!blob)throw new Error('Média introuvable : '+(dlError?.message??ref));
    const dataUrl=await blobToDataUrl(blob);
    cache.set(ref,dataUrl);
    slot.set(dataUrl);
  }
  return validateProject(snapshot);
}
/** Ouvre la version la plus récente d'une visite : la copie de travail si elle existe, sinon la dernière révision. */
export async function openCloudProject(projectId:string,onProgress:(msg:string)=>void):Promise<{project:StudioProject;link:CloudLink}>{
  const db=supabase();
  let working:{working:unknown;working_version:number}|null=null;
  const w=await db.from('nvstudio_projects').select('working,working_version').eq('id',projectId).maybeSingle();
  if(!w.error&&w.data&&(w.data.working_version as number)>0&&w.data.working)working={working:w.data.working,working_version:w.data.working_version as number};
  if(working){
    const project=await hydrateSnapshot(working.working as StudioProject,onProgress);
    return {project,link:{projectId,revision:await latestRevision(projectId),version:working.working_version}};
  }
  const loaded=await loadFromCloud(projectId,onProgress);
  return {project:loaded.project,link:{...loaded.link,version:0}};
}

export async function loadFromCloud(projectId:string,onProgress:(msg:string)=>void):Promise<{project:StudioProject;link:CloudLink}>{
  const db=supabase();
  const {data,error}=await db.from('nvstudio_revisions').select('revision,snapshot').eq('project_id',projectId).order('revision',{ascending:false}).limit(1);
  if(error)throw new Error(error.message);
  const row=data?.[0];
  if(!row)throw new Error('Aucune révision pour cette visite.');
  const snapshot=row.snapshot as StudioProject;
  const project=await hydrateSnapshot(snapshot,onProgress);
  return {project,link:{projectId,revision:row.revision}};
}
