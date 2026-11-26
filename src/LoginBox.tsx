import {useState} from 'react';
import {EmailNotConfirmedError,MIN_PASSWORD,resendConfirmation,sendPasswordReset,signInWithEmail,signInWithPassword,signUpAccount} from './cloud';

/** Connexion au cloud : e-mail + mot de passe (accès d'une personne invitée) ou lien magique par e-mail. */
export function LoginBox({intro}:{intro?:string}){
  const [mode,setMode]=useState<'password'|'magic'|'signup'>('password');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [password2,setPassword2]=useState('');
  const [info,setInfo]=useState('');
  const [sent,setSent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [unconfirmed,setUnconfirmed]=useState(false);
  const [resent,setResent]=useState(false);
  const submit=async()=>{
    setBusy(true);setError('');setInfo('');setUnconfirmed(false);setResent(false);
    try{
      if(mode==='signup'){
        if(password.length<MIN_PASSWORD)throw new Error(`Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`);
        if(password!==password2)throw new Error('Les deux mots de passe ne sont pas identiques.');
        const r=await signUpAccount(email.trim().toLowerCase(),password);
        if(r==='created')setInfo('✓ Compte créé : tu es connecté.');
        else if(r==='confirm')setInfo('✓ Compte créé. Un e-mail de confirmation vient d’être envoyé à '+email.trim()+' : clique sur le lien qu’il contient (pense aux courriers indésirables), puis reviens te connecter ici.');
        else if(r==='exists')setError('Un compte existe déjà avec cette adresse. Connecte-toi, ou utilise « Mot de passe oublié » pour en définir un.');
        else setError('La création de comptes est fermée sur ce Cloud : demande à l’administrateur de t’ajouter.');
      }
      else if(mode==='password')await signInWithPassword(email.trim(),password);
      else{await signInWithEmail(email.trim());setSent(true);}
    }catch(e){
      if(e instanceof EmailNotConfirmedError)setUnconfirmed(true);
      else setError(e instanceof Error?e.message:String(e));
    }
    finally{setBusy(false);}
  };
  const forgot=async()=>{
    setBusy(true);setError('');setInfo('');
    try{await sendPasswordReset(email.trim());setInfo('✓ E-mail envoyé à '+email.trim()+' : ouvre le lien pour choisir ton mot de passe (valable environ 1 heure).');}
    catch(e){setError(e instanceof Error?e.message:String(e));}
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
      <button type="button" role="tab" aria-selected={mode==='password'} className={mode==='password'?'is-on':''} onClick={()=>{setMode('password');setSent(false);setError('');setInfo('');}}>E-mail + mot de passe</button>
      <button type="button" role="tab" aria-selected={mode==='magic'} className={mode==='magic'?'is-on':''} onClick={()=>{setMode('magic');setError('');setInfo('');}}>Lien magique</button>
      <button type="button" role="tab" aria-selected={mode==='signup'} className={mode==='signup'?'is-on':''} onClick={()=>{setMode('signup');setSent(false);setError('');setInfo('');}}>Créer un compte</button>
    </div>
    {sent&&mode==='magic'?<p>Lien envoyé à <b>{email}</b>. Ouvre-le sur cet appareil, puis reviens ici.</p>:<form className="login-form" onSubmit={e=>{e.preventDefault();void submit();}}>
      <input type="email" placeholder="ton@email.fr" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/>
      {mode!=='magic'&&<input type="password" placeholder={mode==='signup'?`Mot de passe (${MIN_PASSWORD} caractères min.)`:'Mot de passe'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signup'?'new-password':'current-password'} required/>}
      {mode==='signup'&&<input type="password" placeholder="Répète le mot de passe" value={password2} onChange={e=>setPassword2(e.target.value)} autoComplete="new-password" required/>}
      <button className="primary" type="submit" disabled={busy||!email.includes('@')||(mode!=='magic'&&!password)||(mode==='signup'&&!password2)}>
        {mode==='password'?'Se connecter':mode==='signup'?'Créer mon compte':'Recevoir le lien de connexion'}
      </button>
    </form>}
    {mode==='password'&&<button type="button" className="quiet" disabled={busy||!email.includes('@')} onClick={()=>void forgot()}>Mot de passe oublié, ou jamais défini ? (saisis ton e-mail puis clique ici)</button>}
    {info&&<p>{info}</p>}
    {unconfirmed&&<div className="login-help">
      <p><b>Cette adresse n’a pas encore été confirmée.</b> Ouvre l’e-mail de confirmation reçu de Supabase (pense à regarder les courriers indésirables). Un lien ne marche qu’une fois et pendant environ 1 heure.</p>
      {resent?<p>✓ Nouvel e-mail envoyé à <b>{email}</b>. Clique sur le lien dès réception, dans ce navigateur.</p>
        :<button type="button" className="quiet" disabled={busy} onClick={()=>void resend()}>Renvoyer l’e-mail de confirmation</button>}
    </div>}
    {error&&<p className="warning">{error}</p>}
  </div>;
}
