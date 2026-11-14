import type {StudioProject} from './storage';

export type CheckIssue={level:'error'|'warn';text:string;sceneId?:string};

/** Contrôle avant publication : repère ce qui sera visible vide ou cassé pour les visiteurs. */
export function checkProject(project:StudioProject):CheckIssue[]{
  const out:CheckIssue[]=[];
  const ids=new Set(project.scenes.map(s=>s.id));
  const nameOf=(id:string)=>project.scenes.find(s=>s.id===id)?.name||'panorama';
  if(!project.scenes.length)out.push({level:'error',text:'Le projet ne contient aucun panorama.'});
  for(const scene of project.scenes){
    const label='« '+(scene.name||'sans nom')+' »';
    if(!scene.name.trim()||/\.(jpe?g|png|webp)$/i.test(scene.name)||/^(img|dsc|pxl|pano)[-_ ]?\d*/i.test(scene.name))
      out.push({level:'warn',text:'Panorama '+label+' : le nom ressemble à un nom de fichier, pense à le renommer.',sceneId:scene.id});
    if(!scene.hotspots.length)out.push({level:'warn',text:'Panorama '+label+' : aucun point, c’est une impasse pour le visiteur.',sceneId:scene.id});
    for(const h of scene.hotspots){
      const where=label+' · '+(h.title||'point sans titre');
      if(h.type==='navigation'&&(!h.target||!ids.has(h.target)))out.push({level:'error',text:where+' : la flèche ne mène à aucun panorama.',sceneId:scene.id});
      if(h.type==='image'&&!h.imageDataUrl)out.push({level:'error',text:where+' : point photo sans photo.',sceneId:scene.id});
      if(h.type==='video'&&!h.videoDataUrl&&!h.videoUrl)out.push({level:'error',text:where+' : point vidéo sans vidéo.',sceneId:scene.id});
      if(h.type==='lien'&&!h.url)out.push({level:'error',text:where+' : lien sans adresse.',sceneId:scene.id});
      if(h.type==='information'&&!h.text.trim()&&!h.url)out.push({level:'warn',text:where+' : point information vide.',sceneId:scene.id});
    }
  }
  for(const item of project.bottomBar){
    if(item.type==='lien'&&!item.url)out.push({level:'error',text:'Barre du bas · « '+(item.title||'bouton')+' » : lien sans adresse.'});
    if(item.type==='navigation'&&item.target&&!ids.has(item.target))out.push({level:'error',text:'Barre du bas · « '+(item.title||'bouton')+' » : destination introuvable ('+nameOf(item.target)+').'});
  }
  const open=(project.comments??[]).filter(c=>!c.done).length;
  if(open)out.push({level:'warn',text:open+' commentaire'+(open>1?'s':'')+' d’équipe non résolu'+(open>1?'s':'')+'.'});
  return out;
}
