import {useEffect,useRef,useState} from 'react';
import {GripVertical} from 'lucide-react';

export function reorderItems<T>(items:T[],from:string,to:string,id:(item:T)=>string):T[]{
  const source=items.findIndex(item=>id(item)===from),target=items.findIndex(item=>id(item)===to);
  if(source<0||target<0||source===target)return items;
  const result=[...items],item=result.splice(source,1)[0];result.splice(target,0,item);return result;
}
export function useGripSort(scope:string,order:string[],onMove:(from:string,to:string)=>void){
  const latest=useRef({order,onMove});latest.current={order,onMove};
  const dispose=useRef<(()=>void)|null>(null);
  const [drag,setDrag]=useState<string|null>(null);
  useEffect(()=>()=>dispose.current?.(),[]);
  function grip(id:string,label:string){
    return <button type="button" className="nv-sort-grip" aria-label={'Déplacer '+label} aria-pressed={drag===id}
      title="Glisser pour réordonner · Flèches du clavier pour déplacer · Échap pour annuler"
      onClick={e=>{e.preventDefault();e.stopPropagation();}}
      onKeyDown={e=>{
        const delta=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:e.key==='ArrowRight'||e.key==='ArrowDown'?1:0;
        if(!delta)return;e.preventDefault();e.stopPropagation();const target=order[order.indexOf(id)+delta];
        if(target){const container=e.currentTarget.closest('[data-sort-scope]');onMove(id,target);
          requestAnimationFrame(()=>[...(container?.querySelectorAll<HTMLElement>('[data-sort-id]')??[])].find(item=>item.dataset.sortId===id)?.querySelector<HTMLButtonElement>('.nv-sort-grip')?.focus());
        }
      }}
      onPointerDown={event=>{
        if(event.button!==0||dispose.current)return;
        const handle=event.currentTarget,row=handle.closest<HTMLElement>('[data-sort-id]'),container=handle.closest<HTMLElement>('[data-sort-scope]');
        if(!row||!container||container.dataset.sortScope!==scope)return;
        event.preventDefault();event.stopPropagation();handle.focus();
        const start={x:event.clientX,y:event.clientY},original=[...latest.current.order];
        let liveOrder=[...original],x=start.x,y=start.y,moved=false,ghost:HTMLElement|null=null,raf=0,disposed=false;
        const initial=row.getBoundingClientRect(),offset={x:start.x-initial.left,y:start.y-initial.top};
        const rows=()=>[...container.querySelectorAll<HTMLElement>(':scope>[data-sort-id]')];
        let scroll:HTMLElement|null=container;
        while(scroll&&!(scroll.scrollHeight>scroll.clientHeight&&/(auto|scroll)/.test(getComputedStyle(scroll).overflowY)))scroll=scroll.parentElement;
        const moveRows=(target:string)=>{
          const before=new Map(rows().map(item=>[item.dataset.sortId!,item.getBoundingClientRect().top]));
          liveOrder=reorderItems(liveOrder,id,target,value=>value);latest.current.onMove(id,target);
          requestAnimationFrame(()=>{
            if(disposed||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
            for(const item of rows()){
              item.getAnimations().forEach(animation=>animation.cancel());
              const old=before.get(item.dataset.sortId!),delta=old===undefined?0:old-item.getBoundingClientRect().top;
              if(Math.abs(delta)>1)item.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:170,easing:'ease-out'});
            }
          });
        };
        const update=()=>{
          if(!moved)return;
          if(ghost)ghost.style.transform=`translate3d(${x-offset.x}px,${y-offset.y}px,0)`;
          const bounds=container.getBoundingClientRect();if(x<bounds.left-35||x>bounds.right+35)return;
          const current=liveOrder.indexOf(id);let candidate=current;
          // Layout coordinates ignore the temporary FLIP animation transforms.
          for(const item of rows()){
            const index=liveOrder.indexOf(item.dataset.sortId!);if(index<0||index===current)continue;
            const middle=bounds.top+item.offsetTop-container.scrollTop+item.offsetHeight/2;
            if(index>current&&y>=middle)candidate=Math.max(candidate,index);
            if(index<current&&y<=middle)candidate=Math.min(candidate,index);
          }
          if(candidate!==current)moveRows(liveOrder[candidate]);
        };
        const pointerMove=(e:PointerEvent)=>{
          if(e.pointerId!==event.pointerId)return;e.preventDefault();e.stopPropagation();x=e.clientX;y=e.clientY;
          if(!moved&&Math.hypot(x-start.x,y-start.y)<5)return;
          if(!moved){
            moved=true;ghost=row.cloneNode(true) as HTMLElement;ghost.className='nv-sortable-item nv-sort-ghost';ghost.removeAttribute('data-sort-id');ghost.setAttribute('aria-hidden','true');ghost.setAttribute('inert','');
            ghost.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
            Object.assign(ghost.style,{position:'fixed',left:'0',top:'0',width:initial.width+'px',height:initial.height+'px',pointerEvents:'none',zIndex:'1000',margin:'0'});
            document.body.append(ghost);document.body.classList.add('nv-is-sorting');setDrag(id);
          }
          update();
        };
        const tick=()=>{
          if(disposed)return;
          if(moved&&scroll){const rect=scroll.getBoundingClientRect();const edge=45;
            if(x>=rect.left&&x<=rect.right){const speed=y<rect.top+edge?-Math.min(14,(rect.top+edge-y)*.3):y>rect.bottom-edge?Math.min(14,(y-rect.bottom+edge)*.3):0;
              if(speed){scroll.scrollTop+=speed;update();}}
          }
          raf=requestAnimationFrame(tick);
        };
        const cleanup=()=>{
          disposed=true;cancelAnimationFrame(raf);ghost?.remove();document.body.classList.remove('nv-is-sorting');
          window.removeEventListener('pointermove',pointerMove,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('keydown',key,true);window.removeEventListener('blur',cancel);dispose.current=null;
        };
        const finish=(rollback=false)=>{
          if(disposed)return;cleanup();
          if(rollback){for(let index=0;index<original.length;index++){const value=original[index];if(liveOrder[index]!==value){latest.current.onMove(value,liveOrder[index]);liveOrder=reorderItems(liveOrder,value,liveOrder[index],v=>v);}}}
          setDrag(null);
          requestAnimationFrame(()=>rows().find(item=>item.dataset.sortId===id)?.querySelector<HTMLButtonElement>('.nv-sort-grip')?.focus());
        };
        const up=(e:PointerEvent)=>{if(e.pointerId===event.pointerId){e.preventDefault();e.stopPropagation();finish();}};
        const cancel=()=>finish(true);
        const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(true);}};
        dispose.current=cleanup;
        window.addEventListener('pointermove',pointerMove,{capture:true,passive:false});window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',cancel,true);window.addEventListener('keydown',key,true);window.addEventListener('blur',cancel);raf=requestAnimationFrame(tick);
      }}>
      <GripVertical size={14} aria-hidden="true"/>
    </button>;
  }
  return {grip,itemProps:(id:string)=>({'data-sort-id':id,className:'nv-sortable-item'+(drag===id?' is-dragging':'')})};
}
