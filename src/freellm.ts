/** Appels IA via FreeLLMAPI, toujours par le proxy serveur /api/freellm (compte administrateur). */
import {cloudConfigured,supabase} from './cloud';
import type {TranslationMap} from './TranslationFields';

async function callFreeLLM<T>(body:Record<string,unknown>):Promise<T>{
  if(!cloudConfigured)throw Error('Le Cloud NovaStudio doit être configuré pour utiliser l’IA.');
  const {data,error}=await supabase().auth.getSession();
  if(error||!data.session?.access_token)throw Error('Connecte-toi au Cloud NovaStudio pour utiliser l’IA.');
  const response=await fetch('/api/freellm',{
    method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+data.session.access_token},
    body:JSON.stringify(body),cache:'no-store'
  });
  const result=await response.json().catch(()=>({error:'Service IA indisponible.'}));
  if(!response.ok)throw Error(result.error||'Erreur du service IA.');
  return result as T;
}

export async function translateWithAI(text:string,maxLength:number,langs:string[]):Promise<TranslationMap>{
  const r=await callFreeLLM<{translations:TranslationMap}>({mode:'translate',text,maxLength,langs});
  return r.translations;
}
