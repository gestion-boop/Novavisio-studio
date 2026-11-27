import {expect,test,type Page} from '@playwright/test';
import {newProject,type StudioProject} from '../src/storage';

const supabase='https://novastudioe2e.supabase.co';
const projectId='a1111111-1111-4111-8111-111111111111';
const userId='b1111111-1111-4111-8111-111111111111';
const shareToken='a'.repeat(64);
const user={id:userId,email:'e2e@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
async function seedSession(page:Page,link?:{projectId:string;revision:number;version:number}){
  await page.context().addInitScript(({user,link})=>{
    if(localStorage.getItem('e2e-initialized'))return;
    localStorage.setItem('e2e-initialized','yes');
    if(link)localStorage.setItem('nvstudio-cloud-link',JSON.stringify(link));
    localStorage.setItem('sb-novastudioe2e-auth-token',JSON.stringify({access_token:'e2e',refresh_token:'e2e',token_type:'bearer',expires_at:4102444800,user}));
  },{user,link});
}

async function panorama(page:Page){
  return await page.evaluate(()=>{
    const image=document.createElement('canvas');
    image.width=1024;image.height=512;
    const ctx=image.getContext('2d')!;
    ctx.fillStyle='#17425c';ctx.fillRect(0,0,1024,512);
    ctx.fillStyle='#edcb85';ctx.fillRect(320,150,150,150);
    return image.toDataURL('image/jpeg');
  });
}

async function importPanoramas(page:Page,image:string){
  const data=Buffer.from(image.split(',')[1],'base64');
  await page.locator('input[multiple][accept="image/jpeg,image/png,image/webp"]').first().setInputFiles(
    ['Entrée','Salon'].map(name=>({name:name+'.jpg',mimeType:'image/jpeg',buffer:data})),
  );
  await expect(page.locator('.panorama canvas').first()).toBeVisible();
}

async function closePreparation(page:Page){
  const prepare=page.getByRole('button',{name:'Fermer la préparation'});
  await expect(prepare).toBeVisible();
  await prepare.click();
}

test('récupère un projet importé et modifié après perte du réseau et fermeture',async({page,context})=>{
  await context.route(supabase+'/**',route=>route.abort());
  await page.goto('/');
  await closePreparation(page);
  const image=await panorama(page);
  await importPanoramas(page,image);
  await context.setOffline(true);
  await page.getByRole('textbox',{name:'Nom du projet'}).fill('Visite récupérée hors ligne');
  await expect.poll(async()=>await page.evaluate(async()=>{
    const open=indexedDB.open('novavisio-studio-v1',1);
    return await new Promise<string[]>(resolve=>{
      open.onsuccess=()=>{
        const db=open.result;
        const read=db.transaction('projects').objectStore('projects').getAll(
          IDBKeyRange.bound('recovery-index:v1:local/','recovery-index:v1:local/\uffff'),
        );
        read.onsuccess=()=>{resolve(read.result.map(row=>row.name));db.close();};
      };
    });
  })).toContain('Visite récupérée hors ligne');
  await page.close();

  await context.setOffline(false);
  const reopened=await context.newPage();
  await reopened.goto('/');
  await closePreparation(reopened);
  await reopened.getByRole('button',{name:/Reprendre « Visite récupérée hors ligne »/}).click();
  await expect(reopened.getByRole('textbox',{name:'Nom du projet'})).toHaveValue('Visite récupérée hors ligne');
  await expect(reopened.locator('.panorama canvas').first()).toBeVisible();
  await reopened.keyboard.press('Control+s');
  await expect(reopened.getByRole('status').filter({hasText:'Sauvegardé localement'})).toBeVisible();
  await reopened.reload();
  await expect(reopened.getByRole('textbox',{name:'Nom du projet'})).toHaveValue('Visite récupérée hors ligne');
});

test('reprend le brouillon Cloud sans écraser une version distante plus récente',async({page,context})=>{
  await page.goto('/visitor.html');
  const image=await panorama(page);
  const name='Brouillon client';
  const remote={...newProject(),name,preparationComplete:true,scenes:[{id:'a',name:'Entrée',dataUrl:image,hotspots:[]}]};
  let version=3;
  let writes=0;
  let offline=false;
  await seedSession(page,{projectId,revision:1,version:3});
  await context.route(supabase+'/**',async route=>{
    const url=new URL(route.request().url());
    const path=url.pathname;
    if(offline)return route.abort();
    let json:unknown=[];
    if(path==='/auth/v1/user')json=user;
    if(path.endsWith('/nvstudio_projects')){
      const select=url.searchParams.get('select');
      json=select==='name'?[{name}]:select==='working,working_version'
        ?[{working:remote,working_version:version}]:[{working_version:version}];
    }
    if(path.endsWith('/nvstudio_revisions'))json=[{revision:1}];
    if(path.endsWith('/nvstudio_write_state'))json={canWrite:true,holderEmail:user.email,participants:[]};
    if(path.endsWith('/nvstudio_save_working'))writes++;
    await route.fulfill({json,headers:{'access-control-allow-origin':'*'}});
  });
  await page.goto('/');
  await expect(page.getByRole('textbox',{name:'Nom du projet'})).toHaveValue(name);
  await expect(page.locator('.panorama canvas').first()).toBeVisible();
  offline=true;
  await page.getByRole('textbox',{name:'Nom du projet'}).fill(name+' modifié');
  await expect.poll(async()=>await page.evaluate(async({userId,projectId})=>{
    const result=await new Promise<IDBDatabase>((resolve,reject)=>{
      const request=indexedDB.open('novavisio-studio-v1',1);
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    const prefix='recovery-index:v1:cloud:'+userId+':'+projectId+'/';
    return await new Promise<string[]>(resolve=>{
      const read=result.transaction('projects').objectStore('projects').getAll(IDBKeyRange.bound(prefix,prefix+'\uffff'));
      read.onsuccess=()=>{resolve(read.result.map(row=>row.name));result.close();};
    });
  },{userId,projectId})).toContain(name+' modifié');
  await page.reload();
  await expect(page.getByRole('button',{name:/Reprendre « Brouillon client modifié »/})).toBeVisible({timeout:15_000});
  offline=false;version=4;
  await page.reload();
  await page.getByRole('button',{name:/Reprendre « Brouillon client modifié »/}).click();
  await expect(page.getByRole('textbox',{name:'Nom du projet'})).toHaveValue(name+' modifié');
  await page.keyboard.press('Control+s');
  const confirmation=page.getByRole('alertdialog').getByRole('button',{name:'Confirmer',exact:true});
  await confirmation.click();
  await expect(page.getByRole('alertdialog',{name:'Sauvegarde impossible'})).toBeVisible();
  expect(writes).toBe(0);
});

test('ouvre la visite publiée et passe dans la deuxième scène à 0 ms',async({page,context})=>{
  await page.goto('/visitor.html');
  const image=await panorama(page);
  const snapshot:StudioProject={...newProject(),name:'Visite publiée',transitionMs:0,scenes:[
    {id:'a',name:'Entrée',dataUrl:image,hotspots:[{id:'navigation-a',title:'Vers le salon',text:'',type:'navigation',target:'b',yaw:0,pitch:0}]},
    {id:'b',name:'Salon',dataUrl:image,arrivalYaw:.65,arrivalPitch:.12,hotspots:[
      {id:'poster',title:'Affiche fixe',text:'',target:'',type:'image',imageDataUrl:image,yaw:.65,pitch:.12,imageBounce:false},
      {id:'sphere',title:'Vers l’entrée',text:'',type:'navigation',target:'a',yaw:.78,pitch:.12,sphere:true},
    ]},
  ]};
  await context.route(supabase+'/rest/v1/rpc/nvstudio_get_share',route=>route.fulfill({json:{
    status:'ok',permanent:true,snapshot,
  },headers:{'access-control-allow-origin':'*'}}));
  await page.goto('/share.html?t='+shareToken);
  await expect(page.getByText('Entrée',{exact:true})).toBeVisible();
  await page.locator('#psv-marker-navigation-a').click();
  await expect(page.locator('#psv-marker-sphere')).toBeVisible();
  await expect(page.getByText('Salon',{exact:true})).toBeVisible();
  await expect(page.locator('#psv-marker-navigation-a')).toHaveCount(0);
});

test('importe, édite et publie une visite que le lecteur peut ouvrir',async({page,context})=>{
  await seedSession(page);
  const name='Parcours de publication';
  let media:Buffer;
  let snapshot:StudioProject|undefined;
  let revision=0;
  let published=false;
  let workingVersion=0;
  const publishedAt='2026-01-01T10:00:00Z';
  await context.route(supabase+'/**',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    const path=url.pathname;
    const headers={'access-control-allow-origin':'*'};
    if(path.startsWith('/storage/v1/object/')&&request.method()==='GET'){
      await route.fulfill({body:media,contentType:'image/jpeg',headers});return;
    }
    let json:unknown=[];
    if(path==='/auth/v1/user')json=user;
    if(path.endsWith('/nvstudio_projects')){
      if(request.method()==='POST')json={id:projectId};
      else if(url.searchParams.get('select')==='name')json=[{name}];
      else json=[{working_version:workingVersion}];
    }
    if(path.endsWith('/nvstudio_save_working'))json={version:++workingVersion};
    if(path.endsWith('/nvstudio_revisions')){
      if(request.method()==='POST'){
        const entry=request.postDataJSON();
        snapshot=entry.snapshot;
        revision=entry.revision;
      }else json=revision?[{revision}]:[];
    }
    if(path.endsWith('/nvstudio_publish')){
      published=true;
      json={token:shareToken,published_at:publishedAt,revision};
    }
    if(path.endsWith('/nvstudio_publications'))json=published?[{
      token:shareToken,published_revision:revision,published_at:publishedAt,revoked_at:null,
    }]:[];
    if(path.endsWith('/nvstudio_get_share'))json=published?{status:'ok',permanent:true,snapshot}:{status:'invalid'};
    await route.fulfill({json,headers});
  });
  await page.goto('/');
  await closePreparation(page);
  const image=await panorama(page);
  media=Buffer.from(image.split(',')[1],'base64');
  await importPanoramas(page,image);
  await page.getByRole('textbox',{name:'Nom du projet'}).fill(name);
  await page.getByRole('button',{name:/Tous les outils : panoramas/}).first().click();
  await page.getByRole('button',{name:'Publier',exact:true}).click();
  await page.getByRole('alertdialog',{name:'Publier sur NovaVisio'}).getByRole('button',{
    name:/Confirmer la publication|Publier quand même/,
  }).click();
  await expect(page.getByRole('alertdialog',{name:'Résultat de la publication'})).toContainText('publié · révision 1');
  expect(snapshot?.name).toBe(name);
  expect(snapshot?.scenes.map(scene=>scene.name)).toEqual(['Entrée','Salon']);
  const visitor=await context.newPage();
  await visitor.goto('/share.html?t='+shareToken);
  await expect(visitor.getByText('Entrée',{exact:true})).toBeVisible();
});

test('charge le panorama voisin avant une vidéo lente dans la scène de départ',async({page,context})=>{
  await page.goto('/visitor.html');
  const image=await panorama(page);
  const jpeg=Buffer.from(image.split(',')[1],'base64');
  const requested:string[]=[];
  let releaseVideo=()=>{};
  const videoGate=new Promise<void>(resolve=>{releaseVideo=resolve;});
  const snapshot:StudioProject={...newProject(),bottomBar:[],name:'Visite avec médias différés',transitionMs:0,scenes:[
    {id:'a',name:'Accueil test',dataUrl:'nvmedia:first.jpg',hotspots:[
      {id:'next',type:'navigation',text:'',title:'Vers le salon',target:'b',yaw:0,pitch:0},
      {id:'slow-video',type:'video',text:'',title:'Vidéo lourde',target:'',yaw:.3,pitch:.1,videoDataUrl:'nvmedia:slow.mp4'},
    ]},
    {id:'b',name:'Salon test',dataUrl:'nvmedia:near.jpg',arrivalYaw:.5,hotspots:[
      {id:'back',type:'navigation',text:'',title:'Retour',target:'a',yaw:.5,pitch:0,sphere:true},
      {id:'poster-near',type:'image',text:'',title:'Affiche',target:'',yaw:.6,pitch:.1,imageDataUrl:'nvmedia:near-poster.jpg',imageBounce:false},
    ]},
    {id:'c',name:'Scène distante',dataUrl:'nvmedia:far.jpg',hotspots:[]},
  ]};
  const headers={'access-control-allow-origin':'*'};
  await context.route(supabase+'/rest/v1/rpc/nvstudio_get_share',route=>route.fulfill({
    json:{status:'ok',permanent:true,snapshot},headers,
  }));
  await context.route(supabase+'/storage/v1/object/**',async route=>{
    const file=new URL(route.request().url()).pathname.split('/').at(-1)!;
    requested.push(file);
    if(file==='slow.mp4'){
      await videoGate;
      await route.fulfill({status:404,json:{message:'Test terminé'},headers});
      return;
    }
    await route.fulfill({body:jpeg,contentType:'image/jpeg',headers});
  });
  try{
    const opening=Date.now();
    await page.goto('/share.html?t='+shareToken);
    await expect(page.getByText('Accueil test',{exact:true})).toBeVisible();
    const firstUsableMs=Date.now()-opening;
    await expect.poll(()=>requested.includes('slow.mp4')&&requested.includes('near.jpg')).toBe(true);
    expect(requested[0]).toBe('first.jpg');
    expect(requested).not.toContain('far.jpg');
    const clicked=Date.now();
    await page.locator('#psv-marker-next').click();
    await expect(page.locator('#psv-marker-back')).toBeVisible();
    const nextUsableMs=Date.now()-clicked;
    await expect.poll(()=>requested.includes('near-poster.jpg')).toBe(true);
    console.log('Fixture 360° · ouverture '+firstUsableMs+' ms · deuxième scène '+nextUsableMs+' ms');
  }finally{releaseVideo();}
});
