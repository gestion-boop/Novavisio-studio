import './brandKitDialog.css';
import {useMemo,useState} from 'react';
import {STYLES,BRAND_COLOR_LABELS,generateBrand,checkContrast,contrastRatio,readableOn,toBarPatch,isHex,type BrandColors,type BrandKit,type StyleId} from './brandKit';
import {XMark} from './XMark';

/**
 * Fenêtre « Charte graphique » (NovaStudio AI — phase 1).
 * Rien n'est appliqué sans clic : « Appliquer à la barre » change les couleurs de la barre du bas ;
 * « Valider la charte » enregistre la charte dans le projet (réutilisable). Annulable à tout moment.
 */
export function BrandKitDialog({current,onApply,onClose}:{
  current?:BrandKit;
  onApply:(patch:ReturnType<typeof toBarPatch>,kit:BrandKit)=>void;
  onClose:()=>void;
}){
  const [styleId,setStyleId]=useState<StyleId>((current?.styleId as StyleId)||'moderne');
  const [seed,setSeed]=useState<string>(current?.seed&&isHex(current.seed)?current.seed:'#2f8fb5');
  const [colors,setColors]=useState<BrandColors>(current?.colors??generateBrand('#2f8fb5','moderne'));
  const [message,setMessage]=useState('');
  const issues=useMemo(()=>checkContrast(colors),[colors]);
  const blocking=issues.some(i=>i.level==='error');

  const regenerate=(id:StyleId,s:string)=>{setColors(generateBrand(s,id));};
  const pickStyle=(id:StyleId)=>{setStyleId(id);regenerate(id,seed);};
  const changeSeed=(v:string)=>{setSeed(v);if(isHex(v))regenerate(styleId,v);};
  const setColor=(k:keyof BrandColors,v:string)=>{if(isHex(v))setColors(c=>({...c,[k]:v}));};
  const kit:BrandKit={styleId,colors,validated:false,seed};

  return <div className="overlay nv-brand-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="modal nv-brand-dialog" role="dialog" aria-modal="true" aria-label="Charte graphique">
      <button className="close" onClick={onClose} aria-label="Fermer"><XMark/></button>
      <h2>Charte graphique <small>NovaStudio AI · phase 1</small></h2>
      <p className="hint">Choisis un style et une couleur de départ, puis ajuste chaque couleur. Rien n’est appliqué tant que tu ne cliques pas sur « Appliquer » ou « Valider ».</p>

      <div className="nv-brand-styles" role="radiogroup" aria-label="Style">
        {STYLES.map(s=><button key={s.id} type="button" role="radio" aria-checked={styleId===s.id}
          className={'nv-brand-style'+(styleId===s.id?' is-on':'')} onClick={()=>pickStyle(s.id)}>{s.label}</button>)}
      </div>

      <label className="nv-brand-seed">Couleur de départ
        <input type="color" value={seed} onChange={e=>changeSeed(e.target.value)} aria-label="Couleur de départ"/>
        <input value={seed} onChange={e=>changeSeed(e.target.value)} maxLength={7} aria-label="Couleur de départ (HEX)"/>
      </label>

      <div className="nv-brand-colors">
        {(Object.keys(BRAND_COLOR_LABELS) as Array<keyof BrandColors>).map(k=><label key={k} className="nv-brand-color">
          <span>{BRAND_COLOR_LABELS[k]}</span>
          <input type="color" value={colors[k]} onChange={e=>setColor(k,e.target.value)} aria-label={BRAND_COLOR_LABELS[k]}/>
          <input value={colors[k]} maxLength={7} onChange={e=>setColor(k,e.target.value)} aria-label={BRAND_COLOR_LABELS[k]+' (HEX)'}/>
        </label>)}
      </div>

      <div className="nv-brand-preview" style={{background:colors.background,color:colors.text,borderColor:colors.border}}>
        <div className="nv-brand-preview-buttons">
          {([['Repos',colors.btnRest],['Survol',colors.btnHover],['Appui',colors.btnPressed]] as const).map(([label,bg])=>
            <span key={label} className="nv-brand-preview-btn" style={{background:bg,color:readableOn(bg),boxShadow:'0 0 0 2px '+colors.glow+'55'}}>{label}</span>)}
        </div>
        <small>Texte sur fond : {contrastRatio(colors.text,colors.background).toFixed(1)} : 1</small>
      </div>

      {issues.length>0&&<ul className="nv-brand-issues" role="status">
        {issues.map((i,n)=><li key={n} className={'is-'+i.level}>{i.level==='error'?'⛔':'⚠'} {i.text}</li>)}
      </ul>}
      {!issues.length&&<p className="hint-inline">✓ Contrastes conformes (AA).</p>}
      {message&&<p className="hint-inline" role="status">{message}</p>}

      <div className="nv-brand-actions">
        <button type="button" className="quiet" onClick={onClose}>Annuler</button>
        <button type="button" className="quiet" disabled={blocking}
          onClick={()=>{onApply(toBarPatch(colors),kit);setMessage('Couleurs appliquées à la barre du bas.');}}>Appliquer à la barre</button>
        <button type="button" className="primary" disabled={blocking}
          onClick={()=>{onApply(toBarPatch(colors),{...kit,validated:true});setMessage('Charte validée et enregistrée dans le projet.');}}>Valider la charte</button>
      </div>
    </section>
  </div>;
}
