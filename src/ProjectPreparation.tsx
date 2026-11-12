import {MediaIconDefaults} from './MediaIconSettings';
import {ButtonImporter} from './ButtonImporter';
import {SetupBarPreview} from './SetupBarPreview';
import {useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {STUDIO_LANGUAGES,defaultBarStyle,isSafeAudioData,readImage,type BarStyle,type StudioProject} from './storage';
import {BarDimensions,PreparationDialog} from './PreparationControls';
import {SkinChoices} from './SkinLibrary';
import {ICON_PACKS,packPreview,prepareIconPack} from './iconPacks';
import {ClientStep,ClientColorProposals,ClientButtonsStep} from './ClientSetupSteps';

const TITLES:Record<string,string>={client:'Client',project:'Projet & skin',icons:'Icônes',colors:'Couleurs & barre',buttons:'Boutons de la barre',languages:'Langues',panoramas:'Panoramas',music:'Musique',ready:'Prêt à créer'};
const palettes=[
  {name:'Camping',background:'#f0e9d8',outline:'#91816b',button:'#536e28',buttonOutline:'#859652',icon:'#fff4cf'},
  {name:'Océan',background:'#e0eff3',outline:'#6591a5',button:'#176a91',buttonOutline:'#62a4bc',icon:'#ffffff'},
  {name:'Graphite',background:'#28333d',outline:'#718692',button:'#15212b',buttonOutline:'#546b7a',icon:'#ffffff'},
  {name:'Bordeaux',...defaultBarStyle()},
];
export function ProjectPreparation({project,setProject,onClose,onFinish,onImportPanoramas}:{project:StudioProject;setProject:Dispatch<SetStateAction<StudioProject>>;onClose:()=>void;onFinish:()=>void;onImportPanoramas:(files:FileList|null)=>Promise<void>}){
  const [step,setStep]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[saveSkin,setSaveSkin]=useState(false);
  const content=useRef<HTMLDivElement>(null);
  // Visite créée à partir d'un client : étapes supplémentaires (fiche, boutons proposés).
  const clientMode=!!project.clientProfile?.name?.trim();
  const keys=[...(clientMode?['client']:[]),'project','icons','colors',...(clientMode?['buttons']:[]),'languages','panoramas','music','ready'];
  const steps=keys.map(k=>TITLES[k]);
  const key=keys[Math.min(step,keys.length-1)];
  function move(index:number){setStep(index);setMessage('');content.current?.scrollTo({top:0});}
  const patchStyle=(value:Partial<BarStyle>)=>setProject(p=>({...p,barStyle:{...p.barStyle,...value}}));
  async function choosePack(id:string){setBusy(true);setMessage('Préparation des icônes…');try{const apply=await prepareIconPack(id,project);const next=apply(project);setProject(next);setMessage('Collection appliquée à la barre et aux prochaines flèches.');}catch(e){setMessage(String(e));}finally{setBusy(false);}}
  async function importMusic(file?:File){
    if(!file)return;setBusy(true);setMessage('Import de la musique…');
    try{
      if(file.size>14*1024*1024||!['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/mp4'].includes(file.type))throw Error('Choisis un fichier audio MP3, WAV, OGG ou WebM de 14 Mo maximum.');
      if((project.audioTracks?.length??0)>=60)throw Error('La bibliothèque contient déjà 60 pistes.');
      const dataUrl=await readImage(file);if(!isSafeAudioData(dataUrl))throw Error('Format audio incompatible.');
      const id=crypto.randomUUID();
      setProject(p=>({...p,audioTracks:[...(p.audioTracks??[]),{id,name:file.name.slice(0,120),dataUrl,volume:65,loop:true}],defaultMusicTrackId:id}));
      setMessage('Musique importée. Elle sera utilisée pour les nouveaux panoramas.');
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  }
  const track=project.audioTracks?.find(t=>t.id===project.defaultMusicTrackId);
  return <PreparationDialog title="Préparer mon projet" onClose={()=>{if(!busy)onClose();}}>
    <div className="nv-setup-layout"><nav aria-label="Étapes de préparation">{steps.map((title,index)=><button type="button" disabled={busy} key={title} aria-current={step===index?'step':undefined} onClick={()=>move(index)}><span>{index+1}</span>{title}</button>)}</nav>
      <div className="nv-setup-main"><div className="nv-setup-progress"><span>ÉTAPE {step+1} SUR {steps.length}</span><progress value={step+1} max={steps.length}/></div>
        <div ref={content} className="nv-setup-step"><h3>{steps[Math.min(step,steps.length-1)]}</h3>
          {key==='client'&&<ClientStep project={project} setProject={setProject}/>}
          {key==='buttons'&&<ClientButtonsStep project={project} setProject={setProject} onMessage={setMessage}/>}
          {key==='project'&&<><p>Donne un nom à ta visite, puis démarre avec un skin enregistré ou prépare un nouveau style.</p>
            <label>Nom de l’établissement<input aria-label="Nom de l’établissement" value={project.name} maxLength={150} onChange={e=>setProject(p=>({...p,name:e.target.value}))}/></label>
            <SkinChoices project={project} setProject={setProject}/>
          </>}
          {key==='icons'&&<><p>Choisis une collection pour la barre et les prochaines flèches de navigation. Les points déjà placés conservent leurs icônes.</p>
            <ButtonImporter disabled={busy} project={project} setProject={setProject} onBusyChange={setBusy}/>
            <div className="nv-icon-pack-choices"><button type="button" disabled={busy} aria-pressed={project.iconPackId==='classic'} onClick={()=>{setProject(p=>({...p,iconPackId:'classic',defaultNavigationIcon:undefined,defaultPhotoIcon:undefined,defaultVideoIcon:undefined,favoriteNavigationIconSet:undefined,bottomBar:p.bottomBar.map(b=>({...b,iconId:undefined,hoverIconId:undefined,pressedIconId:undefined}))}));setMessage('Pictogrammes classiques sélectionnés.');}}><span className="nv-classic-pack">➜</span><strong>Classiques</strong><small>Pictogrammes simples</small></button>
              {ICON_PACKS.map(pack=><button key={pack.id} type="button" disabled={busy} aria-pressed={project.iconPackId===pack.id} onClick={()=>void choosePack(pack.id)}><img src={packPreview(pack.id)} alt=""/><strong>{pack.name}</strong><small>{pack.description}</small></button>)}
            </div>
            <MediaIconDefaults project={project} setProject={setProject}/>
            {project.icons.length>0&&<label>Ou une icône de ma bibliothèque pour les prochaines flèches<select aria-label="Icône par défaut des flèches" value={project.defaultNavigationIcon?.iconId??''} onChange={e=>{const id=e.target.value;setProject(p=>({...p,defaultNavigationIcon:id?{iconId:id,iconSize:40}:undefined,iconPackId:undefined}));}}><option value="">Choisir une icône…</option>{project.icons.map(icon=><option key={icon.id} value={icon.id}>{icon.name}</option>)}</select></label>}
          </>}
          {key==='colors'&&<><p>Règle les couleurs et les dimensions de la barre inférieure. Tu pourras les ajuster dans « Barre du bas ».</p>
            {clientMode&&<ClientColorProposals project={project} onPick={patchStyle}/>}
            <div className="nv-palette-choices">{palettes.map(palette=><button key={palette.name} type="button" onClick={()=>{const {name,...style}=palette;patchStyle(style);}}><span style={{background:palette.background,borderColor:palette.outline}}><i style={{background:palette.button}}/></span>{palette.name}</button>)}</div>
            <SetupBarPreview project={project}/>
            <BarDimensions style={project.barStyle} onChange={patchStyle}/>
            <div className="nv-setup-color-grid">{([['background','Fond de la barre'],['outline','Contour de la barre'],['button','Fond des boutons'],['buttonOutline','Contour des boutons'],['icon','Pictogrammes']] as const).map(([key,label])=><label key={key}>{label}<input type="color" aria-label={label} value={project.barStyle[key]} onChange={e=>patchStyle({[key]:e.target.value})}/></label>)}</div>
            <label>Arrondi : {project.barStyle.roundness} px<input type="range" min="0" max="60" value={project.barStyle.roundness} onChange={e=>patchStyle({roundness:Number(e.target.value)})}/></label>
          </>}
          {key==='languages'&&<><p>Choisis les langues proposées dans tes points Information. Le contenu traduit se renseigne ensuite sur chaque point.</p><div className="nv-setup-languages">{STUDIO_LANGUAGES.map(lang=><label key={lang.code}><input type="checkbox" checked={(project.languages??['fr']).includes(lang.code)} onChange={e=>{const checked=e.target.checked;setProject(p=>{const current=p.languages??['fr'];const languages=checked?[...new Set([...current,lang.code])]:current.filter(code=>code!==lang.code);return languages.length?{...p,languages}:p;});}}/><span>{lang.flag}</span>{lang.name}</label>)}</div></>}
          {key==='panoramas'&&<><p>Importe tes photos panoramiques 360° (JPG, PNG ou WebP, rapport 2:1 recommandé). Tu pourras placer les points une fois la préparation terminée.</p>
            <label className="nv-setup-upload">＋ Importer des panoramas<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e=>{const files=e.target.files;if(!files?.length)return;setBusy(true);setMessage('Import des panoramas…');void onImportPanoramas(files).then(()=>setMessage('Import terminé. Vérifie la liste des panoramas ci-dessous.')).catch(err=>setMessage(String(err))).finally(()=>setBusy(false));e.target.value='';}}/></label>
            <p>{project.scenes.length} panorama(s) dans le projet</p>
          </>}
          {key==='music'&&<><p>Ajoute une ambiance sonore. Une musique par défaut accompagne les nouveaux panoramas ; un même morceau continue lors des déplacements.</p>
            <label className="nv-setup-upload">♫ Importer une musique<input type="file" accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/webm,audio/mp4" disabled={busy} onChange={e=>{void importMusic(e.target.files?.[0]);e.target.value='';}}/></label>
            <label>Musique par défaut<select aria-label="Musique par défaut" value={project.defaultMusicTrackId??''} onChange={e=>{const id=e.target.value;setProject(p=>({...p,defaultMusicTrackId:id||undefined}));}}><option value="">Sans musique</option>{project.audioTracks?.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            {track&&<><audio controls src={track.dataUrl??track.url} preload="none"/><label>Volume : {track.volume} %<input type="range" min="0" max="100" value={track.volume} onChange={e=>{const volume=Number(e.target.value);setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,volume}:t)}));}}/></label><label className="toggle-row"><input type="checkbox" checked={track.loop} onChange={e=>{const loop=e.target.checked;setProject(p=>({...p,audioTracks:p.audioTracks.map(t=>t.id===track.id?{...t,loop}:t)}));}}/> Lecture en boucle</label></>}
            <button type="button" disabled={busy||!project.scenes.length} onClick={()=>{setProject(p=>({...p,scenes:p.scenes.map(scene=>({...scene,musicTrackId:p.defaultMusicTrackId,audioEnabled:p.defaultMusicTrackId?false:scene.audioEnabled}))}));setMessage('Choix musical appliqué à tous les panoramas.');}}>Appliquer ce choix à tous les panoramas</button>
          </>}
          {key==='ready'&&<><p>La base du projet est prête. Tu pourras maintenant relier les panoramas, placer les photos et compléter les liens.</p>
            <dl className="nv-setup-review"><div><dt>Établissement</dt><dd>{project.name}</dd></div><div><dt>Panoramas</dt><dd>{project.scenes.length}</dd></div><div><dt>Barre du bas</dt><dd>{project.barStyle.width?project.barStyle.width+' px':'Largeur automatique'} · {project.barStyle.height??82} px de haut</dd></div><div><dt>Langues</dt><dd>{(project.languages??['fr']).map(code=>STUDIO_LANGUAGES.find(lang=>lang.code===code)?.name).join(', ')}</dd></div><div><dt>Musique par défaut</dt><dd>{track?.name??'Sans musique'}</dd></div></dl>
            <button type="button" aria-expanded={saveSkin} onClick={()=>setSaveSkin(value=>!value)}>Enregistrer cette préparation comme skin</button>
            {saveSkin&&<SkinChoices project={project} setProject={setProject}/>}
            <p className="nv-setup-note">Clique ensuite sur « Enregistrer » dans la barre du haut pour sauvegarder le projet dans ton compte Cloud. Les skins se sauvegardent séparément dans leur bibliothèque.</p>
          </>}
          <p role="status" className="nv-setup-message">{message}</p>
        </div>
        <footer><button type="button" disabled={busy} onClick={onClose}>Plus tard</button><div><button type="button" disabled={busy||step===0} onClick={()=>move(step-1)}>Précédent</button>{step<steps.length-1?<button type="button" disabled={busy} className="nv-setup-next" onClick={()=>move(step+1)}>Suivant →</button>:<button type="button" disabled={busy} className="nv-setup-next" onClick={onFinish}>Commencer la création</button>}</div></footer>
      </div>
    </div>
  </PreparationDialog>;
}
