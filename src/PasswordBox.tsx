import {useState} from 'react';
import {MIN_PASSWORD,setMyPassword} from './cloud';

/** Définir ou changer son mot de passe (compte connecté). Permet aux comptes créés par lien magique de se connecter aussi avec un mot de passe. */
export function PasswordBox({intro,onDone}:{intro?:string;onDone?:()=>void}){
  const [pw,setPw]=useState('');
  const [pw2,setPw2]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [ok,setOk]=useState(false);
  const submit=async()=>{
    setError('');
    if(pw.length<MIN_PASSWORD){setError(`Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`);return;}
    if(pw!==pw2){setError('Les deux mots de passe ne sont pas identiques.');return;}
    setBusy(true);
    try{await setMyPassword(pw);setOk(true);setPw('');setPw2('');onDone?.();}
    catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  return <div className="login-box">
    {intro&&<p>{intro}</p>}
    {ok?<p>✓ Mot de passe enregistré. Tu peux maintenant te connecter avec ton e-mail et ce mot de passe.</p>
    :<form className="login-form" onSubmit={e=>{e.preventDefault();void submit();}}>
      <input type="password" placeholder="Nouveau mot de passe (8 caractères min.)" value={pw} onChange={e=>setPw(e.target.value)} autoComplete="new-password" required/>
      <input type="password" placeholder="Répète le mot de passe" value={pw2} onChange={e=>setPw2(e.target.value)} autoComplete="new-password" required/>
      <button className="primary" type="submit" disabled={busy||!pw||!pw2}>{busy?'Enregistrement…':'Enregistrer le mot de passe'}</button>
    </form>}
    {error&&<p className="warning">{error}</p>}
  </div>;
}
