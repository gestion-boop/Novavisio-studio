# Automatisation des intros client avec la charte graphique

Document de travail — branche `claude/gallant-davinci-3j0crn`.

## 1. Ce qui est automatisé
- **Génération** : `scripts/gen-intro.mjs` produit `public/<slug>-intro/index.html` à partir d'un JSON (slug, nom, logo, couleur d'accent, textes par langue).
- **Langues** : fr, en, es, de, nl. Une langue absente reprend le français. Le choix de langue se fait par `?lang=` ou par la langue du navigateur.
- **Échappement** : les saisies sont échappées, y compris le dictionnaire de langues injecté dans le script (corrigé pendant ce travail).
- **Tests** : `tests/genIntro.test.ts` (6 tests : page complète, couleur invalide, injection HTML, repli de langue, slug invalide, français obligatoire).

## 2. Ce qui reste manuel
- Choisir la charte : les couleurs viennent du PDF de charte du client, pas d'une extraction automatique.
- Fournir le logo : la page pointe vers une URL publique (ici `novavisio-studio.vercel.app/figurotta/logo.png`). Le générateur copie aussi le logo dans le dossier, mais la page utilise l'URL.
- Publier : aucune commande automatique vers Vercel dans le dépôt.

## 3. Charte appliquée à Camping Figurotta
Source : `Charte_graphique.pdf`.
- Bleu `224A95` : titre, signature, ouverture en iris.
- Vert `98C05B` : anneau du logo, filets, animation.
- Or `E1C886` : accent sur la version précédente du texte « Bienvenue » (non retenu sur la v2).

Le modèle a une couleur de texte fixe (`#125C68`) pour la signature : elle a été remplacée par le bleu de la charte dans la page publiée. À généraliser dans le modèle si l'on veut une charte complète automatique.

## 4. Publication Vercel : ce qui a marché et ce qui n'a pas marché
- **Un déploiement en production prend automatiquement l'alias principal** (ex. `intro-figurotta.vercel.app`). Un essai raté remplace donc la page publique immédiatement.
- **Rollback** : `assign_alias` sur le déploiement précédent rétablit l'alias en quelques secondes.
- **Échec observé** : les déploiements créés en reprenant les fichiers d'un projet existant (chemins `src/…`, sortie `.vercel/output`) renvoyaient 404.
- **Solution retenue** : un projet neuf, avec `index.html` à la racine et `projectSettings.outputDirectory = "."`. Il répond en 200.
- Avant toute publication en production, vérifier la réponse du déploiement de test (URL propre, sans alias principal) puis seulement rattacher l'alias.

## 5. Procédure à suivre pour un nouveau client
1. Créer `config.json` (slug, nom, logo, accent, textes fr/en/es/de/nl).
2. `node scripts/gen-intro.mjs config.json`.
3. Remplacer la source du logo par une URL publique, puis vérifier le fichier HTML.
4. Publier sur un projet neuf à la racine (déploiement de test, pas d'alias principal).
5. Vérifier la réponse 200 et le contenu (logo, couleurs, textes).
6. Rattacher l'alias principal seulement si le client le demande.

## 6. Limites connues
- Pas de test dans un vrai navigateur pendant ce travail : seule la réponse HTTP a été vérifiée.
- Le logo du client doit être accessible publiquement au moment de la publication.
- Les anciennes intros (`campingfigurotta-intro`) gardent l'ancien logo tant qu'elles ne sont pas republiées.
