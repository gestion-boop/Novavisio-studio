
(function(){
  var D=window.PANNEAUX||{collections:[],panels:[]};
  var body=document.body,COL=body.getAttribute('data-col')||'',BASE=body.getAttribute('data-base')||'./';
  var NAMES={fr:'Français',en:'English',es:'Español',de:'Deutsch',nl:'Nederlands'};
  var FLAGS={
    fr:'<svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice"><rect width="20" height="60" fill="#0055A4"/><rect x="20" width="20" height="60" fill="#fff"/><rect x="40" width="20" height="60" fill="#EF4135"/></svg>',
    en:'<svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice"><rect width="60" height="60" fill="#012169"/><path d="M0 0L60 60M60 0L0 60" stroke="#fff" stroke-width="10"/><path d="M0 0L60 60M60 0L0 60" stroke="#C8102E" stroke-width="4"/><path d="M30 0V60M0 30H60" stroke="#fff" stroke-width="16"/><path d="M30 0V60M0 30H60" stroke="#C8102E" stroke-width="9"/></svg>',
    es:'<svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice"><rect width="60" height="60" fill="#AA151B"/><rect y="15" width="60" height="30" fill="#F1BF00"/></svg>',
    de:'<svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice"><rect width="60" height="20" fill="#000"/><rect y="20" width="60" height="20" fill="#DD0000"/><rect y="40" width="60" height="20" fill="#FFCE00"/></svg>',
    nl:'<svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice"><rect width="60" height="20" fill="#AE1C28"/><rect y="20" width="60" height="20" fill="#fff"/><rect y="40" width="60" height="20" fill="#21468B"/></svg>'
  };
  var UI={
    fr:{site:'Camping Figurotta',all:'Tous les panneaux',home:'Accueil des panneaux',prev:'Précédent',next:'Suivant',orig:'Panneau d’origine',zoom:'Touchez la photo pour l’agrandir',title:'Panneaux du camping',lead:'Touchez un panneau pour le lire dans votre langue.',cols:'Choisissez une rubrique',n:'panneaux',close:'Fermer',es_note:'En espagnol : seule la liste des articles est traduite ; le texte complet est affiché à l’accueil.'},
    en:{site:'Camping Figurotta',all:'All signs',home:'Signs home',prev:'Previous',next:'Next',orig:'Original sign',zoom:'Tap the photo to enlarge it',title:'Campsite signs',lead:'Tap a sign to read it in your language.',cols:'Choose a section',n:'signs',close:'Close',es_note:'In Spanish only the list of articles is translated; the full text is displayed at reception.'},
    es:{site:'Camping Figurotta',all:'Todos los paneles',home:'Inicio de paneles',prev:'Anterior',next:'Siguiente',orig:'Panel original',zoom:'Toque la foto para ampliarla',title:'Paneles del camping',lead:'Toque un panel para leerlo en su idioma.',cols:'Elija una sección',n:'paneles',close:'Cerrar',es_note:'En español solo se traduce la lista de artículos; el texto completo está expuesto en recepción.'},
    de:{site:'Camping Figurotta',all:'Alle Schilder',home:'Schilder-Übersicht',prev:'Zurück',next:'Weiter',orig:'Originalschild',zoom:'Foto antippen zum Vergrößern',title:'Schilder des Campingplatzes',lead:'Tippen Sie ein Schild an, um es in Ihrer Sprache zu lesen.',cols:'Bereich wählen',n:'Schilder',close:'Schließen',es_note:'Auf Spanisch ist nur die Artikelliste übersetzt; der vollständige Text hängt an der Rezeption aus.'},
    nl:{site:'Camping Figurotta',all:'Alle borden',home:'Overzicht borden',prev:'Vorige',next:'Volgende',orig:'Origineel bord',zoom:'Tik op de foto om te vergroten',title:'Borden van de camping',lead:'Tik op een bord om het in uw taal te lezen.',cols:'Kies een rubriek',n:'borden',close:'Sluiten',es_note:'In het Spaans is alleen de lijst met artikelen vertaald; de volledige tekst hangt bij de receptie.'}
  };
  var lang=(function(){
    var q=(location.search.match(/[?&]lang=([a-z]{2})/)||[])[1],s;try{s=localStorage.getItem('nv-panneaux-lang');}catch(e){}
    var nav=((navigator.language||'fr').slice(0,2)).toLowerCase();
    return [q,s,nav,'fr'].filter(function(l){return l&&UI[l];})[0];
  })();
  if(/[?&]embed=1/.test(location.search))body.classList.add('embed');
  function T(k){return UI[lang][k];}
  function tr(o){return !o?'':(typeof o==='string'?o:(o[lang]||o.fr||''));}
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function byId(id){return D.panels.filter(function(p){return p.id===id;})[0];}
  var root=document.getElementById('app'),langsEl=document.getElementById('langs'),crumbEl=document.getElementById('crumb');
  var lb=document.getElementById('lb'),lbImg=lb.querySelector('img');
  function blocks(p){
    return p.blocks.map(function(b){
      if(b.k==='p')return '<p>'+esc(tr(b.t))+'</p>';
      if(b.k==='h')return '<h2>'+esc(tr(b.t))+'</h2>';
      if(b.k==='list'){var tag=b.num?'ol':'ul';return '<'+tag+'>'+b.items.map(function(i){return '<li>'+esc(tr(i))+'</li>';}).join('')+'</'+tag+'>';}
      if(b.k==='note')return '<div class="note '+(b.tone||'')+'">'+esc(tr(b.t))+'</div>';
      if(b.k==='legend')return '<div class="legend">'+b.items.map(function(i){return '<div><span>'+i[0]+'</span><span>'+esc(tr(i[1]))+'</span></div>';}).join('')+'</div>';
      if(b.k==='rows')return '<div class="rows">'+(b.title?'<h3>'+esc(tr(b.title))+'</h3>':'')+'<table>'+b.rows.map(function(r){return '<tr><td>'+esc(tr(r[0]))+'</td><td>'+esc(tr(r[1]))+'</td></tr>';}).join('')+'</table></div>';
      return '';
    }).join('');
  }
  function imgsFor(p){
    if(p.special==='reglement'){
      var l=(lang==='es')?'fr':lang;
      return {list:[p.imgs.filter(function(x){return x.indexOf('-'+l+'.')>-1;})[0]||p.imgs[0]],note:lang==='es'?T('es_note'):''};
    }
    return {list:p.imgs,note:''};
  }
  function panelHtml(p,sib){
    var im=imgsFor(p);
    var h='<article class="panel tone-'+p.tone+'"><header class="phead"><span class="ico" aria-hidden="true">'+p.icon+'</span><h1>'+esc(tr(p.title))+'</h1>'+(p.sub?'<p class="sub">'+esc(tr(p.sub))+'</p>':'')+'</header>';
    h+='<div class="pbody">'+blocks(p)+'</div>';
    h+='<section class="orig"><h2>'+esc(T('orig'))+'</h2><div class="imgs">'+im.list.map(function(s){return '<img'+(p.special?' class="tall"':'')+' src="'+BASE+s+'" alt="'+esc(tr(p.title))+'" loading="lazy" data-zoom="1">';}).join('')+'</div><p class="hint">'+esc(im.note||T('zoom'))+'</p></section></article>';
    h+='<nav class="nav"><a class="btn" href="#'+(sib.prev||'')+'" '+(sib.prev?'':'disabled')+'>‹ '+esc(T('prev'))+'</a><a class="btn" href="#">▦ '+esc(T('all'))+'</a><a class="btn" href="#'+(sib.next||'')+'" '+(sib.next?'':'disabled')+'>'+esc(T('next'))+' ›</a></nav>';
    return h;
  }
  function tiles(list){
    return '<div class="grid">'+list.map(function(p){return '<a class="tile" href="#'+p.id+'"><div class="ph" style="background-image:url('+BASE+p.thumb+')"></div><div class="tx"><span class="ico" aria-hidden="true">'+p.icon+'</span><b>'+esc(tr(p.title))+'</b></div></a>';}).join('')+'</div>';
  }
  function colList(){
    return '<div class="cols">'+D.collections.map(function(c){var cover=byId(c.cover);var n=D.panels.filter(function(p){return p.col===c.id;}).length;
      return '<a class="tile coltile" href="'+BASE+c.id+'/index.html'+(location.search||'')+'"><div class="ph" style="background-image:url('+BASE+(cover?cover.thumb:'')+')"></div><div class="tx"><b>'+c.icon+' '+esc(tr(c.title))+'</b><small>'+esc(tr(c.desc))+'</small><small>'+n+' '+esc(T('n'))+'</small></div></a>';}).join('')+'</div>';
  }
  function render(){
    var id=(location.hash||'').slice(1),col=D.collections.filter(function(c){return c.id===COL;})[0];
    var list=D.panels.filter(function(p){return !COL||p.col===COL;});
    document.documentElement.lang=lang;
    var siteEl=document.getElementById('site');if(siteEl)siteEl.textContent=T('site');
    if(!COL&&!id){
      crumbEl.innerHTML='';
      root.innerHTML='<h1 class="page">'+esc(T('title'))+'</h1><p class="lead">'+esc(T('lead'))+' '+esc(T('cols'))+'.</p>'+colList();
      return;
    }
    var p=id?byId(id):null;
    if(p&&COL&&p.col!==COL)p=null;
    if(p){
      var i=list.indexOf(p);
      var base=(col?'<a href="#">'+esc(tr(col.title))+'</a>':'<a href="#">'+esc(T('home'))+'</a>');
      crumbEl.innerHTML=base+' › '+esc(tr(p.title));
      root.innerHTML=panelHtml(p,{prev:i>0?list[i-1].id:'',next:i<list.length-1?list[i+1].id:''});
      window.scrollTo(0,0);
    }else{
      crumbEl.innerHTML=(COL?'<a href="'+BASE+'index.html">'+esc(T('home'))+'</a> › '+esc(tr(col.title)):'');
      root.innerHTML='<h1 class="page">'+esc(col?tr(col.title):T('title'))+'</h1><p class="lead">'+esc(col?tr(col.desc):T('lead'))+'</p>'+tiles(list);
    }
  }
  function setLang(l){
    lang=l;try{localStorage.setItem('nv-panneaux-lang',l);}catch(e){}
    [].forEach.call(langsEl.children,function(b){b.setAttribute('aria-pressed',b.dataset.lang===l?'true':'false');});
    render();
  }
  Object.keys(NAMES).forEach(function(l){
    var b=document.createElement('button');b.type='button';b.dataset.lang=l;b.innerHTML=FLAGS[l];b.title=NAMES[l];b.setAttribute('aria-label',NAMES[l]);
    b.addEventListener('click',function(){setLang(l);});langsEl.appendChild(b);
  });
  document.addEventListener('click',function(e){
    var t=e.target;if(t&&t.getAttribute&&t.getAttribute('data-zoom')){lbImg.src=t.src;lb.classList.add('on');}
    if(t===lb||t.id==='lbx'){lb.classList.remove('on');}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')lb.classList.remove('on');
    var id=(location.hash||'').slice(1);if(!id)return;var list=D.panels.filter(function(p){return !COL||p.col===COL;});var i=list.indexOf(byId(id));
    if(e.key==='ArrowRight'&&i>-1&&list[i+1])location.hash=list[i+1].id;if(e.key==='ArrowLeft'&&i>0)location.hash=list[i-1].id;});
  window.addEventListener('hashchange',render);
  setLang(lang);
})();
