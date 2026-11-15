/** Champs de traduction (anglais, espagnol, allemand, néerlandais) à côté d'un texte français. */
export const TRANSLATED_LANGS = [
  {code:'en',label:'Anglais',flag:'🇬🇧'},
  {code:'es',label:'Espagnol',flag:'🇪🇸'},
  {code:'de',label:'Allemand',flag:'🇩🇪'},
  {code:'nl',label:'Néerlandais',flag:'🇳🇱'},
] as const;
export type TranslationMap = Partial<Record<'en'|'es'|'de'|'nl',string>>;

export function TranslationInputs({values,onChange,multiline=false,maxLength=200,label='Traductions'}:{
  values:TranslationMap|undefined;onChange:(next:TranslationMap)=>void;multiline?:boolean;maxLength?:number;label?:string;
}){
  return <div className="nv-translation-fields" role="group" aria-label={label}>
    <small>{label} (laisser vide = texte français)</small>
    {TRANSLATED_LANGS.map(l=>{
      const value=values?.[l.code]??'';
      const set=(text:string)=>onChange({...values,[l.code]:text});
      return <label key={l.code}>{l.flag} {l.label}
        {multiline
          ? <textarea rows={4} maxLength={maxLength} value={value} onChange={e=>set(e.target.value)}/>
          : <input value={value} maxLength={maxLength} onChange={e=>set(e.target.value)}/>}
      </label>;
    })}
  </div>;
}
