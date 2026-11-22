# NovaStudio — règles de travail permanentes

Ces règles s'appliquent à toutes les sessions et à toutes les visites virtuelles créées avec le logiciel.

## Interface de visite (toutes les visites)
- Le panneau « Prochaine cible » est en haut à gauche de la vue 360°, sous la barre (`.nv-guide-banner.is-forward` dans `src/style.css`). Il ne doit jamais revenir au centre. Il vaut pour chaque projet, sans qu'il faille le redemander.

## Skin Immosphera
- Référence : `docs/immosphera-skin.md`. Lire ce fichier avant tout réglage Immosphera et y noter chaque nouvelle décision validée. Ne pas refaire les réglages déjà validés (surtout le mode casque).

## Casque VR (`src/vr.ts`)
- Plan jaune : pas de pastilles numérotées ; seule la pièce change de couleur au survol, sans vibration continue.
- Sphères de destination : contour identique au mode édition (couleur et intensité de la sphère), panorama en 1024 px.
- Une arrivée sur un panorama ferme l'interface jaune.

## Git et déploiement
- Pousser chaque changement sur `main` et sur la branche de travail `claude/gallant-davinci-3j0crn`.
- Après chaque push sur `main`, déployer la production (projet Vercel `prj_DoDglHb9ubtymhaxvSMNr8pHOTSa`) et vérifier l'état du déploiement.
- Avant de pousser : `npx tsc --noEmit -p .` et `npx vitest run` (102 tests attendus).
