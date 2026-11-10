# NovaVisio Studio — prototype V0.6

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
- Modèle visuel inspiré de la référence « Au Bureau » : capsule argentée et 5 boutons bordeaux à pictogrammes dorés, sans libellés apparents (accessibles au survol et aux lecteurs d'écran).
- **Plein écran de la visite entière** : le bouton dédié dans l'angle supérieur droit étend la scène et sa barre personnalisée, sans la masquer. Le plein écran passe en mode aperçu pour activer les boutons.
- Les liens HTTP(S) des boutons et hotspots s'ouvrent **dans une iframe intégrée à la visite**, y compris en plein écran. Les actions `tel:` et `mailto:` restent externes.
- Pour les icônes d'information, un champ « Page intégrée (optionnel) » permet de substituer une page web au texte.
- Certains sites bloquent l'affichage en iframe via `X-Frame-Options` ou `Content-Security-Policy` : le panneau propose alors « Ouvrir à part ».
- L'onglet **Barre du bas** inclut un éditeur de couleurs (fond, contours, boutons, pictogrammes), épaisseur des contours, arrondi et restauration du thème d'origine.
- Les commandes grises natives de Photo Sphere Viewer sont masquées ; seule la barre créée dans NovaVisio Studio est affichée en bas.

- Les visites déjà enregistrées conservent leurs boutons. Dans « Barre du bas », utiliser « Appliquer le modèle 5 icônes » pour remplacer l'ancienne barre.
- Actions des boutons : navigation vers une scène, panneau d'information, site web, réservation, lien téléphonique ou email.
- Les icônes et la barre sont intégrées dans l'export du projet éditable.
- **Introduction personnalisée par visite** : URL HTTPS de splash screen, activation optionnelle et bouton pour entrer dans la visite.
- **Cadres photo dans les panoramas** : import d'une image, taille, quatre coins ajustables indépendamment pour suivre la perspective et agrandissement optionnel en fondu au clic.
- **Dossier de publication HTML** exporté en ZIP avec `index.html`, `assets/` (lecteur CSS/JS), `media/` (panoramas, cadres et icônes), `data/visite.json` et `LISEZ-MOI.txt`.
- **Lecteur public indépendant** : fonctionne sans NovaVisio Studio sur un hébergement de fichiers statiques, et ne propose pas « Ouvrir à part » dans les fenêtres iframe.

- Prévisualisation interactive.
- Sauvegarde automatique locale avec IndexedDB.
- Export / réimport d'un projet éditable au format `.nvstudio.json`, comprenant les médias.

## Limites et avertissements

**Prototype expérimental : ne pas utiliser comme outil de production sans tests.**

- Deux exports distincts : **Sauvegarder le projet** (éditable au format `.nvstudio.json`) et **Exporter HTML / ZIP** (visite publique autonome).
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

## Publication de la visite HTML

1. Ouvrir un projet contenant au moins un panorama, vérifier les liens et, si besoin, activer l'introduction.
2. Cliquer sur **Exporter HTML / ZIP**.
3. Décompresser l'archive. À l'intérieur, un dossier `nom-de-visite/` contient `index.html`, `assets/`, `media/`, `data/` et `LISEZ-MOI.txt`.
4. Déposer l'ensemble du contenu de ce dossier dans un hébergement statique (Vercel, FTP, etc.).
5. Ouvrir la page `index.html` via une adresse HTTP(S).

Ne jamais déplacer `index.html` sans les dossiers associés. Pour tester sur ordinateur, lancer un petit serveur HTTP (par exemple `python3 -m http.server 8080`) dans le dossier exporté. Un double-clic direct sur `index.html` n'est pas garanti avec les modules JavaScript modernes.

La page d'introduction externe et les liens iframe nécessitent Internet. Certains sites externes interdisent leur intégration iframe ; aucun lien « Ouvrir à part » n'apparaît dans l'interface de la visite, conformément au design demandé.

Ce prototype ne garantit pas encore les performances sur des dizaines d'images 8K ou plus, et la sauvegarde locale dépend du quota du navigateur.

## Photos, vidéo et son (V0.6)

- Cadres photo : import de JPG/PNG/WebP (et HEIC lorsqu'il est décodable dans le navigateur), puis cadrage directement sur l'image 360° avec quatre poignées turquoise indépendantes.
- **Taille cohérente en plein écran** : les dimensions du cadre sont enregistrées relativement à la hauteur de la zone d'édition, et recalculées à l'affichage. Cette adaptation est aussi appliquée dans le lecteur HTML exporté.
- Icônes personnalisées : trois PNG optionnels pour l'état normal, survol et pression, sans ajouter de fond artificiel au visuel original.
- Écrans vidéo intégrés : MP4/WebM, quatre coins et dimensions réglables, lecture muette automatique (si le navigateur le permet) et ouverture en grand avec son au clic.
- Bande sonore par panorama : MP3/OGG/WAV ou URL HTTPS, lecture et boucle paramétrables, réglage du volume. Les navigateurs peuvent demander un clic pour activer le son.
- Les fichiers audio et vidéo importés sont ajoutés à l'archive HTML sous `media/audio` et `media/videos`.

**Compatibilité :** le dossier de publication conserve `index.html`, `assets/`, `media/` et `data/`, afin de rester compatible avec la plateforme NovaTour renommée NovaVisio. Tester la visite exportée après tout changement des médias.
