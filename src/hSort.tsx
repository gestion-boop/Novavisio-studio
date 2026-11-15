import {useEffect,useRef,useState} from 'react';
import {GripVertical} from 'lucide-react';
import {reorderItems} from './gripSort';

/**
 * Réorganisation par glisser-déposer d'éléments disposés en ligne (onglets des espaces).
 * L'ordre change en direct pendant le glissement ; Échap annule ; les flèches ← → déplacent l'élément au clavier.
 */
export function useHorizontalSort(order:string[],onMove:(from:string,to:string)=>void){
  const latest=useRef({order,onMove});latest.current={order,onMove};
  const dispose=useRef<(()=>void)|null>(null);
  const [drag,setDrag]=useState<string|null>(null);
  useEffect(()=>()=>dispose.current?.(),[]);
  const grip=(id:string,label:string)=><button type="button" className="nv-hsort-grip" aria-label={'Déplacer '+label} aria-pressed={drag===id}
    title="Glisser pour changer l’ordre · flèches ← → au clavier"
    onClick={e=>{e.preventDefault();e.stopPropagation();}}
    onKeyDown={e=>{
      const delta=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0;
      if(!delta)return;e.preventDefault();e.stopPropagation();
      const target=latest.current.order[latest.current.order.indexOf(id)+delta];
      if(target){const container=e.currentTarget.closest('[data-hsort]');latest.current.onMove(id,target);
        requestAnimationFrame(()=>container?.querySelector<HTMLElement>('[data-hsort-id="'+CSS.escape(id)+'"] .nv-hsort-grip')?.focus());}
    }}
    onPointerDown={event=>{
      if(event.button!==0||dispose.current)return;
      const handle=event.currentTarget;
      const row=handle.closest<HTMLElement>('[data-hsort-id]');
      const container=handle.closest<HTMLElement>('[data-hsort]');
      if(!row||!container)return;
      event.preventDefault();event.stopPropagation();
      const original=[...latest.current.order];
      let live=[...original],x=event.clientX,y=event.clientY,moved=false,ghost:HTMLElement|null=null,raf=0,disposed=false;
      const start={x:event.clientX,y:event.clientY};
      const initial=row.getBoundingClientRect(),offset={x:start.x-initial.left,y:start.y-initial.top};
      const items=()=>[...container.querySelectorAll<HTMLElement>('[data-hsort-id]')];
      const moveItems=(target:string)=>{
        const before=new Map(items().map(item=>[item.dataset.hsortId!,item.getBoundingClientRect().left]));
        live=reorderItems(live,id,target,v=>v);
        latest.current.onMove(id,target);
        requestAnimationFrame(()=>{
          if(disposed||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
          for(const item of items()){
            item.getAnimations().forEach(animation=>animation.cancel());
            const old=before.get(item.dataset.hsortId!),delta=old===undefined?0:old-item.getBoundingClientRect().left;
            if(Math.abs(delta)>1)item.animate([{transform:`translateX(${delta}px)`},{transform:'translateX(0)'}],{duration:190,easing:'cubic-bezier(0.2,0,0,1)'});
          }
        });
      };
      const update=()=>{
        if(!moved)return;
        if(ghost)ghost.style.transform=`translate3d(${x-offset.x}px,${initial.top}px,0) scale(1.04)`;
        const bounds=container.getBoundingClientRect();
        const current=live.indexOf(id);let candidate=current;
        for(const item of items()){
          const other=item.dataset.hsortId!,index=live.indexOf(other);
          if(index<0||index===current)continue;
          const middle=bounds.left+item.offsetLeft-container.scrollLeft+item.offsetWidth/2;
          if(index>current&&x>=middle)candidate=Math.max(candidate,index);
          if(index<current&&x<=middle)candidate=Math.min(candidate,index);
        }
        if(candidate!==current)moveItems(live[candidate]);
      };
      const tick=()=>{
        if(disposed)return;
        if(moved){
          const rect=container.getBoundingClientRect(),edge=50;
          const speed=x<rect.left+edge?-12:x>rect.right-edge?12:0;
          if(speed){container.scrollLeft+=speed;update();}
        }
        raf=requestAnimationFrame(tick);
      };
      const cleanup=()=>{
        disposed=true;cancelAnimationFrame(raf);ghost?.remove();document.body.classList.remove('nv-is-sorting');
        window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);
        window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('keydown',key,true);dispose.current=null;
      };
      const finish=(rollback:boolean)=>{
        if(disposed)return;cleanup();
        if(rollback){ // retour à l'ordre d'origine
          for(let index=0;index<original.length;index++){
            if(live[index]!==original[index]){latest.current.onMove(original[index],live[index]);live=reorderItems(live,original[index],live[index],v=>v);}
          }
        }
        setDrag(null);
      };
      const move=(e:PointerEvent)=>{
        e.preventDefault();x=e.clientX;y=e.clientY;
        if(!moved&&Math.hypot(x-start.x,y-start.y)<5)return;
        if(!moved){
          moved=true;
          ghost=row.cloneNode(true) as HTMLElement;
          ghost.classList.add('nv-sort-ghost');
          ghost.removeAttribute('data-hsort-id');
          ghost.setAttribute('aria-hidden','true');
          ghost.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
          Object.assign(ghost.style,{
            position:'fixed',left:'0',top:'0',width:`${initial.width}px`,height:`${initial.height}px`,
            pointerEvents:'none',zIndex:'10000',margin:'0',
            boxShadow:'0 14px 32px rgba(0,0,0,0.65), 0 0 0 2px #4bebde',borderRadius:'12px'
          });
          document.body.append(ghost);
          setDrag(id);
          document.body.classList.add('nv-is-sorting');
        }
        update();
      };
      const up=(e:PointerEvent)=>{e.preventDefault();finish(false);};
      const cancel=()=>finish(true);
      const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(true);}};
      dispose.current=cleanup;
      window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',up,true);
      window.addEventListener('pointercancel',cancel,true);window.addEventListener('keydown',key,true);
      raf=requestAnimationFrame(tick);
    }}><GripVertical size={14} aria-hidden="true"/></button>;
  return {grip,drag};
}
