import {useState} from 'react';
import type {Hotspot} from './storage';
import {PreparationDialog} from './PreparationControls';
export const INFO_FONTS=['Arial','Verdana','Helvetica','Tahoma','Trebuchet MS','Georgia','Times New Roman','Palatino','Garamond','Courier New'] as const;
export const informationFont=(value?:string)=>INFO_FONTS.find(font=>font===value)??'Arial';
export function InformationEditor({point,onSave,onClose}:{point:Hotspot;onSave:(patch:Partial<Hotspot>)=>void;onClose:()=>void}){
 const [text,setText]=useState(point.text),[title,setTitle]=useState(point.title),[font,setFont]=useState(informationFont(point.fontFamily));
 return <PreparationDialog title="Rédiger l’information" onClose={onClose}><div className="nv-preparation-content nv-information-form">
 <label>Titre<input value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/></label>
 <label>Police<select aria-label="Police" value={font} onChange={e=>setFont(informationFont(e.target.value))}>{INFO_FONTS.map(f=><option key={f} style={{fontFamily:f}}>{f}</option>)}</select></label>
 <label>Texte de l’information<textarea aria-label="Texte de l’information" autoFocus rows={9} maxLength={8000} style={{fontFamily:font+', Arial, sans-serif'}} value={text} onChange={e=>setText(e.target.value)}/></label>
 <small>Les polices disponibles sur l’appareil du visiteur sont utilisées, avec Arial en remplacement.</small>
 <div className="nv-information-preview" style={{fontFamily:font+', Arial, sans-serif'}}><strong>{title}</strong><p className="preserve">{text||'Aperçu du texte'}</p></div>
 <button type="button" onClick={()=>{onSave({title,text,fontFamily:font});onClose();}}>Valider l’information</button></div></PreparationDialog>;
}
