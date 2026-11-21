import {DEFAULT_INTRO_DESIGN} from '../src/introDesign';
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {SetupBarPreview} from '../src/SetupBarPreview';
import {defaultBarStyle,newProject,updateBarStyle,validateProject} from '../src/storage';

describe('fond des boutons de la barre',()=>{
  it('affiche la couleur choisie à la place du fond du pack et conserve le pack',()=>{
    const project=newProject();
    const icon={id:'custom',name:'Bouton',dataUrl:'data:image/png;base64,AAAA'};
    project.icons=[icon];
    project.bottomBar=[{...project.bottomBar[0],iconId:icon.id}];
    const preview=()=>renderToStaticMarkup(createElement(SetupBarPreview,{project}));

    expect(preview()).toContain('has-custom-png');
    project.barStyle=updateBarStyle(project.barStyle,{button:'#224a95'});
    expect(preview()).toContain('--nv-button-bg:#224a95');
    expect(preview()).not.toContain('has-custom-png');
    expect(validateProject(JSON.parse(JSON.stringify(project))).barStyle.useBarGlyphs).toBe(true);
    expect(project.bottomBar[0].iconId).toBe(icon.id);

    project.barStyle=updateBarStyle(project.barStyle,{useBarGlyphs:false});
    expect(preview()).toContain('has-custom-png');
  });

  it('conserve les images par défaut et lors du réglage du fond de la barre',()=>{
    const {useBarGlyphs,...oldStyle}=defaultBarStyle();
    expect(validateProject({...newProject(),barStyle:oldStyle}).barStyle.useBarGlyphs).toBe(false);
    expect(updateBarStyle(oldStyle,{background:'#224a95'}).useBarGlyphs).toBe(false);
  });
});

it('initialise les couleurs historiques de l’intro puis les conserve quand la barre change',()=>{
  const project=validateProject({...newProject(),introDesign:DEFAULT_INTRO_DESIGN});
  const before=project.introDesign;
  const barStyle=updateBarStyle(project.barStyle,{button:'#224a95'});
  expect(before?.buttonColor).toBe(defaultBarStyle().button);
  expect(validateProject({...project,barStyle}).introDesign).toEqual(before);
});

it('applique les réglages de contour et de pictogramme aux boutons',()=>{
  for(const update of [{buttonOutline:'#224a95'},{buttonOutlineWidth:2},{icon:'#224a95'}]){
    expect(updateBarStyle(defaultBarStyle(),update).useBarGlyphs).toBe(true);
  }
});

it('affiche l’icône personnalisée d’un bouton sans désactiver les couleurs des autres',()=>{
  const project=newProject();
  const icon={id:'library',name:'Accueil',dataUrl:'data:image/png;base64,AAAA'};
  project.icons=[icon];
  project.bottomBar=project.bottomBar.slice(0,2).map((item,index)=>({
    ...item,iconId:icon.id,useCustomIcon:index===0
  }));
  project.barStyle=updateBarStyle(project.barStyle,{button:'#224a95'});
  const markup=renderToStaticMarkup(createElement(SetupBarPreview,{project:validateProject(project)}));
  expect(markup.match(/has-custom-png/g)).toHaveLength(1);
});
