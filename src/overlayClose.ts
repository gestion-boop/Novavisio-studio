import type {MouseEvent} from 'react';

/**
 * Fermeture d'une fenêtre par clic sur le fond : seulement si le clic COMMENCE et FINIT sur le fond.
 * Sans cela, sélectionner du texte en glissant vers l'extérieur de la fenêtre (de droite à gauche par exemple)
 * produit un « clic » sur le fond et ferme tout.
 */
let downOnOverlay = false; // au niveau du module : survit aux rendus React entre le mousedown et le click

export function overlayClose(close: () => void) {
  return {
    onMouseDown: (e: MouseEvent) => { downOnOverlay = e.target === e.currentTarget; },
    onClick: (e: MouseEvent) => {
      const ok = downOnOverlay && e.target === e.currentTarget;
      downOnOverlay = false;
      if (ok) close();
    },
  };
}
