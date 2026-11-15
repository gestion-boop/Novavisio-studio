import {useEffect,useRef} from 'react';
import type {BottomBarItem,MediaLinkItem} from './storage';
import {resolveLink} from './mediaLinks';

export type BarKind='photos'|'gallery'|'phone'|'web'|'info'|'map'|'menu'|'other';

const norm=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
/** Devine à quoi sert un bouton de la barre d'après son titre (et son icône) : panoramas, téléphone, site, infos, carte, menu… */
export function barKind(item:Pick<BottomBarItem,'title'|'builtinIcon'|'url'|'text'>):BarKind{
  const t=norm((item.title||'')+' '+(item.builtinIcon||''));
  if(/^tel:/.test(item.url||'')||/(appel|telephone|\btel\b|phone|call|joindre|contact|numero)/.test(t))return 'phone';
  if(/(photo|image|album|diaporama)/.test(t))return 'photos';
  if(/(panorama|espace|galerie|visite|logement|chambre|hebergement|home|accueil|grid)/.test(t))return 'gallery';
  if(/(resto|menu|cuisine|restaurant|manger|fork|food|bar\b|carte des|tarif)/.test(t))return 'menu';
  if(/(carte|plan|localis|itiner|map|acces|situer|trouver|adresse|pin)/.test(t))return 'map';
  if(/(site|web|reserv|booking|lien|www|internet|globe|externe)/.test(t))return 'web';
  if(/(info|horaire|aide|renseign|infos|about)/.test(t))return 'info';
  return 'other';
}
export const recommendedType=(kind:BarKind):BottomBarItem['type']|null=>kind==='photos'?'photos':kind==='gallery'?'gallery':kind==='phone'||kind==='web'?'lien':kind==='info'||kind==='map'||kind==='menu'?'information':null;
const KIND_LABEL:Record<BarKind,string>={photos:'Galerie de photos',gallery:'Panoramas / espaces',phone:'Appel téléphonique',web:'Site internet',info:'Informations',map:'Carte / localisation',menu:'Carte, menu ou PDF',other:'Bouton'};

function toTel(raw:string):string{
  const digits=raw.replace(/[^\d+]/g,'');
  if(!digits)return '';
  const intl=digits.startsWith('+')?digits:digits.startsWith('00')?'+'+digits.slice(2):digits.startsWith('0')?'+33'+digits.slice(1):'+'+digits;
  return 'tel:'+intl;
}

/** Carte de réglage rapide : selon le bouton, on demande directement ce qu'il faut (numéro, lien, adresse, PDF…). */
export function BarSmartCard({item,onPatch,onChooseGallery,library=[],onOpenLibrary}:{item:BottomBarItem;onPatch:(patch:Partial<BottomBarItem>)=>void;onChooseGallery:()=>void;library?:MediaLinkItem[];onOpenLibrary?:()=>void}){
  const kind=barKind(item);
  const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>{const t=window.setTimeout(()=>ref.current?.focus(),350);return ()=>window.clearTimeout(t);},[item.id]);
  if(kind==='other')return null;
  const tel=item.url.startsWith('tel:')?item.url.slice(4):'';
  return <div className="nv-smart-card" role="group" aria-label={'Réglage rapide : '+KIND_LABEL[kind]}>
    <div className="nv-smart-head"><span>✨</span><div><strong>{KIND_LABEL[kind]}</strong><small>Détecté d’après le titre « {item.title} »</small></div></div>
    {kind==='photos'&&(()=>{
      const chosen=new Set((item.photos??[]).map(m=>m.id));
      const all=library.length>0&&library.every(m=>chosen.has(m.id));
      const set=(ids:Set<string>)=>onPatch({type:'photos',photos:library.filter(m=>ids.has(m.id))});
      return <>
        <p>Ce bouton ouvre une <b>galerie de photos</b> : choisis ci-dessous celles à afficher (elles viennent de ta bibliothèque Photos &amp; Vidéos).</p>
        {library.length===0
          ?<><small>Ta bibliothèque est vide : importe d’abord tes photos depuis ton ordinateur.</small>
            {onOpenLibrary&&<button type="button" className="nv-smart-go" onClick={onOpenLibrary}>📚 Ouvrir la bibliothèque Photos &amp; Vidéos</button>}</>
          :<>
            <div className="nv-smart-photos-head">
              <button type="button" className="nv-smart-go" onClick={()=>set(all?new Set():new Set(library.map(m=>m.id)))}>{all?'Tout désélectionner':'☑ Tout sélectionner ('+library.length+')'}</button>
              <small>{chosen.size} sélectionnée{chosen.size>1?'s':''}</small>
            </div>
            <ul className="nv-smart-photos">{library.map(m=>{const r=resolveLink(m);const on=chosen.has(m.id);
              return <li key={m.id}><label className={on?'is-on':''}>
                <input type="checkbox" checked={on} onChange={()=>{const next=new Set(chosen);if(on)next.delete(m.id);else next.add(m.id);set(next);}}/>
                {m.kind==='photo'&&r.thumb?<img src={r.thumb} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span>▶</span>}
                <em>{m.name}</em></label></li>;})}</ul>
            {onOpenLibrary&&<button type="button" className="tool" onClick={onOpenLibrary}>＋ Ajouter d’autres photos à la bibliothèque</button>}
          </>}
        {item.type!=='photos'&&chosen.size>0&&<button type="button" className="nv-smart-go" onClick={()=>onPatch({type:'photos'})}>▣ Activer la galerie de photos</button>}
      </>;})()}
    {kind==='gallery'&&<>
      <p>Ce bouton ouvre la galerie : choisis ci-dessous les panoramas à y afficher.</p>
      {item.type!=='gallery'&&<button type="button" className="nv-smart-go" onClick={onChooseGallery}>▧ Activer la galerie de panoramas</button>}
    </>}
    {kind==='phone'&&<label>Numéro de téléphone
      <input ref={ref} type="tel" inputMode="tel" value={tel} placeholder="06 12 34 56 78" onChange={e=>onPatch({type:'lien',url:toTel(e.target.value),linkMode:'tab'})}/>
      <small>Un clic dans la visite lance l’appel (format international ajouté automatiquement).</small></label>}
    {kind==='web'&&<label>Adresse du site
      <input ref={ref} type="url" value={item.url} placeholder="https://…" onChange={e=>onPatch({type:'lien',url:e.target.value})}/></label>}
    {kind==='info'&&<label>Texte d’information
      <textarea rows={4} value={item.text} placeholder="Horaires, description, informations utiles…" onChange={e=>onPatch({type:'information',text:e.target.value})}/></label>}
    {kind==='map'&&<>
      <label>Adresse à afficher sur la carte
        <input ref={ref} type="text" placeholder="12 rue de la République, 11100 Narbonne" onChange={e=>{const v=e.target.value.trim();if(v)onPatch({type:'information',url:'https://www.google.com/maps?q='+encodeURIComponent(v)+'&output=embed'});}}/></label>
      <label>… ou lien de la carte / du plan (Google Maps, PDF)
        <input type="url" value={item.url.startsWith('https://www.google.com/maps?q=')?'':item.url} placeholder="https://…" onChange={e=>onPatch({type:'information',url:e.target.value})}/></label>
      <small>La carte s’ouvre en grand dans la visite.</small></>}
    {kind==='menu'&&<>
      <label>Lien du PDF (carte, menu, plan)
        <input ref={ref} type="url" value={item.url} placeholder="https://…/carte.pdf" onChange={e=>onPatch({type:'information',url:e.target.value})}/></label>
      <small>Le PDF s’affiche en grand, page par page. S’il y a plusieurs fichiers, colle le lien d’une page qui les regroupe.</small></>}
  </div>;
}
