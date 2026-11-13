/* Kriter DataLab - pruebas adversariales de autorizacion sobre HTTP real.
   Ejecuta los casos obligatorios contra el proyecto Supabase usando identidades
   independientes. Node 18 o superior (fetch nativo).

   Variables de entorno requeridas:
     SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
     KRITER_QA_USERS = JSON {"administrador":{"email":...,"password":...}, ...}
   Salida: tabla PASS/FAIL y codigo 1 si algun caso falla.
*/
const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const USERS = JSON.parse(process.env.KRITER_QA_USERS || '{}');

if (!URL_BASE || !KEY || !Object.keys(USERS).length) {
  console.error('BLOCKED: faltan SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY o KRITER_QA_USERS.');
  process.exit(2);
}

const tokens = {};
async function entrar(rol) {
  const u = USERS[rol];
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.password })
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`No se pudo autenticar ${rol}: ${j.error_description || j.msg || r.status}`);
  return j.access_token;
}

async function llamar(token, ruta, opciones = {}) {
  const r = await fetch(URL_BASE + ruta, {
    method: opciones.method || 'GET',
    headers: { apikey: KEY, Authorization: 'Bearer ' + (token || KEY), 'Content-Type': 'application/json' },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined
  });
  let d = null; try { d = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, body: d };
}

const esDenegado = (r) => (r.status === 403 || r.status === 401) && r.body && r.body.code === '42501';
const filas = (r) => (Array.isArray(r.body) ? r.body.length : null);

const CASOS = [
  ['RLS-01', 'Visitante sin sesion solo ve el area publica',
    async () => { const r = await llamar(null, '/rest/v1/rpc/kriter_dashboard', { method: 'POST', body: {} });
      return r.status === 200 && r.body.regions.length === 1 && r.body.regions[0].name === 'Norte'; }],
  ['RLS-02', 'Visitante que pide un area protegida es denegado',
    async () => esDenegado(await llamar(null, '/rest/v1/rpc/kriter_dashboard', { method: 'POST', body: { p_region: 'Sureste' } }))],
  ['RLS-03', 'Administrador consulta todas las areas autorizadas',
    async () => { const r = await llamar(tokens.administrador, '/rest/v1/rpc/kriter_dashboard', { method: 'POST', body: {} });
      return r.status === 200 && r.body.regions.length === 6 && Number(r.body.kpi.records) === 20160; }],
  ['RLS-04', 'Gerente regional ve exclusivamente sus areas asignadas',
    async () => { const r = await llamar(tokens.regional, '/rest/v1/rpc/kriter_dashboard', { method: 'POST', body: {} });
      return r.status === 200 && r.body.regions.every(x => ['Metropolitana', 'Norte'].includes(x.name)); }],
  ['RLS-05', 'Analista no puede consultar un area ajena',
    async () => esDenegado(await llamar(tokens.analista, '/rest/v1/rpc/kriter_dashboard', { method: 'POST', body: { p_region: 'Metropolitana' } }))],
  ['RLS-06', 'Manipular el identificador de area no devuelve filas ajenas',
    async () => filas(await llamar(tokens.analista, '/rest/v1/sales?select=id&region_id=eq.5&limit=5')) === 0],
  ['RLS-07', 'Lectura masiva directa solo entrega areas autorizadas',
    async () => { const r = await llamar(tokens.regional, '/rest/v1/sales?select=region_id&limit=30000');
      const ids = [...new Set((r.body || []).map(x => x.region_id))];
      const reg = await llamar(tokens.regional, '/rest/v1/regions?select=id');
      const permitidas = (reg.body || []).map(x => x.id);
      return ids.every(i => permitidas.includes(i)); }],
  ['RLS-08', 'Usuario sin autorizacion no accede a datos protegidos',
    async () => { const r = await llamar(tokens.sinacceso, '/rest/v1/rpc/kriter_dashboard', { method: 'POST', body: {} });
      return r.status === 200 && r.body.regions.length === 1 && r.body.regions[0].name === 'Norte'; }],
  ['RLS-09', 'Un usuario no puede asignarse un rol administrativo',
    async () => { const r = await llamar(tokens.analista, '/rest/v1/user_roles', { method: 'POST', body: { user_id: '00000000-0000-0000-0000-000000000000', role_id: 1 } });
      return r.status === 403 || r.status === 401; }],
  ['RLS-10', 'Un usuario no puede autoasignarse un area',
    async () => { const r = await llamar(tokens.analista, '/rest/v1/user_regions', { method: 'POST', body: { user_id: '00000000-0000-0000-0000-000000000000', region_id: 5 } });
      return r.status === 403 || r.status === 401; }],
  ['RLS-11', 'La exportacion CSV respeta el alcance del perfil',
    async () => { const r = await llamar(tokens.analista, '/rest/v1/rpc/kriter_export_products', { method: 'POST', body: {} });
      const areas = [...new Set((r.body || []).map(x => x.area))];
      return r.status === 200 && areas.every(a => ['Norte', 'Sureste'].includes(a)); }],
  ['RLS-12', 'La exportacion de un area ajena se deniega',
    async () => esDenegado(await llamar(tokens.analista, '/rest/v1/rpc/kriter_export_products', { method: 'POST', body: { p_region: 'Metropolitana' } }))],
  ['RLS-13', 'El perfil auditor no puede ejecutar escenarios',
    async () => esDenegado(await llamar(tokens.auditor, '/rest/v1/rpc/kriter_scenario', { method: 'POST', body: {} }))],
  ['RLS-14', 'La bitacora solo es legible por perfiles de auditoria',
    async () => { const a = await llamar(tokens.analista, '/rest/v1/security_audit?select=id&limit=5');
      const b = await llamar(tokens.auditor, '/rest/v1/security_audit?select=id&limit=5');
      return filas(a) === 0 && b.status === 200; }],
  ['RLS-15', 'Una sesion invalida o caducada no puede consultar',
    async () => { const r = await llamar(tokens.analista.slice(0, -6) + 'aaaaaa', '/rest/v1/rpc/kriter_dashboard', { method: 'POST', body: {} });
      return r.status === 401; }],
  ['RLS-16', 'Los perfiles ajenos no son legibles',
    async () => filas(await llamar(tokens.analista, '/rest/v1/profiles?select=id')) === 1],
  ['RLS-17', 'No existe ninguna ruta de escritura sobre los datos comerciales',
    async () => { const r = await llamar(tokens.administrador, '/rest/v1/sales?id=eq.1', { method: 'DELETE' });
      return r.status === 403 || r.status === 401; }],
  ['RLS-18', 'El canal temporal de carga ya no existe',
    async () => { const r = await llamar(null, '/rest/v1/rpc/kriter_stage_rows', { method: 'POST', body: { p_token: 'x', p_rows: [] } });
      return r.status === 404; }],
  ['RLS-19', 'Las agregaciones coinciden con la exportacion del mismo perfil',
    async () => { const d = await llamar(tokens.regional, '/rest/v1/rpc/kriter_dashboard', { method: 'POST', body: {} });
      const e = await llamar(tokens.regional, '/rest/v1/rpc/kriter_export_products', { method: 'POST', body: {} });
      const suma = (e.body || []).reduce((t, x) => t + Number(x.valor), 0);
      return Math.abs(suma - Number(d.body.kpi.sales)) < 0.01; }],
  ['RLS-21', 'La exportacion completa no se trunca por el limite de filas de la API',
    async () => { const d = await llamar(tokens.administrador, '/rest/v1/rpc/kriter_dashboard', { method: 'POST', body: {} });
      const e = await llamar(tokens.administrador, '/rest/v1/rpc/kriter_export_products', { method: 'POST', body: {} });
      const filas = Array.isArray(e.body) ? e.body.length : -1;
      const suma = (e.body || []).reduce((t, x) => t + Number(x.valor), 0);
      return filas > 1000 && Math.abs(suma - Number(d.body.kpi.sales)) < 0.01; }],
  ['RLS-20', 'Un periodo invertido se rechaza con un error explicito',
    async () => { const r = await llamar(tokens.administrador, '/rest/v1/rpc/kriter_dashboard', { method: 'POST', body: { p_from: '2025-01-01', p_to: '2024-01-01' } });
      return r.status === 400 && r.body.code === '22007'; }]
];

const resultados = [];
for (const rol of Object.keys(USERS)) tokens[rol] = await entrar(rol);
for (const [id, descripcion, prueba] of CASOS) {
  let estado = 'FAIL', detalle = '';
  try { estado = (await prueba()) ? 'PASS' : 'FAIL'; }
  catch (e) { estado = 'FAIL'; detalle = e.message; }
  resultados.push({ id, descripcion, estado, detalle });
  console.log(`${estado.padEnd(5)} ${id}  ${descripcion}${detalle ? ' :: ' + detalle : ''}`);
}
const fallos = resultados.filter(r => r.estado !== 'PASS').length;
console.log(`\n${resultados.length - fallos}/${resultados.length} casos PASS`);
if (process.env.KRITER_EVIDENCIA) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(process.env.KRITER_EVIDENCIA, JSON.stringify({
    fecha: new Date().toISOString(), proyecto: URL_BASE, total: resultados.length,
    pass: resultados.length - fallos, casos: resultados
  }, null, 2));
}
process.exit(fallos ? 1 : 0);
