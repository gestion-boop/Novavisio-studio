import {useRef,useState} from 'react';
import {GripVertical} from 'lucide-react';

export function reorderItems<T>(items:T[],from:string,to:string,id:(item:T)=>string):T[]{
  const source=items.findIndex(item=>id(item)===from),target=items.findIndex(item=>id(item)===to);
  if(source<0||target<0||source===target)return items;
  const result=[...items],item=result.splice(source,1)[0];result.splice(target,0,item);return result;
}
export function useGripSort(scope:string,order:string[],onMove:(from:string,to:string)=>void){
  const active=useRef<{id:string;over:string;x:number;y:number;moved:boolean}|null>(null);
  const [drag,setDrag]=useState<{id:string;over:string}|null>(null);
  const reset=()=>{active.current=null;setDrag(null);};
  function grip(id:string,label:string){
    return <button type="button" className="nv-sort-grip" aria-label={'Déplacer '+label}
      title="Glisser pour réordonner · Flèches du clavier pour déplacer"
      onClick={e=>{e.preventDefault();e.stopPropagation();}}
      onKeyDown={e=>{
        const delta=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:e.key==='ArrowRight'||e.key==='ArrowDown'?1:0;
        if(!delta)return;e.preventDefault();e.stopPropagation();const target=order[order.indexOf(id)+delta];
        if(target){const container=e.currentTarget.closest('[data-sort-scope]');onMove(id,target);
          requestAnimationFrame(()=>[...(container?.querySelectorAll<HTMLElement>('[data-sort-id]')??[])].find(item=>item.dataset.sortId===id)?.querySelector<HTMLButtonElement>('.nv-sort-grip')?.focus());
        }
      }}
      onPointerDown={e=>{
        if(e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);
        active.current={id,over:id,x:e.clientX,y:e.clientY,moved:false};setDrag({id,over:id});
      }}
      onPointerMove={e=>{
        const current=active.current;if(!current)return;e.preventDefault();e.stopPropagation();
        if(Math.hypot(e.clientX-current.x,e.clientY-current.y)<5&&!current.moved)return;
        current.moved=true;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-sort-id]');
        if(target?.closest<HTMLElement>('[data-sort-scope]')?.dataset.sortScope!==scope)return;
        const over=target?.dataset.sortId;if(!over||!order.includes(over))return;
        current.over=over;setDrag({id:current.id,over});
      }}
      onPointerUp={e=>{
        const current=active.current;if(!current)return;e.preventDefault();e.stopPropagation();
        if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
        if(current.moved&&current.id!==current.over)onMove(current.id,current.over);reset();
      }} onPointerCancel={reset} onLostPointerCapture={reset}>
      <GripVertical size={14} aria-hidden="true"/>
    </button>;
  }
  return {grip,itemProps:(id:string)=>({'data-sort-id':id,className:'nv-sortable-item'+(drag?.id===id?' is-dragging':'')+(drag?.over===id&&drag.id!==id?' is-drop-target':'')})};
}
