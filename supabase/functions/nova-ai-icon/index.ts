// NovaStudio AI — génération d'une icône personnalisée à partir d'une description (phase 2).
// La clé OPENAI_API_KEY est lue dans les secrets Supabase : elle n'atteint jamais le navigateur.
import {createClient} from 'npm:@supabase/supabase-js@2';

const DAILY_LIMIT = 20;               // générations par compte et par jour
const MAX_PROMPT = 200;               // caractères
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({error: 'method_not_allowed'}, 405);
  const auth = req.headers.get('authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {global: {headers: {authorization: auth}}});

  const {data: userData, error: userErr} = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({error: 'not_authenticated'}, 401);

  let body: {projectId?: string; description?: string};
  try { body = await req.json(); } catch { return json({error: 'invalid_json'}, 400); }
  const description = (body.description ?? '').replace(/\s+/g, ' ').trim();
  if (!body.projectId || !/^[0-9a-f-]{36}$/i.test(body.projectId)) return json({error: 'invalid_project'}, 400);
  if (description.length < 3 || description.length > MAX_PROMPT) return json({error: 'invalid_description'}, 400);

  // Droits : seul un participant du projet peut générer pour ce projet.
  const {data: canAccess, error: accessErr} = await supabase.rpc('nvstudio_can_access', {p_project: body.projectId});
  if (accessErr || !canAccess) return json({error: 'forbidden'}, 403);

  // Limite par compte et par jour (table nvstudio_ai_usage, créée par la migration).
  const today = new Date().toISOString().slice(0, 10);
  const {data: usage} = await supabase.from('nvstudio_ai_usage').select('count')
    .eq('user_id', userData.user.id).eq('day', today).maybeSingle();
  if ((usage?.count ?? 0) >= DAILY_LIMIT) return json({error: 'daily_limit_reached', limit: DAILY_LIMIT}, 429);

  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return json({error: 'ai_not_configured'}, 503);

  const prompt = `Une seule icône plate, centrée, dessinée au trait, sans texte, sans fond, ` +
    `représentant : ${description}. Style pictogramme simple, symbole unique, lisible en petite taille.`;
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {authorization: 'Bearer ' + key, 'content-type': 'application/json'},
    body: JSON.stringify({model: Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1', prompt,
      size: '1024x1024', background: 'transparent', output_format: 'png', n: 1})
  });
  if (!res.ok) return json({error: 'generation_failed', status: res.status}, 502);
  const out = await res.json();
  const b64 = out?.data?.[0]?.b64_json;
  if (!b64) return json({error: 'generation_empty'}, 502);

  await supabase.from('nvstudio_ai_usage').upsert(
    {user_id: userData.user.id, day: today, count: (usage?.count ?? 0) + 1},
    {onConflict: 'user_id,day'});

  return json({png: 'data:image/png;base64,' + b64, remaining: DAILY_LIMIT - (usage?.count ?? 0) - 1});
});
