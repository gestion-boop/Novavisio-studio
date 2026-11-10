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

## Implémentation (branche de travail, non activée tant que la migration n'est pas exécutée)

- `supabase/migrations/20261110000000_nvstudio_init.sql` : crée seulement `nvstudio_projects`, `nvstudio_revisions` et le bucket privé `nvstudio-media`. RLS active, politiques SELECT/INSERT uniquement (aucune UPDATE/DELETE), `unique(project_id, revision)`. Sans `if not exists` : échoue si un nom existe déjà.
- `src/cloud.ts` + `src/CloudPanel.tsx` : bouton **Cloud**. Connexion par lien magique ; chaque envoi INSERT une nouvelle révision ; refus si le cloud a une révision plus récente ; médias envoyés en objets adressés par hash (jamais réécrits). Ouvrir une visite cloud exige une confirmation et télécharge d'abord une sauvegarde `.nvstudio.json`.
- Variables (clé publique uniquement) : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_*`).
- Côté Supabase (Auth) : définir Site URL / Redirect URL sur l'adresse du Studio, et envisager de désactiver les inscriptions publiques.

## Liens publics à durée limitée (3, 5, 7 ou 10 jours)

- Migration à exécuter **après** `20261110000000_nvstudio_init.sql` : `supabase/migrations/20261110010000_nvstudio_share_links.sql` (crée `nvstudio_shares`, 4 fonctions `nvstudio_*` et une politique de lecture des médias liée à l'existence d'un lien actif).
- Le lien est `…/share.html?t=<jeton de 64 caractères>`. L'expiration est calculée par la base (`now() + n jours`) ; passé ce délai, la fonction renvoie « expiré » et les médias ne sont plus téléchargeables. Un lien peut aussi être désactivé avant l'échéance (il n'est jamais supprimé).
- Un lien pointe sur une **révision précise** : les modifications faites après sa création ne changent pas ce qu'il montre.

## Sauvegarde instantanée dans Supabase

- Migration à exécuter : `supabase/migrations/20261110020000_nvstudio_autosave.sql` (ajoute 3 colonnes à `nvstudio_projects` et la fonction `nvstudio_save_working`).
- Chaque modification est envoyée ~0,7 s plus tard dans une **copie de travail** de la visite, mise à jour sur place (une ligne par visite, pas une ligne par frappe). Les médias sont envoyés une seule fois (objets adressés par hash) ; l'instantané ne contient que des références.
- La copie locale (IndexedDB) reste active : sans réseau tout est conservé et repart au retour de la connexion (nouvel essai automatique).
- Protection multi-appareils : la copie de travail a un numéro de version. Une écriture basée sur une version périmée est refusée (`conflict`) ; l'application s'arrête et demande : ouvrir la version du cloud ou garder la sienne.
- Un projet vide ou illisible n'est jamais envoyé ; « Nouveau » ou l'ouverture d'un fichier coupent le lien avec la visite cloud actuelle (elle reste intacte).

## Travail à plusieurs (« lien privé »)

- Migration à exécuter en dernier : `supabase/migrations/20261110030000_nvstudio_collaboration.sql` (après `…000000_init` et `…020000_autosave`). Elle ajoute les tables `nvstudio_members` et `nvstudio_working_history`, des fonctions d'accès, remplace `nvstudio_save_working` (version avec `p_takeover`) et ouvre la lecture des médias aux personnes invitées.
- Le propriétaire invite une adresse e-mail + mot de passe (bouton **Lien privé**). Le compte est créé par `auth.signUp` depuis un client temporaire (la session du propriétaire n'est pas touchée ; le mot de passe n'est jamais stocké par le Studio). Si Supabase a activé « Confirm email », la personne doit d'abord confirmer son adresse. Si les inscriptions sont désactivées (« Allow new users to sign up »), les réactiver le temps de créer l'accès.
- Une personne invitée peut ouvrir, modifier et sauvegarder la copie de travail et ses médias ; elle ne peut ni inviter, ni créer de lien public, ni toucher aux révisions.
- Règle de sauvegarde : **la dernière personne qui agit a la main**. Un enregistrement qui arrive après celui d'une autre personne la remplace ; la version remplacée est archivée dans `nvstudio_working_history` (jamais supprimée). Une fenêtre sans modification en cours se met à jour toute seule (toutes les ~4 s) avec la version de l'autre personne.
- Retirer un accès supprime seulement la ligne `nvstudio_members` : le compte de la personne n'est pas supprimé.
