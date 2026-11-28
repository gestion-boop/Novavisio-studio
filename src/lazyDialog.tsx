import {lazy,Suspense,type ComponentType} from 'react';

/**
 * Charge un composant nommé à la demande (au premier affichage) : les gros dialogues rarement ouverts
 * n'alourdissent plus le chargement de l'éditeur. Le composant garde exactement ses props d'origine.
 * Si un ancien onglet ne retrouve plus le fichier après un déploiement, `vite:preloadError` propose déjà l'actualisation.
 */
export function lazyNamed<M extends Record<string,unknown>,K extends keyof M>(load:()=>Promise<M>,name:K):M[K]{
  const Loaded=lazy(()=>load().then(module=>({default:module[name] as ComponentType<Record<string,unknown>>})));
  const Wrapper=(props:Record<string,unknown>)=><Suspense fallback={null}><Loaded {...props}/></Suspense>;
  return Wrapper as unknown as M[K];
}
