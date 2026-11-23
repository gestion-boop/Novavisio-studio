-- Médias du projet (vidéos intégrées) : 250 Mo par fichier (avant : 50 Mo).
-- Déjà appliqué sur le projet de production ; le plafond global du projet Supabase (Storage > Settings) doit aussi l'autoriser.
update storage.buckets set file_size_limit = 262144000 where id = 'nvstudio-media';
