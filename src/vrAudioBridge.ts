/**
 * Pont vers l'unique lecteur de musique de la visite classique.
 * WebXR appelle play() depuis l'événement réel de la manette : ne pas
 * attendre un effet React, qui peut perdre l'autorisation audio du casque.
 */
export type VrMusicResult='playing'|'stopped'|'no-source'|'paused'|'blocked'|'unavailable';
type VrMusicController={setPlaying:(on:boolean)=>Promise<VrMusicResult>};
let active:VrMusicController|null=null;
export function registerVrMusicController(controller:VrMusicController):()=>void{
  active=controller;
  return ()=>{if(active===controller)active=null;};
}
export function setVrMusicPlaying(on:boolean):Promise<VrMusicResult>{
  try{return active?.setPlaying(on)??Promise.resolve('unavailable');}
  catch{return Promise.resolve('blocked');}
}
