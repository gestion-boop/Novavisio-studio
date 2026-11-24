import type {Scene,StudioProject} from './storage';
import {barKind} from './barKind';
import {pick} from './i18n';

/**
 * Aperçu en direct de la grande fenêtre de réglages : vue d'ensemble du panorama (tous les points à leur place)
 * et barre du bas telle que la verra le visiteur. L'élément en cours de modification est entouré en jaune.
 */
export function StudioPreview({project,scene,thumb,selectedBarId,selectedPointId}:{project:StudioProject;scene?:Scene;thumb?:string;selectedBarId?:string;selectedPointId?:string}){
  const bar=project.bottomBar??[];
  const night=false;
  const points=(scene?.hotspots??[]).filter(h=>h.type!=='navigation'||true);
  const selectedBar=bar.find(b=>b.id===selectedBarId);
  const selectedPoint=points.find(h=>h.id===selectedPointId);
  const caption=selectedBar?'Bouton « '+pick(selectedBar.title,selectedBar.titleTranslations,'fr')+' » entouré en jaune.'
    :selectedPoint?'Point « '+(selectedPoint.title||selectedPoint.type)+' » entouré en jaune.'
    :'Le bouton ou le point que tu modifies est entouré en jaune.';
  return <section className="nv-studio-preview" aria-label="Aperçu en direct">
    <h4>Aperçu en direct</h4>
    <div className="nv-sp-pano" style={thumb&&!night?{backgroundImage:'url("'+thumb+'")'}:undefined}>
      {!thumb&&<span className="nv-sp-empty">Aucun panorama affiché</span>}
      {points.map(h=>{
        const x=((h.yaw+Math.PI)/(2*Math.PI))*100,y=((Math.PI/2-h.pitch)/Math.PI)*100;
        return <i key={h.id} className={'nv-sp-pt'+(h.id===selectedPointId?' is-selected':'')+' is-'+h.type} style={{left:Math.min(97,Math.max(3,x))+'%',top:Math.min(94,Math.max(6,y))+'%'}} title={h.title}/>;
      })}
    </div>
    <div className="nv-sp-screen">
      <div className="nv-sp-bar" aria-hidden="true">
        {bar.length===0&&<span className="nv-sp-empty">Aucun bouton dans la barre</span>}
        {bar.map(item=>{
          const icon=project.icons.find(i=>i.id===item.iconId);
          return <span key={item.id} className={'nv-sp-btn'+(item.id===selectedBarId?' is-selected':'')} title={pick(item.title,item.titleTranslations,'fr')}>
            {icon?<img src={icon.dataUrl} alt=""/>:<b>{(item.title||barKind(item)).slice(0,1).toUpperCase()}</b>}
          </span>;
        })}
      </div>
    </div>
    <p className="nv-sp-cap">{caption}</p>
  </section>;
}
