import {useState} from 'react';
import type {Hotspot} from './storage';
import {PreparationDialog} from './PreparationControls';
import {TranslationInputs,type TranslationMap} from './TranslationFields';
export const INFO_FONTS=['Arial','Verdana','Helvetica','Tahoma','Trebuchet MS','Georgia','Times New Roman','Palatino','Garamond','Courier New'] as const;
export const informationFont=(value?:string)=>INFO_FONTS.find(font=>font===value)??'Arial';
export function InformationEditor({point,onSave,onClose}:{point:Hotspot;onSave:(patch:Partial<Hotspot>)=>void;onClose:()=>void}){
 const [text,setText]=useState(point.text),[title,setTitle]=useState(point.title),[font,setFont]=useState(informationFont(point.fontFamily));
 const [translations,setTranslations]=useState<Hotspot['translations']>(point.translations),[note,setNote]=useState('');
 const [titleTranslations,setTitleTranslations]=useState<TranslationMap>(point.titleTranslations??{});
 /** Récupère le texte d'une page liée (mini-site NovaVisio avec /vr.json) pour l'afficher dans la fenêtre du casque. */
 const importFromPage=async()=>{
  setNote('Lecture de la page…');
  try{
   const res=await fetch(new URL('vr.json',point.url).href);if(!res.ok)throw new Error('absent');
   type Doc={pages?:{title?:string;text?:string}[];languages?:Record<string,Doc>};
   const data=await res.json() as Doc;
   const langs=data.languages??{fr:data};
   const toText=(d?:Doc)=>(d?.pages??[]).filter(p=>typeof p.text==='string').map(p=>(p.title?p.title+'\n':'')+p.text).join('\n\n').slice(0,8000);
   const fr=toText(langs.fr??Object.values(langs)[0]);
   if(!fr)throw new Error('vide');
   setText(fr);
   const tr:NonNullable<Hotspot['translations']>={};
   for(const l of ['en','es','de','nl'] as const){const t=toText(langs[l]);if(t)tr[l]=t;}
   setTranslations(tr);
   setNote('✓ Texte importé ('+(1+Object.keys(tr).length)+' langue'+(Object.keys(tr).length?'s':'')+'). Relis-le puis valide.');
  }catch{setNote('Cette page ne propose pas de version texte pour le casque : écris le texte ci-dessous.');}
 };
 return <PreparationDialog title="Rédiger l’information" onClose={onClose}><div className="nv-preparation-content nv-information-form">
 <label>Titre<input value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/></label>
 <TranslationInputs label="Titre traduit" values={titleTranslations} onChange={setTitleTranslations} maxLength={120}/>
 <label>Police<select aria-label="Police" value={font} onChange={e=>setFont(informationFont(e.target.value))}>{INFO_FONTS.map(f=><option key={f} style={{fontFamily:f}}>{f}</option>)}</select></label>
 <label>Texte de l’information<textarea aria-label="Texte de l’information" autoFocus rows={9} maxLength={8000} style={{fontFamily:font+', Arial, sans-serif'}} value={text} onChange={e=>setText(e.target.value)}/></label>
 {point.url&&/^https:\/\//i.test(point.url)&&<><button type="button" className="import" onClick={()=>void importFromPage()}>📥 Importer le texte de la page liée (pour le casque)</button>{note&&<small>{note}</small>}</>}
 <TranslationInputs label="Texte traduit" values={translations} onChange={setTranslations} multiline maxLength={8000}/>
 <small>Dans le casque, cette information s’affiche dans une fenêtre : mets-y les informations utiles. Les polices disponibles sur l’appareil du visiteur sont utilisées, avec Arial en remplacement.</small>
 <div className="nv-information-preview" style={{fontFamily:font+', Arial, sans-serif'}}><strong>{title}</strong><p className="preserve">{text||'Aperçu du texte'}</p></div>
 <button type="button" onClick={()=>{onSave({title,text,fontFamily:font,translations,titleTranslations});onClose();}}>Valider l’information</button></div></PreparationDialog>;
}
