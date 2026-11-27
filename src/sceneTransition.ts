import type {Viewer} from '@photo-sphere-viewer/core';

type Destination = {texture:string;position:{yaw:number;pitch:number};zoom:number};

/** Covers the whole panorama, including HTML markers and WebGL layers. */
export function createSceneTransition(viewer:Viewer,host:HTMLElement){
  const veil=document.createElement('div');
  veil.setAttribute('aria-hidden','true');
  Object.assign(veil.style,{
    position:'absolute',inset:'0',zIndex:'18',pointerEvents:'none',background:'#071925',opacity:'0',
  });
  let generation=0, pending=false, loading=false;
  let animation:Animation|undefined;

  const moveVeil=(opacity:number,duration:number)=>{
    const from=veil.isConnected?Number(getComputedStyle(veil).opacity):0;
    veil.style.opacity=String(opacity);
    animation?.cancel();
    animation=undefined;
    if(opacity&&!veil.isConnected)host.appendChild(veil);
    if(!duration||from===opacity)return;
    animation=veil.animate([{opacity:from},{opacity}],{duration,easing:'ease-in-out'});
    return animation.finished.catch(()=>{});
  };

  return {
    get pending(){return pending;},
    async change(destination:Destination,duration:number,commit:()=>void,onError:()=>void){
      const request=++generation;
      pending=true;
      const half=Math.round(duration/2);
      if(half){
        // A subsequent request can supersede an in-flight load immediately: the veil is already opaque.
        const covering=moveVeil(1,loading?0:half);
        if(covering)await covering;
      }else{
        moveVeil(0,0);
        veil.remove();
      }
      if(request!==generation)return;
      loading=true;
      try{
        // A fade with speed 0 still runs the viewer's minimum-length zoom animation.
        let success:boolean;
        try{
          success=await viewer.setPanorama(destination.texture,{
            showLoader:false,transition:false,position:destination.position,zoom:destination.zoom,
          });
        }catch{
          if(request===generation){
            viewer.hideError();
            onError();
          }
          return;
        }
        // The texture and arrival camera are set. Update markers before the next paint.
        if(success&&request===generation)commit();
      }finally{
        if(request===generation){
          pending=false;
          loading=false;
          const revealing=moveVeil(0,half);
          if(revealing)await revealing;
          if(request===generation)veil.remove();
        }
      }
    },
    destroy(){
      generation++;
      animation?.cancel();
      veil.remove();
    },
  };
}
