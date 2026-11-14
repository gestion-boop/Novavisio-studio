import type {CSSProperties} from 'react';
import {Home,Info,CalendarDays,MapPin,Phone,Globe,ArrowRight,Menu,Star,Utensils,Images,LayoutGrid} from 'lucide-react';
import {barIconSize,type StudioProject} from './storage';
import {IconStateVisual} from './media';

const glyphs={home:Home,info:Info,calendar:CalendarDays,map:MapPin,phone:Phone,web:Globe,arrow:ArrowRight,menu:Menu,star:Star,utensils:Utensils,images:Images,grid:LayoutGrid};
export function SetupBarPreview({project}:{project:StudioProject}){
  const theme=project.barStyle;
  const vars={'--nv-bar-bg':theme.background,'--nv-bar-outline':theme.outline,'--nv-button-bg':theme.button,
    '--nv-button-outline':theme.buttonOutline,'--nv-icon-color':theme.icon,'--nv-bar-border-width':theme.outlineWidth+'px',
    '--nv-button-border-width':theme.buttonOutlineWidth+'px','--nv-bar-roundness':theme.roundness+'px',
    '--nv-bar-width':theme.width?theme.width+'px':'max-content','--nv-bar-height':(theme.height??82)+'px'} as CSSProperties;
  return <div className="nv-setup-preview-panel" style={vars}><small>Aperçu en direct</small>
    <nav className="visitor-bottom-bar nv-setup-live-bar" aria-label="Aperçu en direct de la barre">{project.bottomBar.map(item=>{
      const custom=project.icons.some(icon=>icon.id===item.iconId),Glyph=glyphs[item.builtinIcon as keyof typeof glyphs]??Info;
      return <button type="button" key={item.id} aria-label={'Aperçu : '+item.title} title={item.title} className={'visitor-bar-button '+(custom?'has-custom-png':'')}
        style={{'--nv-bar-btn':(barIconSize(item)+(custom?0:10))+'px'} as CSSProperties}>
        <span className="visitor-bar-icon">{custom?<IconStateVisual icons={project.icons} normal={item.iconId} hover={item.hoverIconId} pressed={item.pressedIconId} size={barIconSize(item)}/>:<Glyph size={29} strokeWidth={1.9} aria-hidden="true"/>}</span>
      </button>;
    })}</nav>
    {project.bottomBar.some(item=>item.iconId)&&<small>Les images importées gardent leurs couleurs d’origine.</small>}
  </div>;
}
