import {pngFromSvg,svgIconPreview,type SvgIconDesign} from './svgIcons';
import {validateProject,type StudioProject} from './storage';

export const ICON_PACKS=[
  {id:'camping',name:'Camping nature',description:'Ronds verts et ivoire',design:{primary:'#536e28',secondary:'#fff4cf',accent:'#a1b85c',gradient:true,shape:'circle'}},
  {id:'ocean',name:'Océan',description:'Ronds bleus et blancs',design:{primary:'#176a91',secondary:'#ffffff',accent:'#5bb9c9',gradient:true,shape:'circle'}},
  {id:'graphite',name:'Graphite',description:'Carrés arrondis sobres',design:{primary:'#28333d',secondary:'#ffffff',accent:'#8298a5',gradient:false,shape:'rounded'}},
] satisfies {id:string;name:string;description:string;design:SvgIconDesign}[];
export const packPreview=(id:string)=>{const pack=ICON_PACKS.find(p=>p.id===id);return pack?svgIconPreview('arrow',pack.design):undefined;};
const glyphMap:Record<string,string>={home:'bed',images:'photo',grid:'map',phone:'phone',info:'info',utensils:'restaurant',calendar:'calendar',web:'location',arrow:'arrow',menu:'map',star:'star'};
export async function prepareIconPack(id:string,project:StudioProject){
  const pack=ICON_PACKS.find(p=>p.id===id);if(!pack)throw Error('Collection inconnue');
  const names=[...new Set(['arrow','photo','video',...project.bottomBar.map(b=>glyphMap[b.builtinIcon??'info']??'info')])];
  const generated=await Promise.all(names.map(async name=>({id:crypto.randomUUID(),name:'Collection '+pack.name+' · '+name,dataUrl:await pngFromSvg(name,pack.design),glyph:name})));
  return (current:StudioProject):StudioProject=>{
    const icons=[...current.icons],mapping=new Map<string,string>();
    for(const item of generated){const existing=icons.find(icon=>icon.dataUrl===item.dataUrl);mapping.set(item.glyph,existing?.id??item.id);if(!existing)icons.push({id:item.id,name:item.name,dataUrl:item.dataUrl});}
    return validateProject({...current,icons,iconPackId:id,defaultPhotoIcon:{iconId:mapping.get('photo')!,iconSize:42},defaultVideoIcon:{iconId:mapping.get('video')!,iconSize:42},defaultNavigationIcon:{iconId:mapping.get('arrow')!,iconSize:40},favoriteNavigationIconSet:undefined,
      bottomBar:current.bottomBar.map(item=>({...item,iconId:mapping.get(glyphMap[item.builtinIcon??'info']??'info'),hoverIconId:undefined,pressedIconId:undefined}))});
  };
}
