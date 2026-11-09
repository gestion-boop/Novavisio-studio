import JSZip from 'jszip';
import type {StudioProject} from './storage';

type BuildManifestEntry = {
  file?:string;
  css?:string[];
  assets?:string[];
  imports?:string[];
  dynamicImports?:string[];
  isEntry?:boolean;
  name?:string;
};
type BuildManifest=Record<string,BuildManifestEntry>;
const slug=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,65)||'visite-novavisio';
const htmlEscape=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const jsonEscape=(v:unknown)=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
function addImage(zip:JSZip,dataUrl:string,path:string):string {
  const parts=/^data:image\/(jpeg|png|webp|gif);base64,([\s\S]+)$/i.exec(dataUrl);
  if(!parts) throw Error('Une image n’est pas lisible. Réimporte-la dans le projet.');
  const ext=parts[1].toLowerCase()==='jpeg'?'jpg':parts[1].toLowerCase();
  const name=path+'.'+ext;
  zip.file(name,parts[2],{base64:true,compression:'STORE'});
  return name;
}
function publicProject(zip:JSZip,source:StudioProject):StudioProject {
  return {...source,
    scenes:source.scenes.map((scene,i)=>({
      ...scene,
      dataUrl:addImage(zip,scene.dataUrl,'media/panoramas/pano-'+String(i+1).padStart(3,'0')+'-'+scene.id),
      hotspots:scene.hotspots.map((h,j)=>({
        ...h,
        imageDataUrl:h.imageDataUrl?addImage(zip,h.imageDataUrl,'media/cadres/cadre-'+String(i+1).padStart(3,'0')+'-'+String(j+1).padStart(3,'0')+'-'+h.id):undefined
      }))
    })),
    icons:source.icons.map((icon,i)=>({...icon,dataUrl:addImage(zip,icon.dataUrl,'media/icones/icone-'+String(i+1).padStart(3,'0')+'-'+icon.id)}))
  };
}
function collectAssets(manifest:BuildManifest,key:string,seen:Set<string>,files:Set<string>) {
  if(seen.has(key))return;
  seen.add(key);
  const entry=manifest[key];
  if(!entry)throw Error('Module de visite manquant : '+key);
  if(entry.file)files.add(entry.file);
  for(const file of [...(entry.css??[]),...(entry.assets??[])])files.add(file);
  for(const other of [...(entry.imports??[]),...(entry.dynamicImports??[])])collectAssets(manifest,other,seen,files);
}
async function readBuildFile(path:string):Promise<Blob> {
  if(path.startsWith('/') || path.split('/').includes('..'))throw Error('Chemin de ressource non autorisé');
  const response=await fetch(new URL('./'+path,window.location.href).toString(),{cache:'no-store'});
  if(!response.ok)throw Error('Impossible de charger '+path+' ('+response.status+')');
  return response.blob();
}
function exportIndex(title:string,js:string,styles:string[],data:StudioProject):string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#101f29">
<title>${htmlEscape(title)} | Visite 360°</title>
${styles.map(css=>'<link rel="stylesheet" href="./'+htmlEscape(css)+'">').join('\n')}
</head>
<body>
<div id="visitor-root"></div>
<script id="nv-project-data" type="application/json">${jsonEscape(data)}</script>
<script type="module" src="./${htmlEscape(js)}"></script>
</body>
</html>`;
}
/**
 * Produit un dossier statique complet :
 * visite-nom/index.html
 * visite-nom/assets/*.js, *.css
 * visite-nom/media/panoramas, icones et cadres
 * visite-nom/data/visite.json
 * visite-nom/LISEZ-MOI.txt
 */
export async function exportStaticTour(source:StudioProject):Promise<void> {
  if(!source.scenes.length)throw Error('Aucun panorama à exporter.');
  // La construction Vite publie un manifeste qui indique les fichiers exacts du lecteur public.
  const result=await fetch(new URL('./export-manifest.json',window.location.href),{cache:'no-store'});
  if(!result.ok)throw Error('Manifeste du lecteur introuvable. Lance un build de production avant cet export.');
  const manifest=(await result.json()) as BuildManifest;
  const key=Object.keys(manifest).find(name=>manifest[name]?.isEntry &&
    (name==='visitor.html'||name.endsWith('/visitor.html')||manifest[name].name==='visitor'));
  if(!key)throw Error('Le lecteur exportable n’est pas inclus dans cette version.');
  const entry=manifest[key];
  if(!entry.file)throw Error('Script du lecteur absent du manifeste.');

  const folderName=slug(source.name);
  const zip=new JSZip();
  const directory=zip.folder(folderName);
  if(!directory)throw Error('Impossible de créer le dossier export.');
  const visit=publicProject(directory,source);
  const all=new Set<string>();
  collectAssets(manifest,key,new Set(),all);
  // Inclure les fichiers CSS, JS et ressources associés sans les chemins d'administration.
  await Promise.all([...all].map(async path=>directory.file(path,await readBuildFile(path),{compression:'STORE'})));
  const css=[...all].filter(path=>path.endsWith('.css'));
  directory.file('index.html',exportIndex(source.name,entry.file,css,visit));
  directory.file('data/visite.json',JSON.stringify(visit,null,2));
  directory.file('LISEZ-MOI.txt',
    'NOVAVISIO STUDIO - DOSSIER DE VISITE HTML\n\n'+
    'Pour publier : décompresser cette archive puis transférer tout le contenu du dossier '+folderName+
    ' sur un hébergement web statique (Vercel, FTP ou autre).\n'+
    'La page d’entrée est index.html. Ne pas séparer les dossiers assets, media et data.\n'+
    'La visite contient des fichiers HTML, CSS, JavaScript, des photos et une copie JSON des paramètres.\n'+
    'Pour tester localement, utiliser un serveur HTTP : par exemple python3 -m http.server 8080.\n'+
    'Un double-clic sur index.html peut être bloqué par certains navigateurs à cause des modules JavaScript.\n'+
    'Les sites externes peuvent bloquer leur affichage dans une iframe.\n'+
    'Les URL d’introduction nécessitent une connexion Internet.\n'+
    'Le fichier source éditable .nvstudio.json est sauvegardé séparément via NovaVisio Studio.\n'
  );
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=folderName+'-html.zip';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
