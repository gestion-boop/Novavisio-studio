# NovaStudio — règles de travail permanentes

Ces règles s'appliquent à toutes les sessions et à toutes les visites virtuelles créées avec le logiciel.

## Interface de visite (toutes les visites)
- Le panneau « Prochaine cible » est en haut à gauche de la vue 360°, sous la barre (`.nv-guide-banner.is-forward` dans `src/style.css`). Il ne doit jamais revenir au centre. Il vaut pour chaque projet, sans qu'il faille le redemander.

- Mini-plan fixe : pendant la navigation (PC, tablette, téléphone), en haut à droite (sous le bouton plein écran), fond gris anthracite transparent à 30 %. Le logo carte à droite masque ou affiche le plan. Au survol (souris), le plan grandit depuis le coin haut droit ; le coin bas droit du carré l'ouvre en plein écran ; le choix d'un numéro change de panorama et le plan revient à sa taille normale. La pièce courante a son halo qui scintille. Composant `PlanMiniMap` (`src/FloorPlan.tsx`), styles dans `src/floorPlan.css`.

## Fenêtres et panneaux (toutes les visites, éditeur compris)
- La croix de fermeture est TOUJOURS en haut, au milieu de la fenêtre, jamais en haut à droite. Elle vaut pour chaque fenêtre ou panneau qui s'ouvre (visiteur, éditeur, casque VR).
- La croix et le bouton Paramètres prennent automatiquement les couleurs des boutons de la barre du bas (fond, contour, pictogramme). Règles centralisées dans `src/windowAnim.css` (visiteur et éditeur) et `closeIconTexture` dans `src/vr.ts` (casque).
- Panneau « Réglages » : le bouton « Réglages » de la barre du bas de l'éditeur ouvre le panneau du panorama à droite ; pas de bouton Réglages en haut à droite hors plein écran.

## Skin Immosphera
- Référence : `docs/immosphera-skin.md`. Lire ce fichier avant tout réglage Immosphera et y noter chaque nouvelle décision validée. Ne pas refaire les réglages déjà validés (surtout le mode casque).

## Casque VR (`src/vr.ts`)
- Plans (casque, visite, éditeur) : AUCUNE couleur dans les pièces. Numéros affichés sur chaque panorama placé ; la pièce où l'on se trouve a un petit halo qui scintille autour de son numéro (décision du 22/11, remplace l'ancienne règle « pastilles masquées + pièce colorée »).
- Sphères de destination : contour identique au mode édition (couleur et intensité de la sphère), panorama en 1024 px.
- Une arrivée sur un panorama ferme l'interface jaune.
- Sélection à la télécommande : cadre VERT (couleur par défaut) autour de ce que vise le rayon ou le joystick, avant d'appuyer sur la gâchette (panoramas, galeries photo, icônes, plans). Les numéros du plan visés s'avancent en relief. Constante `SELECT_COLOR` dans `src/vr.ts`.

## Git et déploiement
- Pousser chaque changement sur `main` et sur la branche de travail `claude/gallant-davinci-3j0crn`.
- Après chaque push sur `main`, déployer la production (projet Vercel `prj_DoDglHb9ubtymhaxvSMNr8pHOTSa`) et vérifier l'état du déploiement.
- Avant de pousser : `npx tsc --noEmit -p .` et `npx vitest run` (tous les tests doivent passer).
