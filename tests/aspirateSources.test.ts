import {expect,it} from 'vitest';
import {crawlSite} from '../api/_aspirate.js';

const html = `
  <meta property="og:title" content="Atelier du Canal">
  <meta property="og:image" content="https://cdn.example.com/atelier">
  <meta property="og:video" content="https://cdn.example.com/intro.mp4">
  <img class="logo" width="80" src="https://cdn.example.com/logo.png">
  <img src="/photos/equipe.jpg">
  <video><source src="/films/atelier.webm" type="video/webm"></video>
  <a href="/contact">Contact</a>
`;

it('lit les URLs absolues d’un fichier HTML fourni sans adresse de page',async()=>{
  const result=await crawlSite('',async()=>({html,finalUrl:''}),{followLinks:false});
  expect(result).toMatchObject({
    fiche:{nom:'Atelier du Canal'},
    photos:['https://cdn.example.com/atelier'],
    logos:['https://cdn.example.com/logo.png'],
    videos:['https://cdn.example.com/intro.mp4'],
  });
});

it('utilise l’adresse d’origine pour résoudre les médias relatifs sans explorer le site',async()=>{
  const visited:string[]=[];
  const url='https://atelier.example.com/accueil';
  const result=await crawlSite(url,async(target:string)=>{
    visited.push(target);
    return {html,finalUrl:target};
  },{followLinks:false});
  expect(visited).toEqual([url]);
  expect(result.photos).toContain('https://atelier.example.com/photos/equipe.jpg');
  expect(result.videos).toContain('https://atelier.example.com/films/atelier.webm');
});
