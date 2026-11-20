import {Component,type ErrorInfo,type ReactNode} from 'react';

/**
 * Filet de sécurité : une erreur d'affichage ne doit plus laisser un écran blanc.
 * Le travail enregistré (navigateur et Cloud) n'est jamais touché par cet écran.
 */
const recent:string[]=[];
const remember=(kind:string,error:unknown)=>{
  const text=kind+' · '+new Date().toLocaleTimeString('fr-FR')+' · '+(error instanceof Error?(error.stack||error.message):String(error));
  recent.push(text.slice(0,1500));
  if(recent.length>12)recent.shift();
};
let installed=false;
/** Mémorise les erreurs non gérées (pour le rapport technique) sans changer le comportement de l'application. */
export function installErrorLog(){
  if(installed||typeof window==='undefined')return;
  installed=true;
  window.addEventListener('error',e=>remember('erreur',e.error??e.message));
  window.addEventListener('unhandledrejection',e=>remember('promesse rejetée',e.reason));
}

type State={error:Error|null;copied:boolean};
export class ErrorBoundary extends Component<{children:ReactNode;label?:string},State>{
  state:State={error:null,copied:false};
  static getDerivedStateFromError(error:Error):State{return {error,copied:false};}
  componentDidCatch(error:Error,info:ErrorInfo){remember('affichage',error);console.error('NovaStudio — erreur d’affichage',error,info.componentStack);}
  private report=()=>[
    'NovaVisio Studio — rapport technique',
    'Écran : '+(this.props.label??'application'),
    'Adresse : '+location.href,
    'Navigateur : '+navigator.userAgent,
    '',
    ...recent
  ].join('\n');
  private copy=async()=>{
    try{await navigator.clipboard.writeText(this.report());this.setState({copied:true});}
    catch{window.prompt('Copie ce rapport :',this.report());}
  };
  render(){
    if(!this.state.error)return this.props.children;
    return <main role="alert" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#0b1c25',color:'#e7fff9',fontFamily:'system-ui,sans-serif'}}>
      <div style={{maxWidth:560,padding:28,borderRadius:18,border:'1px solid #3f7f8c',background:'#10303a',boxShadow:'0 20px 70px #000a'}}>
        <h1 style={{margin:'0 0 10px',fontSize:22}}>⚠ Un problème d’affichage est survenu</h1>
        <p style={{lineHeight:1.6,margin:'0 0 14px'}}>Rien n’est perdu : ton travail enregistré (dans ce navigateur et dans le Cloud) n’a pas été modifié. Recharge la page pour reprendre.</p>
        <p style={{margin:'0 0 18px',fontSize:13,opacity:.8}}>{this.state.error.message}</p>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button type="button" onClick={()=>location.reload()} style={{padding:'11px 18px',borderRadius:12,border:'1px solid #9fdcf3',background:'#2f8fb5',color:'#fff',fontWeight:700,cursor:'pointer'}}>Recharger la page</button>
          <button type="button" onClick={()=>void this.copy()} style={{padding:'11px 18px',borderRadius:12,border:'1px solid #3f7f8c',background:'transparent',color:'#e7fff9',cursor:'pointer'}}>{this.state.copied?'✓ Rapport copié':'Copier le rapport technique'}</button>
        </div>
      </div>
    </main>;
  }
}
