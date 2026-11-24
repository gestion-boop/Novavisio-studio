import {barKind} from './barKind';
import type {StudioProject} from './storage';

/** Numéro composable : chiffres et +, sans espaces ni points. */
export const diallable=(value?:string):string=>(value??'').replace(/[^0-9+]/g,'');
/** Nom complet de l'agent : « Prénom Nom ». */
export const agentFullName=(p?:StudioProject['clientProfile']):string=>[p?.agentFirstName,p?.agentLastName].map(x=>(x??'').trim()).filter(Boolean).join(' ');

/**
 * Reporte automatiquement la fiche client dans la visite, sans jamais écraser un choix manuel :
 * - téléphone (direct de l'agent, sinon celui de la fiche) → bouton « Appeler » de la barre (s'il existe et n'a pas déjà un autre lien) ;
 * - lien « Info » de l'agent → bouton « i » de la barre (s'il est vide) ;
 * - lien d'intro de la fiche → intro de la visite (seulement si la visite n'a pas déjà une intro).
 * La fonction est idempotente : la rappeler ne change rien si tout est déjà à jour.
 */
export function withClientAutomation(project:StudioProject):StudioProject{
  const client=project.clientProfile;
  if(!client)return project;
  let next=project;
  const number=diallable(client.agentPhone)||diallable(client.phone);
  if(number){
    const url='tel:'+number;
    const bar=project.bottomBar.map(item=>{
      if(barKind(item)!=='phone')return item;
      const current=(item.url??'').trim();
      // Un lien déjà personnalisé (autre que tel:) est respecté.
      if(current&&!current.startsWith('tel:'))return item;
      if(item.type==='lien'&&current===url)return item;
      return {...item,type:'lien' as const,url};
    });
    if(bar.some((item,i)=>item!==project.bottomBar[i]))next={...next,bottomBar:bar};
  }
  const info=(client.agentInfoUrl??'').trim();
  if(info&&/^https:\/\/[^\s]+$/i.test(info)){
    const bar=next.bottomBar.map(item=>{
      if(barKind(item)!=='info')return item;
      // Un bouton « i » qui a déjà son propre texte ou un autre lien est respecté.
      const current=(item.url??'').trim();
      if(item.text?.trim()||(current&&current!==info))return item;
      if(item.type==='lien'&&current===info)return item;
      return {...item,type:'lien' as const,url:info};
    });
    if(bar.some((item,i)=>item!==next.bottomBar[i]))next={...next,bottomBar:bar};
  }
  const intro=(client.introUrl??'').trim();
  if(intro&&/^https:\/\/[^\s]+$/i.test(intro)&&!project.introUrl){
    next={...next,introUrl:intro,introEnabled:true};
  }
  return next;
}
