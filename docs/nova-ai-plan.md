# NovaStudio AI — plan technique (module 14)

Statut : document de travail, branche `claude/gallant-davinci-3j0crn`. `main` n'est pas modifiée tant que la branche n'est pas validée.

## 1. Audit des fonctionnalités réutilisables
- Charte : `src/brandKit.ts`, `src/BrandKitDialog.tsx` (9 styles, contraste WCAG).
- Icônes : `src/brandIcons.ts`, `src/brandIconSet.ts` (36 icônes Lucide, 3 états, PNG/SVG/ZIP).
- Intro native : `src/introDesign.ts`, `src/nativeIntro.tsx`; intro statique : `scripts/gen-intro.mjs`.
- Points d'information : `src/interestPoints.ts`, `src/InterestDialog.tsx`.
- Localisation : `src/localisation.ts`. Synthèse : `src/projectSummary.ts`.
- IA : `supabase/functions/nova-ai-icon`, `supabase/functions/nova-ai-translate` (verify_jwt, limites quotidiennes via `nvstudio_ai_usage`).

## 2. Architecture cible
- Le navigateur ne voit jamais de clé. Tout appel IA passe par une fonction Supabase.
- Données client : une ligne par projet (`StudioProject`), déjà isolée par les droits (`nvstudio_can_access`).
- Ressources générées (icônes, logos) : stockage Supabase Storage, chemin par projet.
- Génération longue : file d'attente de tâches avec statut et reprise (table à créer).

## 3. Structures de données à ajouter
- `nvstudio_ai_jobs` : id, project_id, kind (analyse, icones, traduction, intro), status, input, output, error, created_at. RLS par projet.
- `nvstudio_ai_sources` : URL analysée, date, contenu extrait, champs validés par l'utilisateur.
- Versions : réutiliser `nvstudio_revisions`.

## 4. Services IA et coûts
Coûts non vérifiés : à relever sur les grilles tarifaires OpenAI avant tout chiffrage. Modèles configurés : `gpt-image-1` (icônes), `gpt-4o-mini` (traduction). Analyse de site : extraction côté serveur, pas de modèle image.

## 5. Icônes haute définition
Icônes standard : vecteur déterministe (pas d'IA). Icônes personnalisées : image IA puis recadrage circulaire côté serveur, jusqu'à 1024 × 1024, états générés par composition (même dessin, teinte et ombre différentes).

## 6. Analyse des sites internet
Lecture de la page d'accueil et des pages contact/prestations. Extraction : couleurs CSS dominantes, polices déclarées, logo (balises et favicon), coordonnées, réseaux, liens de réservation. Chaque élément est proposé avec sa source ; rien n'est validé sans l'utilisateur. Absence d'information = champ vide, jamais de valeur inventée.

## 7. Points d'information
Catégories et gabarits existants. Positionnement : assisté par l'utilisateur (clic, puis confirmation). Une suggestion sans contenu vérifié n'est pas publiable.

## 8. Parcours utilisateur (résumé)
Nom + site + logo → analyse → charte et boutons proposés → modification → validation → import des panoramas → structure proposée → validation → publication.

## 9. Risques de régression
- Icônes et traductions non testées de bout en bout (le sandbox ne joint pas Supabase).
- Changement de la structure `StudioProject` : validation à étendre sans casser les projets existants.
- Analyse de site : dépendance à des pages externes ; échecs à gérer sans bloquer la création.

## 10. Étapes, tests et critères
1. Stabilisation (fait sur la branche : fusion avec `main`, 67 tests, tsc). Critère : tests verts, publication de la branche.
2. Création assistée (modules 1 et 13) : formulaire, analyse de site, validation. Critère : aucune donnée non sourcée affichée comme certaine ; tests unitaires sur l'extraction.
3. Menus et synthèse (modules 7 et 10). Critère : chaque bouton activable individuellement.
4. Analyse des panoramas (module 9) en mode proposition seule. Critère : aucune flèche créée sans confirmation.
5. Plans multiples et bibliothèque client (modules 6 et 11). Critère : isolation vérifiée entre deux clients.
6. VR et publication (phase 6). Critère : test sur un casque ou un navigateur VR.
