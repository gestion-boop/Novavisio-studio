import {useEffect,useRef,useState} from 'react';
import './nativeIntro.css';
import type {IntroDesign} from './introDesign';
import {readableOn} from './brandKit';
import {trimIcon} from './iconFit';
import {IntroIris} from './introIris';

/**
 * Introduction native : texte, logo, style et animation. Durée stricte, bouton « Découvrir » pour passer tout de suite.
 * Aucun réseau : seul le logo (déjà dans le projet) est affiché. Respecte le mouvement réduit.
 */
export function NativeIntro({design,background,accent,cover,durationSec,onDone}:{
  design:IntroDesign;background:string;accent:string;cover?:string;durationSec:number;onDone:()=>void;
}){
  const intro=useRef<HTMLDivElement>(null);
  const roundLogo=design.logoShape==='round'?design.logoDataUrl:undefined;
  const [trimmed,setTrimmed]=useState<{original:string;src:string}>();
  useEffect(()=>{
    if(!roundLogo)return;
    let active=true;
    void trimIcon(roundLogo).then(src=>{if(active)setTrimmed({original:roundLogo,src});});
    return ()=>{active=false;};
  },[roundLogo]);
  const logo=roundLogo&&trimmed?.original===roundLogo?trimmed.src:design.logoDataUrl;
  useEffect(()=>{
    const ms=Math.max(2,Math.min(60,durationSec))*1000;
    const fade=Math.min(350,ms/4);
    const a=window.setTimeout(()=>{intro.current?.classList.add('is-ending');},ms-fade);
    const b=window.setTimeout(onDone,ms);
    return ()=>{window.clearTimeout(a);window.clearTimeout(b);};
  },[durationSec,onDone]);
  const staged=design.animation==='iris'||design.animation==='curtain'||design.animation==='sweep';
  const hasCover=staged&&!!cover;
  const text=hasCover?'#fff':readableOn(background);
  return <div ref={intro} className={'nv-native-intro is-'+design.styleId+' is-anim-'+design.animation+(staged?' nv-ni-staged':'')+(hasCover?' nv-ni-has-cover':'')} role="dialog" aria-label="Introduction de la visite"
    style={{'--ni-bg':background,'--ni-accent':accent,'--ni-text':text} as React.CSSProperties}>
    {design.animation==='iris'&&<IntroIris/>}
    {hasCover&&<div className="nv-ni-cover" aria-hidden="true"><img src={cover} alt=""/></div>}
    {logo&&<img className={'nv-ni-logo nv-ni-logo-'+(design.logoShape??'original')} src={logo} alt=""/>}
    {design.title&&<h1 className="nv-ni-title">{design.title}</h1>}
    {design.subtitle&&<p className="nv-ni-sub">{design.subtitle}</p>}
    <button type="button" className="nv-ni-button" style={{color:readableOn(accent)}} onClick={onDone}>{design.buttonLabel||'Découvrir'}</button>
  </div>;
}
