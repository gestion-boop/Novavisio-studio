#!/usr/bin/env node
// Outil de nettoyage CSS sûr : retire les règles / déclarations qui n'ont AUCUN effet visible sur un composant,
// en comparant les styles calculés (dizaines de propriétés, états survol/appui, ordinateur et téléphone) avant/après.
// Usage : node scripts/css-prune.mjs <composant> [--write]      (composants : gallery)
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
const postcss=require('postcss');
const {chromium}=require('playwright');
const SRC=new URL('../src/',import.meta.url).pathname;
const comp=process.argv[2]||'gallery';
const WRITE=process.argv.includes('--write');

const FIXTURES={
  gallery:{
    match:/nv-gallery/,
    own:/^(nv-gallery[\w-]*|is-current|has-bg|nv-x)$/,
    variants:(()=>{
      const card=(i,cur)=>`<div class="nv-gallery-cell"><button type="button" class="nv-gallery-card${cur?' is-current':''}"><span class="nv-gallery-thumb"><span class="nv-gallery-ph"></span></span><strong>Panorama ${i}</strong></button><button type="button" class="nv-gallery-360">360°</button></div>`;
      const head=`<header><h2>Espaces</h2><button type="button" class="nv-gallery-close" aria-label="Fermer"><svg width="20" height="20"><path d="M3 3l14 14M17 3L3 17" stroke="currentColor"/></svg></button></header>`;
      const wrap=(cls,style,body)=>`<div class="nv-gallery-overlay"><section class="nv-gallery${cls}" style="${style}">${head}${body}</section></div>`;
      const cells=n=>Array.from({length:n},(_,i)=>card(i+1,i===1)).join('');
      return {
        many:wrap(' has-bg','background-image:linear-gradient(rgba(4,14,20,.58),rgba(4,14,20,.84)),linear-gradient(#456,#789)',`<div class="nv-gallery-grid">${cells(9)}</div>`),
        few:wrap('','',`<div class="nv-gallery-grid">${cells(3)}</div>`),
        empty:wrap('','',`<p class="nv-gallery-empty">Aucun panorama.</p>`),
        look:wrap('','',`<div class="nv-gallery-grid">${cells(4)}</div><div class="nv-gallery-look" role="dialog"><header><strong>Pano</strong><button type="button">✕</button></header><div class="nv-gallery-look-view"></div><footer><span>Glisse</span><button type="button">Aller</button></footer></div>`)
      };
    })(),
    probes:['.nv-gallery-overlay','.nv-gallery','.nv-gallery>header','.nv-gallery h2','.nv-gallery-close','.nv-gallery-grid','.nv-gallery-cell','.nv-gallery-card','.nv-gallery-card.is-current','.nv-gallery-cell:nth-child(7) .nv-gallery-card','.nv-gallery-thumb','.nv-gallery-ph','.nv-gallery-card strong','.nv-gallery-360','.nv-gallery-empty','.nv-gallery-look','.nv-gallery-look>header','.nv-gallery-look>header button','.nv-gallery-look-view','.nv-gallery-look>footer','.nv-gallery-look>footer button'],
    hovers:['.nv-gallery-card','.nv-gallery-360','.nv-gallery-close','.nv-gallery-look>footer button'],
    presses:['.nv-gallery-card']
  }
};
const fx=FIXTURES[comp];
if(!fx){console.error('composant inconnu');process.exit(1);}
const PROPS=['position','top','left','right','bottom','z-index','display','flex','flex-direction','flex-wrap','gap','grid-template-columns','align-items','justify-content','align-content','padding','margin','width','height','min-width','max-width','max-height','overflow','aspect-ratio','background-color','background-image','background-size','background-position','border-top-width','border-top-color','border-top-style','border-radius','box-shadow','color','font-size','font-weight','line-height','text-align','letter-spacing','text-shadow','transform','translate','scale','filter','opacity','backdrop-filter','cursor','visibility','pointer-events','white-space','text-overflow','-webkit-line-clamp','animation-name'];

const OBSERVED=new Set([...PROPS,'background','border','border-color','border-width','border-style','border-top']);
// ordre de chargement approximatif de l'éditeur puis de la visite
const all=readdirSync(SRC).filter(f=>f.endsWith('.css'));
const editorOrder=['workflow.css','creation.css','preparation.css','style.css','windowAnim.css','media.css'];
const editor=[...all.filter(f=>!editorOrder.includes(f)&&f!=='visitor.css'),...editorOrder];
const visitor=['visitor.css','windowAnim.css','media.css'];
const contexts={editor,visitor};
const files=[...new Set([...editor,...visitor])];
const roots=Object.fromEntries(files.map(f=>[f,postcss.parse(readFileSync(SRC+f,'utf8'))]));

const candidates=[]; // {file,node}
for(const f of files)roots[f].walkRules(r=>{
  if(r.parent?.type==='atrule'&&/keyframes/.test(r.parent.name))return;
  const sels=r.selectors||[];
  if(!sels.length||!sels.every(s=>fx.match.test(s)))return;
  // Jamais de règle partagée avec d'autres composants (listes :is(), classes d'autres composants).
  const ownOnly=s=>!/:is\(|:where\(/.test(s)&&[...s.matchAll(/\.([\w-]+)/g)].every(m=>fx.own.test(m[1]));
  if(!sels.every(ownOnly))return;
  // Jamais de règle conditionnée par une préférence que la maquette ne simule pas (mouvement réduit, impression, survol…).
  for(let a=r.parent;a&&a.type==='atrule';a=a.parent)if(/prefers-|print|hover|pointer|supports/.test(a.params||''))return;
  candidates.push({file:f,rule:r});
});
const cssOf=ctx=>contexts[ctx].map(f=>roots[f].toString()).join('\n');

let browser,pages={};
async function snapshot(){
  const out={};
  for(const ctx of Object.keys(contexts)){
    const css=cssOf(ctx);
    for(const [vw,vh] of [[1440,900],[390,844]]){
      const key=ctx+vw;
      pages[key]??=await browser.newPage({viewport:{width:vw,height:vh}});
      const p=pages[key];
      for(const [vname,html] of Object.entries(fx.variants)){
        await p.setContent(`<style>${css}\n*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}</style><body style="margin:0;--nv-bar-bg:#c2c5c6;--nv-bar-outline:#987974;--nv-close-bg:#d3a43e;--nv-close-border:#8a6418;--nv-close-ink:#1b1208"><div class="${ctx==='visitor'?'tour-app':'workspace'}" style="position:relative;width:${vw}px;height:${vh}px">${html}</div></body>`);
        const base=await p.evaluate(([probes,props])=>probes.map(s=>{const e=document.querySelector(s);if(!e)return null;const cs=getComputedStyle(e);const o={};props.forEach(k=>{o[k]=cs.getPropertyValue(k)});const r=e.getBoundingClientRect();o.rect=[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];return o;}),[fx.probes,PROPS]);
        out[[key,vname,'repos'].join('|')]=base;
        for(const h of fx.hovers){
          const el=p.locator(h).first();
          if(!(await el.count()))continue;
          await el.hover({force:true,timeout:1500}).catch(()=>{});
          out[[key,vname,'survol',h].join('|')]=await p.evaluate(([s,props])=>{const e=document.querySelector(s);const cs=getComputedStyle(e);const o={};props.forEach(k=>{o[k]=cs.getPropertyValue(k)});return o;},[h,PROPS]);
        }
        for(const h of fx.presses){
          const el=p.locator(h).first();
          if(!(await el.count()))continue;
          await el.hover({force:true,timeout:1500}).catch(()=>{});await p.mouse.down();
          out[[key,vname,'appui',h].join('|')]=await p.evaluate(([s,props])=>{const e=document.querySelector(s);const cs=getComputedStyle(e);const o={};props.forEach(k=>{o[k]=cs.getPropertyValue(k)});return o;},[h,PROPS]);
          await p.mouse.up();
        }
      }
    }
  }
  return JSON.stringify(out);
}
browser=await chromium.launch();
// Une règle n'est candidate que si elle vise au moins un élément réellement présent dans la maquette de test :
// sinon on ne peut pas prouver qu'elle est inutile (elle peut servir ailleurs dans l'application).
{
  const probe=await browser.newPage();
  const strip=sel=>sel.replace(/::?(before|after|hover|active|focus-visible|focus|disabled|checked|-webkit-[\w-]+)/g,'').trim()||'*';
  const present=new Set();
  for(const [name,html] of Object.entries(fx.variants)){
    await probe.setContent('<body>'+html+'</body>');
    const found=await probe.evaluate(sels=>sels.map(s=>{try{return !!document.querySelector(s)}catch{return false}}),candidates.flatMap(c=>c.rule.selectors.map(strip)));
    let i=0;candidates.forEach((c,ci)=>{c.rule.selectors.forEach(()=>{if(found[i++])present.add(ci);});});
  }
  await probe.close();
  const kept=candidates.filter((_,i)=>present.has(i));
  console.log(`  ${kept.length}/${candidates.length} règles visent des éléments de la maquette (les autres sont conservées sans test).`);
  candidates.length=0;candidates.push(...kept);
}
const baseline=await snapshot();
const again=await snapshot();
if(again!==baseline){const a=JSON.parse(baseline),b=JSON.parse(again);for(const k of Object.keys(a)){if(JSON.stringify(a[k])!==JSON.stringify(b[k])){console.log('INSTABLE :',k);const x=a[k],y=b[k];if(Array.isArray(x)){x.forEach((o,i)=>{if(JSON.stringify(o)!==JSON.stringify(y[i]))console.log('   sonde',fx.probes[i],Object.keys(o||{}).filter(p=>o[p]!==y[i]?.[p]).map(p=>p+':'+o[p]+'→'+y[i][p]).join(' | ').slice(0,200))})}else console.log('  ',Object.keys(x).filter(p=>x[p]!==y[p]).map(p=>p+':'+x[p]+'→'+y[p]).join(' | ').slice(0,200));break;}}console.log('La mesure n\'est pas stable : arrêt.');process.exit(2);}
console.log(`composant ${comp} : ${candidates.length} règles candidates, référence mesurée (${baseline.length} octets).`);
let removedRules=0,removedDecls=0;
const restore=(parent,index,node)=>{if(index>=parent.nodes.length)parent.append(node);else parent.insertBefore(parent.nodes[index],node);return node;};
// 1) règles entières sans effet
for(const c of [...candidates].reverse()){
  const parent=c.rule.parent,index=parent.index(c.rule);
  const clone=c.rule.clone();
  c.rule.remove();
  if(await snapshot()===baseline){removedRules++;console.log('  − règle inutile',c.file,(c.rule.selector||'').slice(0,70));}
  else c.rule=restore(parent,index,clone);
}
// 2) déclarations sans effet dans les règles restantes
for(const c of candidates){
  if(!c.rule.parent)continue;
  for(const d of [...c.rule.nodes].reverse()){
    if(d.type!=='decl')continue;
    // Seules les propriétés réellement mesurées peuvent être jugées inutiles (jamais transition, animation, will-change…).
    if(!OBSERVED.has(d.prop))continue;
    const clone=d.clone(),idx=c.rule.index(d);
    d.remove();
    if(await snapshot()===baseline){removedDecls++;console.log('  − déclaration inutile',c.file,c.rule.selector.slice(0,45),'→',d.prop);}
    else restore(c.rule,idx,clone);
  }
}
for(const f of files)roots[f].walk(n=>{if((n.type==='rule'||n.type==='atrule')&&n.nodes&&n.nodes.length===0&&!(n.type==='atrule'&&/^(font-face|keyframes)$/.test(n.name)))n.remove();});
console.log(`\nRèglesinutiles retirées : ${removedRules} · déclarations inutiles retirées : ${removedDecls}`);
const final=await snapshot();
console.log('contrôle final :',final===baseline?'IDENTIQUE à la référence':'DIFFÉRENT (ne pas écrire)');
if(final===baseline&&WRITE){for(const f of files)writeFileSync(SRC+f,roots[f].toString());console.log('fichiers CSS réécrits.');}
await browser.close();
