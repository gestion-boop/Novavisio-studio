import {useEffect,useId,useRef} from 'react';

const BLADES=8;
const TURN=2*Math.PI/BLADES;

export function IntroIris(){
  const root=useRef<SVGSVGElement>(null);
  const hole=useRef<SVGPolygonElement>(null);
  const edge=useRef<SVGPolygonElement>(null);
  const blades=useRef<SVGGElement>(null);
  const id=useId();

  useEffect(()=>{
    const svg=root.current;
    const opening=hole.current;
    const outline=edge.current;
    const lines=blades.current;
    if(!svg||!opening||!outline||!lines||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let frame:number;
    const start=performance.now()+100;
    function draw(now:number){
      if(!svg||!opening||!outline||!lines)return;
      const t=Math.max(0,Math.min(1,(now-start)/1200));
      const progress=t<.5?4*t**3:1-4*(1-t)**3;
      const {width,height}=svg.getBoundingClientRect();
      const cx=width/2,cy=height/2;
      const maxRadius=Math.hypot(cx,cy)/Math.cos(Math.PI/BLADES)+4;
      const radius=maxRadius*progress;
      const rotation=-(1-progress)*Math.PI/3;
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      const points=Array.from(lines.children,(line,i)=>{
        const angle=rotation+i*TURN;
        const x=cx+radius*Math.cos(angle), y=cy+radius*Math.sin(angle);
        line.setAttribute('x1',String(x));
        line.setAttribute('y1',String(y));
        line.setAttribute('x2',String(cx+maxRadius*2*Math.cos(angle+1.8*TURN)));
        line.setAttribute('y2',String(cy+maxRadius*2*Math.sin(angle+1.8*TURN)));
        return `${x},${y}`;
      }).join(' ');
      opening.setAttribute('points',points);
      outline.setAttribute('points',points);
      outline.style.opacity=lines.style.opacity=String(1-progress);
      if(t<1)frame=requestAnimationFrame(draw);
      else svg.style.visibility='hidden';
    }
    draw(performance.now());
    return ()=>cancelAnimationFrame(frame);
  },[]);

  return <svg ref={root} className="nv-ni-iris" aria-hidden="true">
    <defs>
      <linearGradient id={id+'-color'} x2="100%" y2="100%">
        <stop offset="0%" stopColor="#345C95"/>
        <stop offset="55%" stopColor="#2B899D"/>
        <stop offset="100%" stopColor="#125C68"/>
      </linearGradient>
      <mask id={id+'-mask'}>
        <rect width="100%" height="100%" fill="white"/>
        <polygon ref={hole} fill="black"/>
      </mask>
    </defs>
    <rect width="100%" height="100%" fill={'url(#'+id+'-color)'} mask={'url(#'+id+'-mask)'}/>
    <polygon ref={edge} fill="none" stroke="#A8DBE5" strokeWidth="4"/>
    <g ref={blades} stroke="#A8DBE5" strokeWidth="2">
      {Array.from({length:BLADES},(_,i)=><line key={i}/>)}
    </g>
  </svg>;
}
