import {supabase} from './cloud';
import {emptyClientProfile,type StudioProject} from './storage';
import {withClientAutomation} from './clientAutomation';

/** Agent immobilier (Paramètres > Agents immobiliers) : saisi une fois, proposé à la création de chaque visite. */
export type Agent={id:string;firstName:string;lastName:string;phone:string;infoUrl:string;introUrl:string};
type Row={id:string;first_name:string;last_name:string;phone:string;info_url:string;intro_url:string};
export const emptyAgent=():Agent=>({id:'',firstName:'',lastName:'',phone:'',infoUrl:'',introUrl:''});
export const agentLabel=(a:Pick<Agent,'firstName'|'lastName'>):string=>[a.firstName,a.lastName].map(x=>x.trim()).filter(Boolean).join(' ')||'Agent sans nom';
const httpsOrEmpty=(v:string)=>!v.trim()||/^https:\/\/[^\s]+$/i.test(v.trim());
/** Retourne le message d'erreur à afficher, ou null si la fiche est valide. */
export function agentError(a:Agent):string|null{
  if(!a.firstName.trim()&&!a.lastName.trim())return 'Saisis au moins un nom ou un prénom.';
  if(!httpsOrEmpty(a.infoUrl))return 'Le lien Info doit commencer par https://';
  if(!httpsOrEmpty(a.introUrl))return 'Le lien de l’intro doit commencer par https://';
  return null;
}
const fromRow=(r:Row):Agent=>({id:r.id,firstName:r.first_name,lastName:r.last_name,phone:r.phone,infoUrl:r.info_url,introUrl:r.intro_url});
const COLS='id,first_name,last_name,phone,info_url,intro_url';

export async function listAgents():Promise<Agent[]>{
  const {data,error}=await supabase().from('nvstudio_agents').select(COLS).order('last_name').order('first_name');
  if(error)throw new Error('Agents indisponibles : '+error.message);
  return ((data??[]) as Row[]).map(fromRow);
}
export async function saveAgent(a:Agent):Promise<Agent>{
  const err=agentError(a);if(err)throw new Error(err);
  const row={first_name:a.firstName.trim().slice(0,80),last_name:a.lastName.trim().slice(0,80),phone:a.phone.trim().slice(0,40),info_url:a.infoUrl.trim().slice(0,2048),intro_url:a.introUrl.trim().slice(0,2048),updated_at:new Date().toISOString()};
  const q=a.id?supabase().from('nvstudio_agents').update(row).eq('id',a.id):supabase().from('nvstudio_agents').insert(row);
  const {data,error}=await q.select(COLS).single();
  if(error)throw new Error('Enregistrement impossible : '+error.message);
  return fromRow(data as Row);
}
export async function deleteAgent(id:string):Promise<void>{
  const {error}=await supabase().from('nvstudio_agents').delete().eq('id',id);
  if(error)throw new Error('Suppression impossible : '+error.message);
}

/** Pré-saisit la visite avec l'agent : fiche (nom, téléphone, liens) puis report sur le bouton Appeler, le bouton « i » et l'intro. */
export function applyAgent(project:StudioProject,agent:Agent):StudioProject{
  const base=project.clientProfile??emptyClientProfile();
  const clientProfile={...base,agentFirstName:agent.firstName,agentLastName:agent.lastName,agentPhone:agent.phone,agentInfoUrl:agent.infoUrl,introUrl:agent.introUrl};
  // Le choix de l'agent remplace l'intro de l'agent précédent, mais jamais une intro choisie à la main ou venant d'un skin.
  const previousIntro=(project.clientProfile?.introUrl??'').trim();
  const resetIntro=!!previousIntro&&project.introUrl===previousIntro?{introUrl:''}:{};
  return withClientAutomation({...project,...resetIntro,clientProfile});
}
