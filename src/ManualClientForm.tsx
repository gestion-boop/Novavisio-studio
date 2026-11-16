import {useState} from 'react';
import {ArrowLeft,Building2,FolderPlus,Save} from 'lucide-react';
import {emptyClientProfile,type ClientProfile} from './storage';
import {ClientSkinPicker} from './ClientSkinPicker';
import type {CloudSkin} from './cloudSkins';

type Field=keyof Pick<ClientProfile,'name'|'category'|'address'|'city'|'phone'|'email'|'website'|'description'>;

/** Saisie manuelle indépendante de l'aspirateur NovaGen. */
export function ManualClientForm({saving,notice,onSave,onCreateVisit,onCancel}:{
  saving:boolean;notice:string;
  onSave:(profile:ClientProfile)=>Promise<boolean>;
  onCreateVisit:(profile:ClientProfile,propertyName:string)=>void;
  onCancel:()=>void;
}){
  const [profile,setProfile]=useState<ClientProfile>(emptyClientProfile);
  const [propertyName,setPropertyName]=useState('');
  const [selectedSkin,setSelectedSkin]=useState<CloudSkin|null>(null);
  const [skinBusy,setSkinBusy]=useState(false);
  const [error,setError]=useState('');
  const patch=(key:Field,value:string)=>setProfile(p=>({...p,[key]:value}));
  const normalized=():ClientProfile=>({
    ...profile,
    name:profile.name.trim(),
    category:profile.category.trim(),
    address:profile.address.trim(),
    city:profile.city.trim(),
    phone:profile.phone.trim(),
    email:profile.email.trim(),
    website:profile.website.trim(),
    description:profile.description.trim(),
    preferredSkinId:selectedSkin?.id
  });
  const valid=()=>{
    if(!profile.name.trim()){setError('Renseigne le nom du client avant de continuer.');return false;}
    if(profile.email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())){
      setError('Adresse e-mail invalide.');return false;
    }
    setError('');return true;
  };
  const save=async()=>{
    if(!valid())return;
    await onSave(normalized());
  };
  return <form className="nv-directory-detail-inner nv-manual-client" onSubmit={e=>{e.preventDefault();void save();}}>
    <div className="nv-directory-title-row">
      <div className="nv-directory-feature-logo"><Building2 size={32}/></div>
      <div><small className="nv-directory-eyebrow">CRÉATION SANS RECHERCHE</small>
        <h3>Nouveau client</h3>
        <p>Crée une agence, un propriétaire ou un établissement sans passer par NovaGen.</p></div>
    </div>
    <div className="nv-manual-client-grid">
      <label className="is-required">Nom du client *
        <input autoFocus required maxLength={160} value={profile.name} onChange={e=>patch('name',e.target.value)}
          placeholder="Ex. ImmoSphera"/>
      </label>
      <label>Activité
        <input maxLength={160} value={profile.category} onChange={e=>patch('category',e.target.value)}
          placeholder="Ex. Agence immobilière"/>
      </label>
      <label>Ville
        <input maxLength={120} value={profile.city} onChange={e=>patch('city',e.target.value)}
          placeholder="Ex. Narbonne"/>
      </label>
      <label>Adresse
        <input maxLength={200} value={profile.address} onChange={e=>patch('address',e.target.value)}
          placeholder="Adresse de l'agence ou du client"/>
      </label>
      <label>Téléphone
        <input maxLength={60} value={profile.phone} onChange={e=>patch('phone',e.target.value)}/>
      </label>
      <label>E-mail
        <input type="email" maxLength={200} value={profile.email} onChange={e=>patch('email',e.target.value)}/>
      </label>
      <label className="is-wide">Site internet
        <input maxLength={250} value={profile.website} onChange={e=>patch('website',e.target.value)}/>
      </label>
      <label className="is-wide">Informations / notes
        <textarea rows={3} maxLength={3000} value={profile.description} onChange={e=>patch('description',e.target.value)}
          placeholder="Informations utiles pour ce client"/>
      </label>
    </div>
    <ClientSkinPicker selected={selectedSkin} onChange={setSelectedSkin} onBusy={setSkinBusy}/>
    <section className="nv-manual-client-property">
      <strong><FolderPlus size={17}/> Biens / visites immobilières</strong>
      <p>Exemple : crée « ImmoSphera » comme client, puis des visites nommées « Maison Narbonne-Plage », « Appartement centre-ville »… Toutes seront rattachées à ImmoSphera.</p>
      <label>Nom du premier bien (facultatif)
        <input maxLength={200} value={propertyName} onChange={e=>setPropertyName(e.target.value)}
          placeholder="Ex. Maison Narbonne-Plage"/>
      </label>
    </section>
    {(error||notice)&&<p role="status" className={error?'nv-directory-warning':'nv-client-ok'}>{error||notice}</p>}
    <div className="nv-manual-client-actions">
      <button type="button" className="nv-directory-secondary-action" onClick={onCancel}><ArrowLeft size={15}/> Annuler</button>
      <button type="submit" className="nv-directory-associate" disabled={saving||skinBusy||!profile.name.trim()}>
        <Save size={16}/> {saving?'Enregistrement…':'Enregistrer le client dans le Cloud'}
      </button>
      <button type="button" className="nv-directory-associate" disabled={saving||skinBusy||!profile.name.trim()||!propertyName.trim()}
        onClick={()=>{if(valid())onCreateVisit(normalized(),propertyName.trim());}}>
        <FolderPlus size={16}/> Créer le premier bien
      </button>
    </div>
    <small className="nv-directory-muted">La création est manuelle et ne lance aucune recherche web. « Créer le premier bien » prépare une visite locale ; utilise ensuite la disquette pour l'enregistrer dans le Cloud.</small>
  </form>;
}
