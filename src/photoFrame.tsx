import {IMAGE_FRAME_STYLES,type Hotspot,type ImageFrameStyle} from './storage';
import {escapeAttribute} from './imageFrame';

const labels:Record<ImageFrameStyle,string>={none:'Sans cadre',white:'Blanc',black:'Noir',wood:'Bois',gold:'Doré',rounded:'Arrondi'};
export function PhotoFramePicker({value='none',onChange}:{value?:ImageFrameStyle;onChange:(value:ImageFrameStyle)=>void}){
  return <fieldset className="nv-photo-frame-picker">
    <legend>Cadre de la photo</legend>
    <div>{IMAGE_FRAME_STYLES.map(style=><button key={style} type="button" aria-pressed={value===style}
      onClick={()=>onChange(style)}>
      <span aria-hidden="true" className={'nv-photo-frame-swatch nv-photo-frame-'+style}/>
      {labels[style]}
    </button>)}</div>
    <small>Appliqué dans la visite et à la photo agrandie.</small>
  </fieldset>;
}

// Keep decorated textures stable during camera movement and limit retained sources.
const textures=new Map<string,{source:string;result:string}>();
export function framedPhotoSource(h:Hotspot):string {
  const source=h.imageDataUrl??'';
  const style=h.imageFrameStyle??'none';
  if(!source||style==='none')return source;
  const width=1200,height=Math.round(width*(h.frameHeight??200)/(h.frameWidth??320));
  const key=h.id+':'+style+':'+height;
  const cached=textures.get(key);
  if(cached?.source===source)return cached.result;
  const border=Math.max(8,Math.round(Math.min(width,height)*.035));
  const colors={white:'#f5f2eb',black:'#22252a',wood:'#91613c',gold:'#c8a451',rounded:'#f5f2eb'};
  const color=colors[style];
  const radius=style==='rounded'?border*3:0;
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'">'+
    '<defs><clipPath id="photo"><rect x="'+border+'" y="'+border+'" width="'+(width-2*border)+'" height="'+(height-2*border)+'" rx="'+Math.max(0,radius-border)+'"/></clipPath></defs>'+
    '<rect width="'+width+'" height="'+height+'" rx="'+radius+'" fill="'+color+'"/>'+
    (style==='wood'||style==='gold'?'<rect x="4" y="4" width="'+(width-8)+'" height="'+(height-8)+'" fill="none" stroke="'+(style==='wood'?'#bd946b':'#f1d996')+'" stroke-width="5"/>':'')+
    '<image href="'+escapeAttribute(source)+'" x="'+border+'" y="'+border+'" width="'+(width-2*border)+'" height="'+(height-2*border)+'" preserveAspectRatio="none" clip-path="url(#photo)"/></svg>';
  const result='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  if(textures.size>=24)textures.delete(textures.keys().next().value!);
  textures.set(key,{source,result});
  return result;
}
