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
      const container=event.currentTarget.closest<HTMLElement>('[data-hsort]');
      if(!container)return;
      event.preventDefault();event.stopPropagation();
      const original=[...latest.current.order];
      let live=[...original],x=event.clientX,moved=false,raf=0,disposed=false;
      const start=event.clientX;
      const items=()=>[...container.querySelectorAll<HTMLElement>('[data-hsort-id]')];
      const update=()=>{
        const current=live.indexOf(id);let candidate=current;
        for(const item of items()){
          const other=item.dataset.hsortId!,index=live.indexOf(other);
          if(index<0||index===current)continue;
          const rect=item.getBoundingClientRect(),middle=rect.left+rect.width/2;
          if(index>current&&x>=middle)candidate=Math.max(candidate,index);
          if(index<current&&x<=middle)candidate=Math.min(candidate,index);
        }
        if(candidate!==current){const target=live[candidate];live=reorderItems(live,id,target,v=>v);latest.current.onMove(id,target);}
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
        disposed=true;cancelAnimationFrame(raf);document.body.classList.remove('nv-is-sorting');
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
        e.preventDefault();x=e.clientX;
        if(!moved&&Math.abs(x-start)<5)return;
        if(!moved){moved=true;setDrag(id);document.body.classList.add('nv-is-sorting');}
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
