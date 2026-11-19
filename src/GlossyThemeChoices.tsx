import {useState,type Dispatch,type SetStateAction} from 'react';
import type {StudioProject} from './storage';
import {GLOSSY_THEMES,applyGlossyTheme} from './glossyThemes';

/** Texte lisible : sombre sur un fond clair, clair sur un fond sombre. */
function readableOn(background:string):string{
  const n=parseInt(background.slice(1),16);
  const lum=(0.299*((n>>16)&255)+0.587*((n>>8)&255)+0.114*(n&255))/255;
  return lum>0.6?'#1b2a33':'#f7f5ef';
}

/** Choix d'un des 12 thèmes glossy NovaStudio à la création d'une visite. */
export function GlossyThemeChoices({project,setProject}:{project:StudioProject;setProject:Dispatch<SetStateAction<StudioProject>>}){
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function choose(id:string){
    const theme=GLOSSY_THEMES.find(t=>t.id===id);
    if(!theme||busy)return;
    setBusy(true);setMessage('Création des icônes « '+theme.name+' »…');
    try{
      const next=await applyGlossyTheme(project,theme);
      setProject(next);
      setMessage('Thème « '+theme.name+' » appliqué : barre, charte et icônes glossy (son, paramètres compris).');
    }catch(e){setMessage(e instanceof Error?e.message:'Thème impossible à appliquer.');}
    finally{setBusy(false);}
  }
  return <div className="nv-glossy-themes" style={{display:'grid',gap:8,margin:'10px 0'}}>
    <span className="section-title">Thèmes glossy NovaStudio</span>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:8}}>
      {GLOSSY_THEMES.map(theme=><button key={theme.id} type="button" disabled={busy} onClick={()=>void choose(theme.id)}
        style={{display:'flex',alignItems:'center',gap:8,padding:8,borderRadius:10,border:'1px solid #0005',background:theme.bar.background,color:readableOn(theme.bar.background),cursor:'pointer',textAlign:'left'}}>
        <span style={{width:26,height:26,borderRadius:'50%',flex:'0 0 26px',background:theme.glossy.base,border:'2px solid '+theme.glossy.rim}}/>
        <span style={{fontSize:13,fontWeight:700}}>{theme.name}</span>
      </button>)}
    </div>
    {message&&<small role="status">{message}</small>}
  </div>;
}
