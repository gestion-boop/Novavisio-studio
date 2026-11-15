import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';

const temporary=await mkdtemp(resolve('scripts/.floor-plan-check-'));
try{
  const entry=join(temporary,'check.mjs');
  await build({stdin:{resolveDir:process.cwd(),contents:`
    import assert from 'node:assert/strict';
    import {readFile} from 'node:fs/promises';
    import JSZip from 'jszip';
    import {newProject,validateProject,projectJsonParts} from './src/storage';
    import {stripExcluded,projectForSpaceExport} from './src/spaces';
    import {captureSkin,validateSkin,applySkin} from './src/skins';
    import {mediaSlots} from './src/cloud';
    import {exportStaticTour} from './src/exportTour';
    import {checkProject} from './src/projectCheck';
    const image='data:image/png;base64,AAAA';
    const project={...newProject(),name:'Plan test',bottomBar:[{id:'plan-button',type:'plan',title:'Plan',builtinIcon:'map',target:'',url:'',text:''}],
      scenes:['a','b','hidden'].map(id=>({id,name:id,dataUrl:image,hotspots:[],excluded:id==='hidden'})),
      floorPlan:{name:'Etage',imageDataUrl:image,points:[{sceneId:'a',x:0,y:100},{sceneId:'b',x:75,y:25},{sceneId:'hidden',x:50,y:50}]}};
    assert.equal(validateProject(newProject()).floorPlan,undefined,'Old projects remain valid');
    assert.deepEqual(validateProject(JSON.parse(projectJsonParts(project).join(''))).floorPlan,project.floorPlan,'JSON round trip retains points');
    for(const floorPlan of [null,{...project.floorPlan,imageDataUrl:'javascript:alert(1)'},{...project.floorPlan,points:[{sceneId:'missing',x:50,y:50}]},
      {...project.floorPlan,points:[{sceneId:'a',x:NaN,y:50}]},{...project.floorPlan,points:[{sceneId:'a',x:-1,y:0}]},
      {...project.floorPlan,points:[{sceneId:'a',x:0,y:101}]},{...project.floorPlan,points:[project.floorPlan.points[0],project.floorPlan.points[0]]}])
      assert.throws(()=>validateProject({...project,floorPlan}),'Invalid image / position rejected');
    const published=stripExcluded(project);
    assert.deepEqual(published.floorPlan.points.map(p=>p.sceneId),['a','b']);
    assert.equal(project.floorPlan.points.length,3,'Master is unchanged');
    const space=projectForSpaceExport(project,{id:'space',name:'Only B',sceneIds:['b']},true);
    assert.deepEqual(space.floorPlan.points.map(p=>p.sceneId),['b']);
    assert.equal(validateProject(space).floorPlan.points.length,1);
    const skin=validateSkin(captureSkin(project,'Plan skin'));
    assert.equal(skin.appearance.bottomBar[0].type,'plan');
    assert.equal(skin.appearance.floorPlan,undefined,'Skins never copy visit-specific plans');
    assert.equal(applySkin({...newProject(),bottomBar:[]},skin).bottomBar[0].type,'plan');
    assert.equal(applySkin(project,skin).floorPlan,project.floorPlan);
    const cloud=structuredClone(project);
    const slot=mediaSlots(cloud).find(slot=>slot.get()===image&&slot.kind==='frame');
    assert.ok(slot,'Plan participates in media upload/download');
    slot.set('nvmedia:plans/example.png');
    assert.equal(cloud.floorPlan.imageDataUrl,'nvmedia:plans/example.png');
    slot.set(image);validateProject(cloud);
    assert.ok(checkProject({...project,floorPlan:undefined}).some(issue=>issue.barId==='plan-button'&&issue.level==='error'));
    assert.ok(!checkProject(project).some(issue=>issue.barId==='plan-button'));
    globalThis.window={location:{href:'https://example.test/index.html'}};
    globalThis.fetch=async value=>new Response(await readFile('dist/'+new URL(value).pathname.replace(/^\\//,'')));
    let archive;
    const createURL=URL.createObjectURL,revokeURL=URL.revokeObjectURL;
    URL.createObjectURL=blob=>{archive=blob;return 'blob:export-test';};URL.revokeObjectURL=()=>{};
    globalThis.document={createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}};
    const timeout=globalThis.setTimeout;globalThis.setTimeout=()=>0;
    try{await exportStaticTour(published);}finally{URL.createObjectURL=createURL;URL.revokeObjectURL=revokeURL;globalThis.setTimeout=timeout;}
    const zip=await JSZip.loadAsync(await archive.arrayBuffer());
    const jsonPath=Object.keys(zip.files).find(path=>path.endsWith('/data/visite.json'));
    const exported=JSON.parse(await zip.file(jsonPath).async('string'));
    assert.equal(exported.floorPlan.imageDataUrl,'media/plan/plan.png');
    assert.ok(zip.file('plan-test/media/plan/plan.png'),'ZIP includes actual plan image');
    assert.deepEqual(exported.floorPlan.points.map(p=>p.sceneId),['a','b']);
    assert.equal(exported.bottomBar[0].type,'plan');
    assert.ok((await zip.file('plan-test/index.html').async('string')).includes('media/plan/plan.png'));
    console.log('Floor plan checks passed: validation, JSON, filtering, skins, cloud media slots, publication checks and static ZIP.');
  `},bundle:true,platform:'node',format:'esm',packages:'external',define:{'import.meta.env':'{}'},outfile:entry,logLevel:'silent'});
  await import(pathToFileURL(entry).href);
}finally{await rm(temporary,{recursive:true,force:true});}
