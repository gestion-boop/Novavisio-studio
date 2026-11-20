import {supabase} from './cloud';

/**
 * Contrôle de l'installation Supabase : pour chaque migration, une requête SANS effet (identifiant nul, lecture seule)
 * indique si la fonction ou la table existe. Une erreur « fonction introuvable » = migration à installer.
 */
const ZERO='00000000-0000-0000-0000-000000000000';
export type MigrationState='ok'|'missing'|'unknown';
export type MigrationItem={file:string;title:string;why:string;state:MigrationState;detail?:string};

type Probe={file:string;title:string;why:string;run:()=>PromiseLike<{error:{code?:string;message:string}|null}>};
const db=()=>supabase();
const probes:Probe[]=[
  {file:'20261110030000_nvstudio_collaboration.sql',title:'Collaboration (membres, copie de travail)',why:'Partager une visite et travailler à plusieurs.',
    run:()=>db().rpc('nvstudio_can_access',{p_project:ZERO})},
  {file:'20261110040000_nvstudio_publication.sql',title:'Publication permanente',why:'Lien permanent pour NovaTour.',
    run:()=>db().from('nvstudio_publications').select('project_id').limit(1)},
  {file:'20261112155310_nvstudio_write_control_spaces.sql',title:'La main (qui enregistre)',why:'Contrôle de qui peut enregistrer à plusieurs.',
    run:()=>db().rpc('nvstudio_write_state',{p_project:ZERO})},
  {file:'20261113120000_nvstudio_notes.sql',title:'Notes d’équipe',why:'Notes privées ou partagées sur les panoramas.',
    run:()=>db().from('nvstudio_notes').select('id').limit(1)},
  {file:'20261113130000_nvstudio_admin_roles.sql',title:'Rôles administrateur / collaborateur',why:'Administrateurs globaux et choix de la personne qui enregistre.',
    run:()=>db().rpc('nvstudio_set_member_role',{p_project:ZERO,p_email:'x@x.xx',p_role:'collaborator'})},
  {file:'20261119120000_nvstudio_publish_by_write_holder.sql',title:'Publication par le titulaire de la main',why:'Le titulaire de la main peut publier, pas seulement le propriétaire.',
    run:()=>db().rpc('nvstudio_can_publish',{p_project:ZERO})},
  {file:'20261119140000_nvstudio_delete_project.sql',title:'Suppression de projets',why:'Bouton ✕ de « Mes projets Cloud » et suppression des clients.',
    run:()=>db().rpc('nvstudio_delete_project',{p_project:ZERO})}
];
const MISSING=/Could not find the function|schema cache|does not exist|PGRST20[25]/i;

export async function checkMigrations():Promise<MigrationItem[]>{
  return Promise.all(probes.map(async p=>{
    try{
      const {error}=await p.run();
      if(!error)return {file:p.file,title:p.title,why:p.why,state:'ok' as const};
      if(error.code==='PGRST202'||error.code==='PGRST205'||error.code==='42P01'||MISSING.test(error.message))
        return {file:p.file,title:p.title,why:p.why,state:'missing' as const,detail:error.message};
      // Erreur « métier » (unknown_project, not_owner…) : la fonction existe et a répondu.
      return {file:p.file,title:p.title,why:p.why,state:'ok' as const};
    }catch(e){return {file:p.file,title:p.title,why:p.why,state:'unknown' as const,detail:e instanceof Error?e.message:String(e)};}
  }));
}

/** Texte SQL de la migration (chargé à la demande : n'alourdit pas l'éditeur). */
export async function migrationSql(file:string):Promise<string>{
  const loaders:Record<string,()=>Promise<{default:string}>>={
    '20261110030000_nvstudio_collaboration.sql':()=>import('../supabase/migrations/20261110030000_nvstudio_collaboration.sql?raw'),
    '20261110040000_nvstudio_publication.sql':()=>import('../supabase/migrations/20261110040000_nvstudio_publication.sql?raw'),
    '20261112155310_nvstudio_write_control_spaces.sql':()=>import('../supabase/migrations/20261112155310_nvstudio_write_control_spaces.sql?raw'),
    '20261113120000_nvstudio_notes.sql':()=>import('../supabase/migrations/20261113120000_nvstudio_notes.sql?raw'),
    '20261113130000_nvstudio_admin_roles.sql':()=>import('../supabase/migrations/20261113130000_nvstudio_admin_roles.sql?raw'),
    '20261119120000_nvstudio_publish_by_write_holder.sql':()=>import('../supabase/migrations/20261119120000_nvstudio_publish_by_write_holder.sql?raw'),
    '20261119140000_nvstudio_delete_project.sql':()=>import('../supabase/migrations/20261119140000_nvstudio_delete_project.sql?raw')
  };
  const load=loaders[file];
  if(!load)throw new Error('Migration inconnue');
  return (await load()).default;
}
