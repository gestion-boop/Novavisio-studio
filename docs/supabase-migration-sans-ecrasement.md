# Supabase — migration sans écraser les projets existants

**Statut : plan de migration, non exécuté.** Ne pas activer la synchronisation tant que la connexion Supabase n'est pas confirmée et que les données locales sont sauvegardées.

## Interdictions

- Ne modifier, vider, renommer ou supprimer **aucune table**, aucun bucket, aucun projet ou enregistrement Supabase déjà présent (NovaCRM / NovaTour / NovaVisio inclus).
- Ne pas utiliser `upsert`, `update`, `delete`, `truncate` ou un script de réinitialisation lors de l'import initial.
- Ne jamais interpréter un navigateur vide comme un ordre de suppression du cloud.
- Ne jamais remplacer le projet IndexedDB local `novavisio-studio-v1/projects/current` pendant l'initialisation cloud.
- Ne pas injecter de clé `service_role` dans le navigateur ou le dépôt GitHub.

## Etape 1 : inventaire et sauvegardes

1. Lire uniquement la liste des projets existants dans le projet Supabase ciblé, les tables, schémas, buckets et politiques RLS.
2. Sur **le navigateur qui contient la visite**, exporter manuellement le fichier `.nvstudio.json` via **Sauvegarder le projet**. Conserver ce fichier en dehors du navigateur.
3. Exporter la liste et les métadonnées des projets Supabase existants, puis effectuer un export/snapshot avant tout changement.
4. Identifier si un projet Supabase distinct doit être créé pour le Studio. Préférence : projet Supabase **dédié**, distinct des données NovaCRM.

## Etape 2 : stockage distinct et sécurisé

- Utiliser un nom isolé (`nvstudio_projects`, `nvstudio_revisions`, `nvstudio_media`), sans toucher aux tables métier existantes.
- Faire vérifier les politiques RLS et l'authentification avant toute écriture.
- Stocker les panoramas, images, vidéos, PNG et sons dans un bucket privé propre à Studio, idéalement dans un préfixe `<user_id>/<project_uuid>/`. Les documents PostgreSQL ne doivent pas contenir toutes les images sous forme base64.
- Chaque visite a un `project_uuid` stable, indépendant du nom de la visite. L'import crée un nouvel UUID sauf sélection explicite et vérifiée.
- Stocker un `snapshot` immuable de la révision locale d'origine. La migration effectue seulement des **INSERT** avec un nouvel ID cloud.
- Prévoir un système de versions et une vérification de révision avant toute sauvegarde cloud afin d'empêcher qu'un navigateur ancien écrase une version récente.

## Etape 3 : migration opt-in

1. Afficher côte à côte les projets locaux et ceux de Supabase, avec leurs noms, identifiants et dates.
2. Proposer **Importer comme nouvelle visite** par défaut ; aucun rapprochement automatique par le seul nom.
3. Attendre une confirmation explicite pour chaque import; ne jamais fusionner automatiquement.
4. Après import, relire la visite, comparer nombre de panoramas, hotspots, icônes et médias, et vérifier le chargement.
5. Conserver la sauvegarde IndexedDB et le fichier `.nvstudio.json` tant que la migration n'est pas validée.

## Etat actuel vérifié (2026-11-10)

- `src/storage.ts` utilise IndexedDB, base `novavisio-studio-v1`, objectStore `projects`, clé `current`.
- La sauvegarde actuelle n'est pas un enregistrement distant.
- Aucune configuration Supabase n'a été trouvée dans les variables Vercel du projet Studio au contrôle.
- Connexion Supabase à ChatGPT toujours à effectuer avant inspection ou intervention sur les données réelles.

**Rien dans ce fichier n'exécute de migration ni ne crée de base de données.**
