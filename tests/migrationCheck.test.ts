import {describe,expect,it,vi} from 'vitest';

const answers:Record<string,{error:{code?:string;message:string}|null}|'throw'>={};
const respond=(name:string)=>{const a=answers[name];if(a==='throw')throw new Error('réseau');return Promise.resolve(a??{error:null});};
vi.mock('../src/cloud',()=>({supabase:()=>({
  rpc:(name:string)=>respond(name),
  from:(table:string)=>({select:()=>({limit:()=>respond(table)})})
})}));

import {checkMigrations} from '../src/migrationCheck';

describe('contrôle de l’installation Supabase',()=>{
  it('fonction introuvable = migration à installer',async()=>{
    answers.nvstudio_delete_project={error:{code:'PGRST202',message:'Could not find the function public.nvstudio_delete_project(p_project) in the schema cache'}};
    const r=await checkMigrations();
    expect(r.find(m=>m.file.includes('delete_project'))?.state).toBe('missing');
  });
  it('erreur métier (not_owner, unknown_project) = fonction installée',async()=>{
    answers.nvstudio_delete_project={error:{message:'not_owner'}};
    answers.nvstudio_write_state={error:{message:'unknown_project'}};
    const r=await checkMigrations();
    expect(r.find(m=>m.file.includes('delete_project'))?.state).toBe('ok');
    expect(r.find(m=>m.file.includes('write_control'))?.state).toBe('ok');
  });
  it('table introuvable = à installer',async()=>{
    answers.nvstudio_notes={error:{code:'PGRST205',message:'Could not find the table public.nvstudio_notes in the schema cache'}};
    const r=await checkMigrations();
    expect(r.find(m=>m.file.includes('notes'))?.state).toBe('missing');
  });
  it('réseau coupé = vérification impossible, jamais « installée » par erreur',async()=>{
    answers.nvstudio_can_publish='throw';
    const r=await checkMigrations();
    expect(r.find(m=>m.file.includes('publish_by_write_holder'))?.state).toBe('unknown');
  });
});
