import {useEffect} from 'react';
import './nativeIntro.css';
import type {IntroDesign} from './introDesign';
import {readableOn} from './brandKit';

/**
 * Introduction native : texte, logo, style et animation. Durée stricte, bouton « Découvrir » pour passer tout de suite.
 * Aucun réseau : seul le logo (déjà dans le projet) est affiché. Respecte le mouvement réduit.
 */
export function NativeIntro({design,background,accent,durationSec,onDone}:{
  design:IntroDesign;background:string;accent:string;durationSec:number;onDone:()=>void;
}){
  useEffect(()=>{
    const ms=Math.max(2,Math.min(60,durationSec))*1000;
    const fade=Math.min(350,ms/4);
    const a=window.setTimeout(()=>{const el=document.querySelector('.nv-native-intro');el?.classList.add('is-ending');},ms-fade);
    const b=window.setTimeout(onDone,ms);
    return ()=>{window.clearTimeout(a);window.clearTimeout(b);};
  },[durationSec,onDone]);
  const text=readableOn(background);
  return <div className={'nv-native-intro is-'+design.styleId+' is-anim-'+design.animation} role="dialog" aria-label="Introduction de la visite"
    style={{'--ni-bg':background,'--ni-accent':accent,'--ni-text':text} as React.CSSProperties}>
    {design.logoDataUrl&&<img className="nv-ni-logo" src={design.logoDataUrl} alt=""/>}
    {design.title&&<h1 className="nv-ni-title">{design.title}</h1>}
    {design.subtitle&&<p className="nv-ni-sub">{design.subtitle}</p>}
    <button type="button" className="nv-ni-button" onClick={onDone}>{design.buttonLabel||'Découvrir'}</button>
  </div>;
}
