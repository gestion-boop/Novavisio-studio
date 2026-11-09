# NovaVisio Studio — prototype V0.2

Éditeur indépendant de visites virtuelles 360° interactives, conçu pour NovaVisio. Interface en français, thème bleu nuit et turquoise.

## Installation

Node.js 20 ou version compatible requis.

```bash
npm install
npm run dev
```

Ouvrir l'adresse affichée par Vite (généralement http://localhost:5173).

Pour construire une version statique :

```bash
npm run build
npm run preview
```

## Fonctionnalités incluses dans le prototype

- Import de photos panoramiques au format JPG, PNG ou WebP équirectangulaire.
- Visualisation immersive 360° (Photo Sphere Viewer).
- Gestion des scènes avec miniatures, renommage et suppression.
- Ajout de hotspots de navigation entre scènes.
- Ajout de hotspots d'information avec titre et texte.
- **Import de tes propres icônes** PNG, JPG, WebP ou GIF animé dans « Mes icônes » (jusqu'à 1,5 Mo par fichier).
- Application de ces icônes aux points interactifs avec réglage de leur taille.
- **Barre inférieure personnalisable** : créer, renommer, déplacer et supprimer ses boutons, choisir leurs icônes et leur taille.
- Actions des boutons : navigation vers une scène, panneau d'information, site web, réservation, lien téléphonique ou email.
- Les icônes et la barre sont intégrées dans l'export du projet éditable.
- Prévisualisation interactive.
- Sauvegarde automatique locale avec IndexedDB.
- Export / réimport d'un projet éditable au format `.nvstudio.json`, comprenant les médias.

## Limites et avertissements

**Prototype expérimental : ne pas utiliser comme outil de production sans tests.**

- L'export est un **fichier de projet éditable**. L'export HTML/ZIP autonome n'est pas encore implémenté.
- Le stockage est local au navigateur et limité à un projet ouvert à la fois.
- Les grandes images occupent beaucoup d'espace ; la sauvegarde peut échouer si le quota du navigateur est dépassé.
- Les panoramas doivent déjà être assemblés en photos 360° équirectangulaires (rapport 2:1 recommandé).
- Pas encore de synchronisation Supabase, édition multi-utilisateurs, vidéo 360°, plan, moteur IA ou hébergement.
- Conserver une copie du projet exporté : effacer les données du navigateur supprimerait la sauvegarde locale.
- Aucune information client ni clé secrète ne doit être commitée dans ce dépôt.
- Le projet n'a pas encore été validé par une campagne complète de tests dans tous les navigateurs.

## Structure

```text
index.html
package.json
tsconfig.json
vite.config.ts
src/
  main.tsx     # interface et lecteur panoramique
  storage.ts   # modèle de données et IndexedDB
  style.css    # thème et mise en page responsive
```

## Roadmap

1. Stabiliser le prototype avec tests techniques et fonctionnels.
2. Produire un lecteur public distinct de l'éditeur.
3. Exporter une visite HTML/ZIP autonome utilisable sur n'importe quel hébergement statique.
4. Ajouter plusieurs projets, sauvegardes, undo/redo et médias optimisés.
5. Ajouter plans interactifs, hotspots marketing, modèles et assistant IA optionnel.

## Technologies et licences

React, TypeScript, Vite et Photo Sphere Viewer. Respecter les licences des dépendances tierces. Le nom NovaVisio et les ressources de marque appartiennent à leurs titulaires respectifs.
