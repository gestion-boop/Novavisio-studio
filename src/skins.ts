import {newProject,validateProject,type StudioProject,type BottomBarItem} from './storage';

const globalIcons=['closeIconId','soundOnIconId','soundOnHoverIconId','soundOnPressedIconId','soundOffIconId','soundOffHoverIconId','soundOffPressedIconId','settingsIconId','settingsHoverIconId','settingsPressedIconId'] as const;
export type Skin={version:1;id:string;name:string;updatedAt:string;appearance:StudioProject};

export function captureSkin(project:StudioProject,name:string,id:string=crypto.randomUUID()):Skin {
  const appearances=project.bottomBar.map(item=>({id:item.id,title:item.title,type:item.type,...(item.type==='gallery'?{gallery:[]}:{}),text:'',url:'',target:'',builtinIcon:item.builtinIcon,iconId:item.iconId,hoverIconId:item.hoverIconId,pressedIconId:item.pressedIconId,iconSize:item.iconSize}));
  const nav=project.defaultNavigationIcon??(project.iconPackId==='classic'?undefined:inferNavigation(project));
  const used=new Set<string>();
  for(const item of [...appearances,...(nav?[nav]:[]),...(project.buttonSets??[]),...[project.defaultPhotoIcon,project.defaultVideoIcon].filter((v):v is NonNullable<typeof v>=>!!v)])for(const key of ['iconId','hoverIconId','pressedIconId'] as const){if(item[key])used.add(item[key]!);}
  for(const key of globalIcons)if(project[key])used.add(project[key]!);
  const appearance:StudioProject={...newProject(),name:'Skin',defaultPhotoIcon:project.defaultPhotoIcon,defaultVideoIcon:project.defaultVideoIcon,barStyle:{...project.barStyle},bottomBar:appearances,
    icons:project.icons.filter(icon=>used.has(icon.id)),buttonSets:project.buttonSets,languages:project.languages,defaultNavigationIcon:nav,iconPackId:project.iconPackId};
  for(const key of globalIcons)appearance[key]=project[key];
  return validateSkin({version:1,id,name:name.trim(),updatedAt:new Date().toISOString(),appearance});
}
function inferNavigation(project:StudioProject){
  const counts=new Map<string,{iconId:string;hoverIconId?:string;pressedIconId?:string;iconSize:number;count:number}>();
  for(const scene of project.scenes)for(const point of scene.hotspots){
    if(point.type!=='navigation'||!point.iconId)continue;
    const value={iconId:point.iconId,hoverIconId:point.hoverIconId,pressedIconId:point.pressedIconId,iconSize:point.iconSize??28};
    const key=[value.iconId,value.hoverIconId??'',value.pressedIconId??'',value.iconSize].join('|');
    counts.set(key,{...value,count:(counts.get(key)?.count??0)+1});
  }
  const favorite=project.favoriteNavigationIconSet&&counts.get(project.favoriteNavigationIconSet);
  const best=favorite||[...counts.values()].sort((a,b)=>b.count-a.count)[0];
  if(!best)return undefined;
  const {count,...value}=best;return value;
}
export function validateSkin(value:unknown):Skin {
  const skin=value as Skin;
  if(!skin||skin.version!==1||typeof skin.id!=='string'||!skin.id||skin.id.length>100||typeof skin.name!=='string'||!skin.name.trim()||skin.name.length>80)throw Error('Skin non reconnu');
  const source=skin.appearance;
  if(!source||!Array.isArray(source.icons)||!Array.isArray(source.bottomBar))throw Error('Présentation du skin invalide');
  const appearance=validateProject({...newProject(),name:'Skin',icons:source.icons,barStyle:source.barStyle,
    bottomBar:source.bottomBar.map(item=>({id:item.id,title:item.title,type:(['navigation','information','lien','gallery'] as const).includes(item.type)?item.type:'information',...(item.type==='gallery'?{gallery:[]}:{}),target:'',text:'',url:'',builtinIcon:item.builtinIcon,iconId:item.iconId,hoverIconId:item.hoverIconId,pressedIconId:item.pressedIconId,iconSize:item.iconSize})),
    defaultPhotoIcon:source.defaultPhotoIcon,defaultVideoIcon:source.defaultVideoIcon,languages:source.languages,buttonSets:source.buttonSets,defaultNavigationIcon:source.defaultNavigationIcon,iconPackId:source.iconPackId,
    ...Object.fromEntries(globalIcons.map(key=>[key,source[key]]))});
  return {version:1,id:skin.id,name:skin.name.trim(),updatedAt:typeof skin.updatedAt==='string'?skin.updatedAt:new Date().toISOString(),appearance};
}
export function applySkin(project:StudioProject,skin:Skin):StudioProject {
  const source=validateSkin(skin).appearance;
  const icons=[...project.icons];
  const ids=new Map<string,string>();
  for(const icon of source.icons){
    const same=icons.find(existing=>existing.dataUrl===icon.dataUrl);
    const id=same?.id??(icons.some(existing=>existing.id===icon.id)?crypto.randomUUID():icon.id);
    ids.set(icon.id,id);if(!same)icons.push({...icon,id});
  }
  const remap=(id?:string)=>id?ids.get(id):undefined;
  // Projet sans boutons (nouveau projet) : le skin apporte ses boutons avec leur signification (accueil, galerie, appel…).
  const slots=project.bottomBar.length===0?source.bottomBar.map(v=>({
    id:crypto.randomUUID(),title:v.title,type:v.type,target:'',text:'',url:'',builtinIcon:v.builtinIcon,
    ...(v.type==='gallery'?{gallery:[]}:{}),
    iconId:remap(v.iconId),hoverIconId:remap(v.hoverIconId),pressedIconId:remap(v.pressedIconId),iconSize:v.iconSize
  } as BottomBarItem)):null;
  const bottomBar=slots??project.bottomBar.map((item,index)=>{
    const visual=source.bottomBar.find(b=>b.title===item.title)??source.bottomBar.find(b=>b.builtinIcon&&b.builtinIcon===item.builtinIcon)??source.bottomBar[index];
    if(!visual)return item;
    return {...item,...Object.fromEntries(['iconId','hoverIconId','pressedIconId'].map(key=>[key,remap(visual[key as keyof BottomBarItem] as string|undefined)])),iconSize:visual.iconSize,builtinIcon:visual.builtinIcon};
  });
  const buttonSets=[...(project.buttonSets??[])];
  for(const set of source.buttonSets??[]){
    const mapped={...set,iconId:remap(set.iconId)!,hoverIconId:remap(set.hoverIconId),pressedIconId:remap(set.pressedIconId)};
    if(buttonSets.some(existing=>existing.iconId===mapped.iconId&&existing.hoverIconId===mapped.hoverIconId&&existing.pressedIconId===mapped.pressedIconId&&existing.iconSize===mapped.iconSize))continue;
    buttonSets.push({...mapped,id:buttonSets.some(existing=>existing.id===mapped.id)?crypto.randomUUID():mapped.id});
  }
  const mediaDefaults=Object.fromEntries((['defaultPhotoIcon','defaultVideoIcon'] as const).map(key=>{const value=source[key];return [key,value?{...value,iconId:remap(value.iconId)!,hoverIconId:remap(value.hoverIconId),pressedIconId:remap(value.pressedIconId)}:undefined]}));
  const nav=source.defaultNavigationIcon;
  const next={...project,...mediaDefaults,icons,bottomBar,buttonSets,barStyle:{...source.barStyle},languages:source.languages,iconPackId:source.iconPackId,
    defaultNavigationIcon:nav?{...nav,iconId:remap(nav.iconId)!,hoverIconId:remap(nav.hoverIconId),pressedIconId:remap(nav.pressedIconId)}:undefined,
    favoriteNavigationIconSet:undefined};
  for(const key of globalIcons)next[key]=remap(source[key]);
  return validateProject(next);
}

async function skinDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{const req=indexedDB.open('novavisio-skins-v1',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('skins',{keyPath:'id'});
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
export async function listSkins():Promise<Skin[]>{
  const db=await skinDb();return new Promise((resolve,reject)=>{const tx=db.transaction('skins','readonly');const req=tx.objectStore('skins').getAll();
    tx.oncomplete=()=>{db.close();resolve((req.result as Skin[]).map(validateSkin).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));};
    tx.onerror=()=>{db.close();reject(tx.error);};
  });
}
export async function storeSkin(skin:Skin){
  const valid=validateSkin(skin),db=await skinDb();
  return new Promise<void>((resolve,reject)=>{const tx=db.transaction('skins','readwrite');tx.objectStore('skins').put(valid);
    tx.oncomplete=()=>{db.close();resolve();};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error??Error('Sauvegarde du skin impossible'));};
  });
}
export async function deleteSkin(id:string){
  const db=await skinDb();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('skins','readwrite');tx.objectStore('skins').delete(id);
    tx.oncomplete=()=>{db.close();resolve();};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};
  });
}
export function exportSkin(skin:Skin){
  const url=URL.createObjectURL(new Blob([JSON.stringify(validateSkin(skin))],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=skin.name.replace(/[^a-zA-Z0-9_-]/g,'_')+'.nvskin.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
