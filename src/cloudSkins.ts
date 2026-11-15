import {BUCKET,supabase} from './cloud';
import {applySkin,captureSkin,validateSkin,type Skin} from './skins';
import type {StudioProject} from './storage';

/** Bibliothèque Cloud : modèles privés par utilisateur Supabase.
 * Les PNG/WebP sont dans le bucket privé existant, jamais uniquement dans localStorage.
 */
type DbSkin={id:string;owner_id:string;name:string;appearance:StudioProject;is_default:boolean;updated_at:string};
export type CloudSkin=Skin&{isDefault:boolean};
const PREFIX='nvmedia:';
const MEDIA_CACHE=new Map<string,string>();
function dataUrlBlob(dataUrl:string):Promise<Blob>{return fetch(dataUrl).then(r=>r.blob());}
function toDataUrl(blob:Blob):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result));
  reader.onerror=()=>reject(reader.error);
  reader.readAsDataURL(blob);
 });
}
async function currentUser():Promise<string>{
 const {data,error}=await supabase().auth.getUser();
 if(error||!data.user)throw Error('Connecte-toi à ton compte Cloud Supabase dans NovaStudio.');
 return data.user.id;
}
async function hashBlob(blob:Blob):Promise<string>{
 const bytes=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
async function uploadIcons(skin:Skin,uid:string):Promise<StudioProject>{
 const appearance={...skin.appearance,icons:skin.appearance.icons.map(icon=>({...icon}))};
 // Share objects by content hash within this user's folder; never overwrite.
 const cache=new Map<string,string>();
 for(const icon of appearance.icons){
  if(!icon.dataUrl.startsWith('data:'))continue;
  const known=cache.get(icon.dataUrl);
  if(known){icon.dataUrl=known;continue;}
  const original=icon.dataUrl,blob=await dataUrlBlob(original);
  const ext=blob.type==='image/png'?'png':blob.type==='image/jpeg'?'jpg':blob.type==='image/gif'?'gif':'webp';
  const path=uid+'/skins/'+await hashBlob(blob)+'.'+ext;
  const {error}=await supabase().storage.from(BUCKET).upload(path,blob,{contentType:blob.type,upsert:false});
  if(error&&!/already exists|duplicate|409/i.test(error.message+' '+((error as {statusCode?:string}).statusCode??'')))throw Error('Stockage de l’icône « '+icon.name+' » impossible : '+error.message);
  const ref=PREFIX+path;cache.set(original,ref);MEDIA_CACHE.set(ref,original);icon.dataUrl=ref;
 }
 return appearance;
}
async function hydrateSkin(row:DbSkin):Promise<CloudSkin>{
 const icons=await Promise.all(row.appearance.icons.map(async icon=>{
  if(!icon.dataUrl.startsWith(PREFIX))return icon;
  const ref=icon.dataUrl;
  let image=MEDIA_CACHE.get(ref);
  if(!image){
   const {data,error}=await supabase().storage.from(BUCKET).download(ref.slice(PREFIX.length));
   if(error||!data)throw Error('Téléchargement d’icône impossible : '+(error?.message??icon.name));
   image=await toDataUrl(data);MEDIA_CACHE.set(ref,image);
  }
  return {...icon,dataUrl:image};
 }));
 const appearance={...row.appearance,icons};
 return {...validateSkin({version:1,id:row.id,name:row.name,updatedAt:row.updated_at,appearance}),isDefault:row.is_default};
}
export async function cloudListSkins():Promise<CloudSkin[]>{
 await currentUser();
 const {data,error}=await supabase().from('nvstudio_skins').select('id,owner_id,name,appearance,is_default,updated_at').order('updated_at',{ascending:false});
 if(error)throw Error('Impossible de charger les modèles Cloud : '+error.message);
 return Promise.all(((data??[]) as DbSkin[]).map(hydrateSkin));
}
export async function cloudSaveSkin(skin:Skin):Promise<void>{
 const uid=await currentUser();
 const value=validateSkin(skin);
 const appearance=await uploadIcons(value,uid);
 // Never unset the existing default when overwriting an existing model.
 const {data:previous,error:readError}=await supabase().from('nvstudio_skins').select('is_default').eq('id',value.id).maybeSingle();
 if(readError)throw Error(readError.message);
 const {error}=await supabase().from('nvstudio_skins').upsert({
  id:value.id,owner_id:uid,name:value.name,appearance,is_default:previous?.is_default??false,updated_at:new Date().toISOString()
 },{onConflict:'id'});
 if(error)throw Error('Enregistrement du modèle Cloud impossible : '+error.message);
}
export async function cloudDeleteSkin(id:string):Promise<void>{
 await currentUser();
 const {error}=await supabase().from('nvstudio_skins').delete().eq('id',id);
 if(error)throw Error('Suppression Cloud impossible : '+error.message);
 // Les objets média partagés restent intacts pour ne pas endommager d'autres modèles.
}
export async function cloudSetDefaultSkin(id:string|null):Promise<void>{
 await currentUser();
 const db=supabase();
 const {error:clearError}=await db.from('nvstudio_skins').update({is_default:false}).eq('is_default',true);
 if(clearError)throw Error('Impossible de changer le modèle par défaut : '+clearError.message);
 if(id){
  const {data,error}=await db.from('nvstudio_skins').update({is_default:true}).eq('id',id).select('id').single();
  if(error||!data)throw Error('Impossible de définir le modèle par défaut : '+(error?.message??'introuvable'));
 }
}
export async function cloudNewProjectFromDefault():Promise<StudioProject>{
 const {newProject}=await import('./storage');
 const fresh=newProject();
 try{
  const uid=await currentUser();
  const {data,error}=await supabase().from('nvstudio_skins').select('id,owner_id,name,appearance,is_default,updated_at').eq('owner_id',uid).eq('is_default',true).maybeSingle();
  if(error)throw Error(error.message);
  if(!data)return fresh;
  return applySkin(fresh,await hydrateSkin(data as DbSkin));
 }catch(error){
  // No silent local fallback: caller can preserve the open visit on Cloud failure.
  throw Error('Impossible de charger le modèle Cloud par défaut : '+String(error));
 }
}
export async function cloudHasDefaultSkin():Promise<boolean>{
 const uid=await currentUser();
 const {data,error}=await supabase().from('nvstudio_skins').select('id').eq('owner_id',uid).eq('is_default',true).maybeSingle();
 if(error)throw Error(error.message);
 return !!data;
}
