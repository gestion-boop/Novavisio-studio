import type {StudioProject,StudioLanguage} from './storage';
export type TargetLanguage=Exclude<StudioLanguage,'fr'>;
type Field='scene'|'space'|'pointTitle'|'pointText'|'barTitle'|'barText'|'galleryTitle'|'galleryLabel';
export type TranslationRow={key:string;field:Field;id:string;parent?:string;label:string;source:string;lang:TargetLanguage;text:string;original?:string;max:number};
type Translations=Partial<Record<TargetLanguage,string>>;
export function localized(value:string|undefined,map:Translations|undefined,lang:StudioLanguage):string{
  return (lang!=='fr'&&map?.[lang])||value||'';
}
/** Existing translations are included for review; only missing values need generation. */
export function translationRows(project:StudioProject,languages:TargetLanguage[]):TranslationRow[]{
  const rows:TranslationRow[]=[];
  function add(field:Field,id:string,label:string,source:string|undefined,existing:Translations|undefined,max:number,parent?:string){
    if(!source?.trim())return;
    for(const lang of languages){const original=existing?.[lang];rows.push({key:JSON.stringify([field,parent??'',id,lang]),field,id,parent,label,source,lang,text:original??'',original,max});}
  }
  for(const scene of project.scenes){
    add('scene',scene.id,'Panorama',scene.name,scene.nameTranslations,200);
    for(const h of scene.hotspots){
      add('pointTitle',h.id,'Point · '+scene.name,h.title,h.titleTranslations,120,scene.id);
      if(h.type==='information')add('pointText',h.id,'Information · '+scene.name,h.text,h.translations,8000,scene.id);
    }
  }
  for(const space of project.spaces??[])add('space',space.id,'Espace',space.name,space.nameTranslations,100);
  for(const b of project.bottomBar){
    add('barTitle',b.id,'Bouton de navigation',b.title,b.titleTranslations,120);
    if(b.type==='information')add('barText',b.id,'Information · '+b.title,b.text,b.translations,8000);
    if(b.type==='gallery'){
      add('galleryTitle',b.id,'Titre de galerie · '+b.title,b.galleryTitle,b.galleryTitleTranslations,100);
      for(const entry of b.gallery??[])add('galleryLabel',entry.sceneId,'Vignette · '+b.title,entry.label,entry.labelTranslations,100,b.id);
    }
  }
  return rows;
}
/** Apply only values whose source and previous translation have not changed in the meantime. */
export function applyTranslationRows(project:StudioProject,rows:TranslationRow[],languages:StudioLanguage[]):StudioProject{
  const lookup=new Map(rows.filter(r=>r.text.trim()&&r.text.length<=r.max).map(r=>[r.key,r]));
  const merged=(field:Field,id:string,source:string|undefined,map:Translations|undefined,parent?:string):Translations|undefined=>{
    let next=map;
    for(const lang of languages){
      if(lang==='fr')continue;
      const row=lookup.get(JSON.stringify([field,parent??'',id,lang]));
      if(row&&source===row.source&&next?.[lang]===row.original)next={...next,[lang]:row.text.trim()};
    }
    return next;
  };
  return {...project,languages,scenes:project.scenes.map(s=>({...s,nameTranslations:merged('scene',s.id,s.name,s.nameTranslations),hotspots:s.hotspots.map(h=>({...h,titleTranslations:merged('pointTitle',h.id,h.title,h.titleTranslations,s.id),translations:merged('pointText',h.id,h.text,h.translations,s.id)}))})),
    spaces:project.spaces?.map(s=>({...s,nameTranslations:merged('space',s.id,s.name,s.nameTranslations)})),
    bottomBar:project.bottomBar.map(b=>({...b,titleTranslations:merged('barTitle',b.id,b.title,b.titleTranslations),translations:merged('barText',b.id,b.text,b.translations),galleryTitleTranslations:merged('galleryTitle',b.id,b.galleryTitle,b.galleryTitleTranslations),gallery:b.gallery?.map(g=>({...g,labelTranslations:merged('galleryLabel',g.sceneId,g.label,g.labelTranslations,b.id)}))}))};
}
/** Localize display labels while leaving original text and translation maps intact. */
export function localizedProject(project:StudioProject,lang:StudioLanguage):StudioProject{
  if(lang==='fr')return project;
  return {...project,scenes:project.scenes.map(s=>({...s,name:localized(s.name,s.nameTranslations,lang),hotspots:s.hotspots.map(h=>({...h,title:localized(h.title,h.titleTranslations,lang)}))})),
    spaces:project.spaces?.map(s=>({...s,name:localized(s.name,s.nameTranslations,lang)})),
    bottomBar:project.bottomBar.map(b=>({...b,title:localized(b.title,b.titleTranslations,lang),galleryTitle:localized(b.galleryTitle,b.galleryTitleTranslations,lang)||undefined,gallery:b.gallery?.map(g=>({...g,label:localized(g.label,g.labelTranslations,lang)}))}))};
}
