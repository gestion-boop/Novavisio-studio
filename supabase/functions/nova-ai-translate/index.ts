// NovaStudio AI — traduction automatique des textes d'une visite (module 8).
// La clé OPENAI_API_KEY reste dans les secrets Supabase. Les noms propres fournis ne sont jamais traduits.
import {createClient} from 'npm:@supabase/supabase-js@2';

const LANGS = ['en', 'es', 'de', 'nl'] as const;
const DAILY_LIMIT = 60;               // appels de traduction par compte et par jour
const MAX_ITEMS = 200;
const MAX_CHARS = 300;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({error: 'method_not_allowed'}, 405);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    {global: {headers: {authorization: req.headers.get('authorization') ?? ''}}});
  const {data: userData, error: userErr} = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({error: 'not_authenticated'}, 401);

  let body: {projectId?: string; langs?: string[]; items?: Array<{id: string; text: string}>; protected?: string[]};
  try { body = await req.json(); } catch { return json({error: 'invalid_json'}, 400); }
  if (!body.projectId || !/^[0-9a-f-]{36}$/i.test(body.projectId)) return json({error: 'invalid_project'}, 400);
  const langs = (body.langs ?? []).filter((l): l is typeof LANGS[number] => (LANGS as readonly string[]).includes(l));
  if (!langs.length) return json({error: 'no_language'}, 400);
  const items = (body.items ?? []).filter(i => i && typeof i.id === 'string' && typeof i.text === 'string' && i.text.trim() && i.text.length <= MAX_CHARS).slice(0, MAX_ITEMS);
  if (!items.length) return json({translations: {}});
  const protectedNames = (body.protected ?? []).filter(s => typeof s === 'string' && s.trim()).slice(0, 50);

  const {data: canAccess, error: accessErr} = await supabase.rpc('nvstudio_can_access', {p_project: body.projectId});
  if (accessErr || !canAccess) return json({error: 'forbidden'}, 403);

  const today = new Date().toISOString().slice(0, 10);
  const {data: usage} = await supabase.from('nvstudio_ai_usage').select('count')
    .eq('user_id', userData.user.id).eq('day', today).maybeSingle();
  if ((usage?.count ?? 0) >= DAILY_LIMIT) return json({error: 'daily_limit_reached', limit: DAILY_LIMIT}, 429);

  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return json({error: 'ai_not_configured'}, 503);

  const system = 'Tu traduis des textes de visites touristiques (français vers ' + langs.join(', ') + '). ' +
    'Ne jamais ajouter d’information. Garder les noms propres et marques tels quels : ' + (protectedNames.join(', ') || 'aucun') + '. ' +
    'Réponds uniquement avec un objet JSON : {"translations": {"<id>": {"<lang>": "<texte traduit>"}}}, ' +
    'avec toutes les langues demandées pour chaque id.';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {authorization: 'Bearer ' + key, 'content-type': 'application/json'},
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_TEXT_MODEL') ?? 'gpt-4o-mini',
      response_format: {type: 'json_object'},
      messages: [{role: 'system', content: system}, {role: 'user', content: JSON.stringify(items)}]
    })
  });
  if (!res.ok) return json({error: 'translation_failed', status: res.status}, 502);
  const out = await res.json();
  let parsed: {translations?: Record<string, Record<string, string>>} = {};
  try { parsed = JSON.parse(out?.choices?.[0]?.message?.content ?? '{}'); } catch { return json({error: 'translation_unreadable'}, 502); }

  // On ne garde que les ids demandés, les langues demandées, et des textes raisonnables.
  const ids = new Set(items.map(i => i.id));
  const clean: Record<string, Partial<Record<string, string>>> = {};
  for (const [id, byLang] of Object.entries(parsed.translations ?? {})) {
    if (!ids.has(id) || !byLang || typeof byLang !== 'object') continue;
    clean[id] = {};
    for (const l of langs) {
      const t = byLang[l];
      if (typeof t === 'string' && t.trim() && t.length <= MAX_CHARS * 2) clean[id]![l] = t.trim();
    }
  }

  await supabase.from('nvstudio_ai_usage').upsert(
    {user_id: userData.user.id, day: today, count: (usage?.count ?? 0) + 1}, {onConflict: 'user_id,day'});
  return json({translations: clean});
});
