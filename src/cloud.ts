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
const BUCKET='nvstudio-media';
const MEDIA_PREFIX='nvmedia:';

let client:SupabaseClient|null=null;
export function supabase():SupabaseClient{
  if(!cloudConfigured)throw new Error('Supabase n’est pas configuré (URL + clé publishable).');
  client??=createClient(URL_ENV!,KEY_ENV!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
}

export type CloudLink={projectId:string;revision:number};
const LINK_KEY='nvstudio-cloud-link';
export function readLink():CloudLink|null{
  try{
    const v=JSON.parse(localStorage.getItem(LINK_KEY)||'null');
    return v&&typeof v.projectId==='string'&&Number.isInteger(v.revision)?v:null;
  }catch{return null;}
}
export function writeLink(link:CloudLink|null){
  try{if(link)localStorage.setItem(LINK_KEY,JSON.stringify(link));else localStorage.removeItem(LINK_KEY);}catch{/* storage unavailable */}
}

type Slot={get:()=>string|undefined;set:(v:string)=>void};
function mediaSlots(p:StudioProject):Slot[]{
  const slots:Slot[]=[];
  const add=<T extends object>(o:T,key:keyof T)=>slots.push({
    get:()=>{const v=o[key];return typeof v==='string'?v:undefined;},
    set:v=>{(o as Record<keyof T,unknown>)[key]=v;}
  });
  p.icons.forEach(i=>add(i,'dataUrl'));
  p.audioTracks.forEach(t=>add(t,'dataUrl'));
  p.scenes.forEach(s=>{
    add(s,'dataUrl');add(s,'audioDataUrl');
    s.hotspots.forEach(h=>{add(h,'imageDataUrl');add(h,'videoDataUrl');});
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

export type CloudProject={id:string;name:string;created_at:string;revision:number;updated_at:string};
export async function listCloudProjects():Promise<CloudProject[]>{
  const db=supabase();
  const [projects,revisions]=await Promise.all([
    db.from('nvstudio_projects').select('id,name,created_at').order('created_at',{ascending:false}),
    db.from('nvstudio_revisions').select('project_id,revision,name,created_at').order('revision',{ascending:false})
  ]);
  if(projects.error)throw new Error(projects.error.message);
  if(revisions.error)throw new Error(revisions.error.message);
  const latest=new Map<string,{revision:number;name:string;created_at:string}>();
  for(const r of revisions.data??[])if(!latest.has(r.project_id))latest.set(r.project_id,r);
  return (projects.data??[]).map(p=>{
    const l=latest.get(p.id);
    return {id:p.id,name:l?.name??p.name,created_at:p.created_at,revision:l?.revision??0,updated_at:l?.created_at??p.created_at};
  });
}

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
  const snapshot=structuredClone(project);
  const slots=mediaSlots(snapshot).filter(s=>s.get()?.startsWith('data:'));
  const done=new Map<string,string>();
  let n=0;
  for(const slot of slots){
    n++;
    const dataUrl=slot.get()!;
    const known=done.get(dataUrl);
    if(known){slot.set(known);continue;}
    onProgress('Envoi des médias '+n+'/'+slots.length+'…');
    const blob=await (await fetch(dataUrl)).blob();
    const path=uid+'/'+projectId+'/'+await sha256(blob)+'.'+(EXT[blob.type]??'bin');
    const {error}=await db.storage.from(BUCKET).upload(path,blob,{upsert:false,contentType:blob.type});
    // Un objet identique déjà présent (même hash) est un succès : on ne le réécrit jamais.
    if(error&&!/already exists|duplicate|409/i.test(error.message+' '+((error as {statusCode?:string}).statusCode??'')))
      throw new Error('Envoi d’un média impossible : '+error.message);
    done.set(dataUrl,MEDIA_PREFIX+path);
    slot.set(MEDIA_PREFIX+path);
  }
  onProgress('Enregistrement de la révision…');
  const revision=base+1;
  const {error}=await db.from('nvstudio_revisions').insert({project_id:projectId,revision,name:project.name.slice(0,200)||'Visite',snapshot});
  if(error)throw new Error('Révision refusée (rien n’a été écrasé) : '+error.message);
  return {projectId:projectId!,revision};
}

export async function loadFromCloud(projectId:string,onProgress:(msg:string)=>void):Promise<{project:StudioProject;link:CloudLink}>{
  const db=supabase();
  const {data,error}=await db.from('nvstudio_revisions').select('revision,snapshot').eq('project_id',projectId).order('revision',{ascending:false}).limit(1);
  if(error)throw new Error(error.message);
  const row=data?.[0];
  if(!row)throw new Error('Aucune révision pour cette visite.');
  const snapshot=row.snapshot as StudioProject;
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
  return {project:validateProject(snapshot),link:{projectId,revision:row.revision}};
}
