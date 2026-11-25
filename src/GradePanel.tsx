import {GRADE_KEYS,GRADE_LABELS,SOFTER_GRADE,ZERO_GRADE,normalizeGrade,type PhotoGrade} from './photoGrade';

/** Retouche de la photo du panorama affiché, en direct. N'agit pas sur les logos, photos et télés incrustés. */
export function GradePanel({grade,onChange,onApplyTo,spaceCount,totalCount}:{
  grade?:PhotoGrade;onChange:(next:PhotoGrade|undefined)=>void;
  onApplyTo:(scope:'space'|'project')=>void;spaceCount:number;totalCount:number;
}){
  const current={...ZERO_GRADE,...grade};
  const set=(key:keyof PhotoGrade,value:number)=>onChange(normalizeGrade({...current,[key]:value})??undefined);
  return <div className="nv-grade-panel">
    <p className="hint">Règle l’image du panorama en direct, sans refaire la photo. Les logos, photos et télés incrustés ne changent pas.</p>
    {GRADE_KEYS.map(key=><label key={key} className="nv-grade-row">
      <span>{GRADE_LABELS[key]}</span><b>{current[key]>0?'+':''}{current[key]}</b>
      <input type="range" min="-100" max="100" step="1" value={current[key]} aria-label={GRADE_LABELS[key]} onChange={e=>set(key,Number(e.target.value))} onDoubleClick={()=>set(key,0)}/>
    </label>)}
    <div className="nv-grade-actions">
      <button type="button" onClick={()=>onChange({...SOFTER_GRADE})}>Moins « hôpital » (−10 / −10 / −10)</button>
      <button type="button" disabled={!grade} onClick={()=>onChange(undefined)}>Réinitialiser</button>
    </div>
    <div className="nv-grade-actions">
      <button type="button" disabled={!grade} onClick={()=>onApplyTo('space')}>Appliquer à ce dossier ({spaceCount})</button>
      <button type="button" disabled={!grade} onClick={()=>onApplyTo('project')}>Appliquer à tous les panoramas ({totalCount})</button>
    </div>
    <small className="hint-inline">Double-clic sur un curseur : retour à 0. Exposition −10, Température −10 et Points forts −10 donnent une image un peu plus sombre, moins froide, avec des zones claires adoucies.</small>
  </div>;
}
