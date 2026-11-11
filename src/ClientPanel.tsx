import {useRef,useState} from 'react';
import {ExternalLink,FileJson,Link2,PlusCircle} from 'lucide-react';
import {emptyClientProfile,type ClientProfile} from './storage';

type Field=keyof ClientProfile;
const fields:Array<{key:Field;label:string;placeholder?:string}>=[
  {key:'name',label:'Établissement'},{key:'category',label:'Activité'},
  {key:'address',label:'Adresse'},{key:'city',label:'Ville'},
  {key:'phone',label:'Téléphone'},{key:'email',label:'E-mail'},
  {key:'website',label:'Site internet',placeholder:'https://…'},
  {key:'facebook',label:'Facebook',placeholder:'https://…'},
  {key:'instagram',label:'Instagram',placeholder:'https://…'},
  {key:'otherLinks',label:'Autres liens'},
  {key:'description',label:'Description'}
];
export type ClientLink={label:string;url:string;kind:'link'|'info'};
export function profileLinks(p:ClientProfile):ClientLink[]{
  const result:ClientLink[]=[];
  const web=(value:string)=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}};
  if(p.phone.trim()&&/^\\+?[0-9 ()\\-.]{6,30}$/.test(p.phone.trim()))
    result.push({label:'Appeler',url:'tel:'+p.phone.replace(/[^+\\d]/g,''),kind:'link'});
  if(p.email&&/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(p.email))
    result.push({label:'E-mail',url:'mailto:'+p.email,kind:'link'});
  for(const [label,value] of [['Site internet',p.website],['Facebook',p.facebook],['Instagram',p.instagram]]){
    const url=web(value);if(url)result.push({label,url,kind:'link'});
  }
  if(p.address||p.city)result.push({label:'Itinéraire',url:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([p.address,p.city].filter(Boolean).join(', ')),kind:'link'});
  return result;
}
export function ClientPanel({value,onChange,onAddLink,compact=false}:{
  value:ClientProfile|undefined;
  onChange:(p:ClientProfile)=>void;
  onAddLink:(link:ClientLink)=>void;
  compact?:boolean;
}){
  const p=value??emptyClientProfile();
  const input=useRef<HTMLInputElement>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const patch=(field:Field,v:string)=>{onChange({...p,[field]:v.slice(0,4000)});setNotice('');};
  const importNovaGen=async(file?:File)=>{
    if(!file)return;
    try{
      if(file.size>2_000_000)throw Error('Le fichier JSON doit faire moins de 2 Mo (sans les photos).');
      const parsed:unknown=JSON.parse(await file.text());
      if(!parsed||typeof parsed!=='object')throw Error('Le fichier n’est pas un objet JSON.');
      const obj=parsed as Record<string,unknown>;
      const src=(obj.data&&typeof obj.data==='object'?obj.data:obj) as Record<string,unknown>;
      const fiche=(src.fiche&&typeof src.fiche==='object'?src.fiche:{}) as Record<string,unknown>;
      const links=(src.links&&typeof src.links==='object'?src.links:{}) as Record<string,unknown>;
      const str=(...values:unknown[])=>String(values.find(x=>typeof x==='string'&&x.trim())??'').slice(0,4000);
      const desc=fiche.description;
      const result:ClientProfile={
        novagenId:str(src.id,obj.id),name:str(fiche.nom,links.nom,p.name),
        category:str(fiche.type,links.type,p.category),address:str(fiche.adresse,links.adresse,p.address),
        city:str(fiche.ville,links.ville,p.city),phone:str(fiche.tel,links.tel,p.phone),
        email:str(fiche.email,p.email),website:str(fiche.site,links.site,p.website),
        facebook:str(fiche.facebook,links.facebook,p.facebook),
        instagram:str(fiche.instagram,links.instagram,p.instagram),
        otherLinks:str(links.autres,p.otherLinks),
        description:str(typeof desc==='string'?desc:(desc&&typeof desc==='object'?(desc as Record<string,unknown>).fr:''),p.description)
      };
      if(!result.name&&!result.website&&!result.phone)throw Error('Aucune fiche NovaGen reconnue dans ce JSON.');
      onChange(result);setNotice('Fiche importée. Vérifie les informations avant utilisation.');setError('');
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{if(input.current)input.current.value='';}
  };
  return <section className={'nv-client-content'+(compact?' is-compact':'')}>
    <div className="nv-client-panel-title">
      <div><strong>Informations client</strong><small>NovaGen → NovaStudio · fiche de l’établissement</small></div>
      <button type="button" className="nv-client-import" onClick={()=>input.current?.click()}><FileJson size={15}/> Importer une fiche JSON</button>
      <input ref={input} hidden type="file" accept=".json,application/json" onChange={e=>void importNovaGen(e.target.files?.[0])}/>
    </div>
    <p className="nv-client-note">Première étape de fusion : modifie la fiche ici ou importe un objet JSON de NovaGen. Aucune connexion directe au serveur NovaGen n’est encore activée.</p>
    {error&&<p role="alert" className="nv-client-error">{error}</p>}
    {notice&&<p className="nv-client-ok">{notice}</p>}
    <div className="nv-client-fields">
      {fields.map(f=><label key={f.key} className={f.key==='description'?'nv-client-wide':''}>
        <span>{f.label}</span>
        {f.key==='description'?<textarea rows={3} value={p[f.key]} onChange={e=>patch(f.key,e.target.value)}/>:
          <input value={p[f.key]} placeholder={f.placeholder??''} onChange={e=>patch(f.key,e.target.value)}/>}
      </label>)}
    </div>
    <div className="nv-client-reuse">
      <strong><Link2 size={15}/> Réutiliser dans la visite</strong>
      <small>Ajoute directement un bouton à la barre inférieure. Les coordonnées restent modifiables avant publication.</small>
      <div className="nv-client-actions">
        {profileLinks(p).map(link=><button key={link.label} type="button"
          onClick={()=>{onAddLink(link);setNotice('Bouton « '+link.label+' » ajouté à la barre.');}}>
          <PlusCircle size={14}/> {link.label}
        </button>)}
        {!profileLinks(p).length&&<small>Renseigne un téléphone, un e-mail ou un site pour créer des boutons.</small>}
      </div>
    </div>
    <p className="nv-client-footnote"><ExternalLink size={13}/> Les fiches clientes ne sont pas intégrées au fichier de visite publié. Enregistre le projet pour conserver tes modifications.</p>
  </section>;
}
