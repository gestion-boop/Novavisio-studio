import {describe,expect,it} from 'vitest';
import {projectForSpaceExport,stripExcluded} from '../src/spaces';
import {roomNameVisible} from '../src/storage';

const img='data:image/jpeg;base64,AAAA';
const scene=(id:string,extra:Record<string,unknown>={})=>({id,name:id,dataUrl:img,hotspots:[],...extra});
const project=(over:Record<string,unknown>={})=>({
  version:1,name:'Camping',languages:['fr'],icons:[],audioTracks:[],bottomBar:[],
  scenes:[
    scene('a',{nightSourceSceneId:'night',hotspots:[{id:'h1',type:'navigation',target:'b'},{id:'h2',type:'navigation',target:'c'}]}),
    scene('b'),scene('c'),scene('night',{excluded:true}),scene('d')
  ],
  spaces:[{id:'s1',name:'Kota',sceneIds:['a','b']},{id:'s2',name:'Autre',sceneIds:['c','d']}],
  ...over
}) as never;

describe('export d’un espace',()=>{
  it('ne contient que les panoramas de l’espace',()=>{
    const p=project();
    const out=projectForSpaceExport(p,(p as any).spaces[0],true);
    expect(out.scenes.map(s=>s.id)).toEqual(['a','b']);
    expect(out.spaces).toEqual([]);
  });
  it('retire les flèches qui mènent vers un autre espace',()=>{
    const p=project();
    const out=projectForSpaceExport(p,(p as any).spaces[0],true);
    expect(out.scenes[0].hotspots.map(h=>h.target)).toEqual(['b']);
  });
  it('garde le mode nuit même si le panorama de nuit est décoché',()=>{
    const p=project();
    const out=projectForSpaceExport(p,(p as any).spaces[0],true);
    expect(out.scenes[0].nightDataUrl).toBe(img);
    expect(out.scenes[0].nightSourceSceneId).toBeUndefined();
  });
  it('garde le mode nuit dans l’export du projet complet',()=>{
    const out=projectForSpaceExport(project(),null,true);
    expect(out.scenes.find(s=>s.id==='a')?.nightDataUrl).toBe(img);
    expect(out.scenes.some(s=>s.id==='night')).toBe(false);
  });
  it('reporte le réglage « nom de la pièce » de l’espace, sauf réglage propre au panorama',()=>{
    const p=project({
      scenes:[scene('a'),scene('b',{showRoomName:true}),scene('c')],
      spaces:[{id:'s1',name:'Kota',sceneIds:['a','b'],showRoomName:false}]
    });
    const out=projectForSpaceExport(p,(p as any).spaces[0],true);
    expect(roomNameVisible(out,out.scenes[0])).toBe(false);
    expect(roomNameVisible(out,out.scenes[1])).toBe(true);
  });
  it('vide les boutons de la barre qui pointent vers un autre espace',()=>{
    const p=project({bottomBar:[{id:'x',title:'Aller',type:'navigation',target:'c'},{id:'y',title:'Ici',type:'navigation',target:'b'}]});
    const out=projectForSpaceExport(p,(p as any).spaces[0],true);
    expect(out.bottomBar.map(b=>b.target)).toEqual(['','b']);
  });
});

describe('panoramas décochés',()=>{
  it('stripExcluded retire le panorama mais copie sa photo de nuit',()=>{
    const out=stripExcluded(project());
    expect(out.scenes.some(s=>s.id==='night')).toBe(false);
    expect(out.scenes.find(s=>s.id==='a')?.nightDataUrl).toBe(img);
  });
});
