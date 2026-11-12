import {Briefcase,CalendarCheck,Clock,ConciergeBell,ExternalLink,Facebook,Globe,Instagram,Link2,Mail,MapPin,Phone,Building2} from 'lucide-react';
import type {ReactNode} from 'react';

/** Ligne d'information d'une fiche client : une icône reconnaissable à la place du libellé (le libellé reste en infobulle et pour les lecteurs d'écran). */
const ICONS:Record<string,{icon:ReactNode;color:string}>={
  'Activité':{icon:<Briefcase size={19}/>,color:'#9ab9c6'},
  'Adresse':{icon:<MapPin size={19}/>,color:'#ff8a7a'},
  'Ville':{icon:<Building2 size={19}/>,color:'#9ab9c6'},
  'Téléphone':{icon:<Phone size={19}/>,color:'#6fe0b4'},
  'E-mail':{icon:<Mail size={19}/>,color:'#ffd27a'},
  'Site internet':{icon:<Globe size={19}/>,color:'#7fc4ff'},
  'Facebook':{icon:<Facebook size={19}/>,color:'#4c8dff'},
  'Instagram':{icon:<Instagram size={19}/>,color:'#ff6fa5'},
  'Réservation':{icon:<CalendarCheck size={19}/>,color:'#b79bff'},
  'Horaires':{icon:<Clock size={19}/>,color:'#ffd27a'},
  'Services':{icon:<ConciergeBell size={19}/>,color:'#8be6da'}
};
export function InfoRow({label,value,href}:{label:string;value?:string;href?:string}){
  if(!value)return null;
  const meta=ICONS[label]??{icon:<Link2 size={19}/>,color:'#9ab9c6'};
  const multi=label==='Horaires'||label==='Services';
  return <div className={'nv-info-row'+(multi?' is-multi':'')}>
    <span className="nv-info-ico" style={{color:meta.color}} title={label} role="img" aria-label={label}>{meta.icon}</span>
    {href?<a href={href} target={href.startsWith('http')?'_blank':undefined} rel="noopener noreferrer">{value.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'')}<ExternalLink size={12}/></a>:<strong>{value}</strong>}
  </div>;
}
