/** Champs de traduction (anglais, espagnol, allemand, néerlandais) à côté d'un texte français. */
import {useState} from 'react';
import {cloudConfigured} from './cloud';
import {translateWithAI} from './freellm';

export const TRANSLATED_LANGS = [
  {code:'en',label:'Anglais',flag:'🇬🇧'},
  {code:'es',label:'Espagnol',flag:'🇪🇸'},
  {code:'de',label:'Allemand',flag:'🇩🇪'},
  {code:'nl',label:'Néerlandais',flag:'🇳🇱'},
] as const;
export type TranslationMap = Partial<Record<'en'|'es'|'de'|'nl',string>>;

export function TranslationInputs({values,onChange,multiline=false,maxLength=200,label='Traductions',source}:{
  values:TranslationMap|undefined;onChange:(next:TranslationMap)=>void;multiline?:boolean;maxLength?:number;label?:string;
  /** Texte français à traduire automatiquement (active le bouton IA). */
  source?:string;
}){
  const [busy,setBusy]=useState(false),[note,setNote]=useState('');
  const text=(source??'').trim();
  const autoTranslate=async()=>{
    const filled=TRANSLATED_LANGS.filter(l=>values?.[l.code]?.trim());
    const overwrite=filled.length>0&&window.confirm('Remplacer aussi les traductions déjà saisies ?\nOK = tout retraduire · Annuler = compléter seulement les champs vides');
    const langs=TRANSLATED_LANGS.map(l=>l.code).filter(c=>overwrite||!values?.[c]?.trim());
    if(!langs.length){setNote('Toutes les langues sont déjà remplies.');return;}
    setBusy(true);setNote('Traduction en cours…');
    try{
      const result=await translateWithAI(text,maxLength,langs);
      onChange({...values,...result});
      setNote('✓ '+Object.keys(result).length+' langue(s) traduite(s). Relis avant de valider.');
    }catch(e){setNote((e as Error).message);}
    finally{setBusy(false);}
  };
  return <div className="nv-translation-fields" role="group" aria-label={label}>
    <small>{label} (laisser vide = texte français)</small>
    {source!==undefined&&cloudConfigured&&<button type="button" className="import" disabled={busy||!text} onClick={()=>void autoTranslate()}>
      {busy?'⏳ Traduction…':'✨ Traduire automatiquement'}
    </button>}
    {note&&<small role="status">{note}</small>}
    {TRANSLATED_LANGS.map(l=>{
      const value=values?.[l.code]??'';
      const set=(t:string)=>onChange({...values,[l.code]:t});
      return <label key={l.code}>{l.flag} {l.label}
        {multiline
          ? <textarea rows={4} maxLength={maxLength} value={value} onChange={e=>set(e.target.value)}/>
          : <input value={value} maxLength={maxLength} onChange={e=>set(e.target.value)}/>}
      </label>;
    })}
  </div>;
}
