import {useState} from 'react';
import {EmailNotConfirmedError,resendConfirmation,signInWithEmail,signInWithPassword} from './cloud';

/** Connexion au cloud : e-mail + mot de passe (accès d'une personne invitée) ou lien magique par e-mail. */
export function LoginBox({intro}:{intro?:string}){
  const [mode,setMode]=useState<'password'|'magic'>('password');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [sent,setSent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [unconfirmed,setUnconfirmed]=useState(false);
  const [resent,setResent]=useState(false);
  const submit=async()=>{
    setBusy(true);setError('');setUnconfirmed(false);setResent(false);
    try{
      if(mode==='password')await signInWithPassword(email.trim(),password);
      else{await signInWithEmail(email.trim());setSent(true);}
    }catch(e){
      if(e instanceof EmailNotConfirmedError)setUnconfirmed(true);
      else setError(e instanceof Error?e.message:String(e));
    }
    finally{setBusy(false);}
  };
  const resend=async()=>{
    setBusy(true);setError('');
    try{await resendConfirmation(email.trim());setResent(true);}
    catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  return <div className="login-box">
    {intro&&<p>{intro}</p>}
    <div className="login-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={mode==='password'} className={mode==='password'?'is-on':''} onClick={()=>{setMode('password');setSent(false);setError('');}}>E-mail + mot de passe</button>
      <button type="button" role="tab" aria-selected={mode==='magic'} className={mode==='magic'?'is-on':''} onClick={()=>{setMode('magic');setError('');}}>Lien magique</button>
    </div>
    {sent&&mode==='magic'?<p>Lien envoyé à <b>{email}</b>. Ouvre-le sur cet appareil, puis reviens ici.</p>:<form className="login-form" onSubmit={e=>{e.preventDefault();void submit();}}>
      <input type="email" placeholder="ton@email.fr" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/>
      {mode==='password'&&<input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/>}
      <button className="primary" type="submit" disabled={busy||!email.includes('@')||(mode==='password'&&!password)}>
        {mode==='password'?'Se connecter':'Recevoir le lien de connexion'}
      </button>
    </form>}
    {unconfirmed&&<div className="login-help">
      <p><b>Cette adresse n’a pas encore été confirmée.</b> Ouvre l’e-mail de confirmation reçu de Supabase (pense à regarder les courriers indésirables). Un lien ne marche qu’une fois et pendant environ 1 heure.</p>
      {resent?<p>✓ Nouvel e-mail envoyé à <b>{email}</b>. Clique sur le lien dès réception, dans ce navigateur.</p>
        :<button type="button" className="quiet" disabled={busy} onClick={()=>void resend()}>Renvoyer l’e-mail de confirmation</button>}
    </div>}
    {error&&<p className="warning">{error}</p>}
  </div>;
}
