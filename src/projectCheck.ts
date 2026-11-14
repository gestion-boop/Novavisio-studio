import type {StudioProject} from './storage';

export type IssueKind='nav'|'photo'|'video'|'link'|'info'|'scene-name'|'scene-empty'|'bar-link'|'bar-nav'|'comments'|'other';
export type CheckIssue={id:string;level:'error'|'warn';text:string;kind:IssueKind;hint:string;sceneId?:string;hotspotId?:string;barId?:string};

/** Contrôle avant publication : repère ce qui sera visible vide ou cassé pour les visiteurs. */
export function checkProject(project:StudioProject):CheckIssue[]{
  const out:Omit<CheckIssue,'id'>[]=[];
  const ids=new Set(project.scenes.map(s=>s.id));
  const nameOf=(id:string)=>project.scenes.find(s=>s.id===id)?.name||'panorama';
  if(!project.scenes.length)out.push({level:'error',kind:'other',hint:'Importe au moins un panorama.',text:'Le projet ne contient aucun panorama.'});
  for(const scene of project.scenes){
    const label='« '+(scene.name||'sans nom')+' »';
    if(!scene.name.trim()||/\.(jpe?g|png|webp)$/i.test(scene.name)||/^(img|dsc|pxl|pano)[-_ ]?\d*/i.test(scene.name))
      out.push({level:'warn',kind:'scene-name',hint:'Donne un vrai nom à ce panorama dans le champ ci-contre.',text:'Panorama '+label+' : le nom ressemble à un nom de fichier, pense à le renommer.',sceneId:scene.id});
    if(!scene.hotspots.length)out.push({level:'warn',kind:'scene-empty',hint:'Ajoute un point avec la barre du bas (Navigation, Information, Photo…).',text:'Panorama '+label+' : aucun point, c’est une impasse pour le visiteur.',sceneId:scene.id});
    for(const h of scene.hotspots){
      const same=scene.hotspots.filter(o=>o.type===h.type&&(o.title||'')===(h.title||''));
      const where=label+' · '+(h.title||'point sans titre')+(same.length>1?' (n°'+(same.indexOf(h)+1)+')':'');
      const base={sceneId:scene.id,hotspotId:h.id};
      if(h.type==='navigation'&&(!h.target||!ids.has(h.target)))out.push({level:'error',kind:'nav',hint:'Choisis le panorama de destination dans la galerie.',text:where+' : la flèche ne mène à aucun panorama.',...base});
      if(h.type==='image'&&!h.imageDataUrl)out.push({level:'error',kind:'photo',hint:'Choisis ou importe la photo dans la fenêtre ouverte.',text:where+' : point photo sans photo.',...base});
      if(h.type==='video'&&!h.videoDataUrl&&!h.videoUrl)out.push({level:'error',kind:'video',hint:'Choisis ou importe la vidéo dans la fenêtre ouverte.',text:where+' : point vidéo sans vidéo.',...base});
      if(h.type==='lien'&&!h.url)out.push({level:'error',kind:'link',hint:'Colle l’adresse du lien dans le champ ci-contre.',text:where+' : lien sans adresse.',...base});
      if(h.type==='information'&&!h.text.trim()&&!h.url)out.push({level:'warn',kind:'info',hint:'Écris le texte de l’information dans le champ ci-contre.',text:where+' : point information vide.',...base});
    }
  }
  for(const item of project.bottomBar){
    if(item.type==='lien'&&!item.url)out.push({level:'error',kind:'bar-link',hint:'Colle l’adresse du lien dans le champ ci-contre.',barId:item.id,text:'Barre du bas · « '+(item.title||'bouton')+' » : lien sans adresse.'});
    if(item.type==='navigation'&&item.target&&!ids.has(item.target))out.push({level:'error',kind:'bar-nav',hint:'Choisis une destination existante pour ce bouton.',barId:item.id,text:'Barre du bas · « '+(item.title||'bouton')+' » : destination introuvable ('+nameOf(item.target)+').'});
  }
  const open=(project.comments??[]).filter(c=>!c.done).length;
  if(open)out.push({level:'warn',kind:'comments',hint:'Ouvre les commentaires et marque-les comme résolus.',text:open+' commentaire'+(open>1?'s':'')+' d’équipe non résolu'+(open>1?'s':'')+'.'});
  return out.map((issue,i)=>({...issue,id:issue.kind+'|'+(issue.hotspotId??issue.barId??issue.sceneId??'')+(issue.hotspotId||issue.barId||issue.sceneId?'':'|'+i)}));
}
