/* Kriter DataLab - carga del dataset sintetico autorizado en Supabase.
   Node 18 o superior. Lee data/demo_sales.csv y lo envia por lotes a la funcion
   temporal kriter_stage_rows, protegida por un token de un solo uso.

   Variables de entorno:
     SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, KRITER_LOAD_TOKEN
   Procedimiento completo en tools/CARGA_DATASET.md
*/
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, KRITER_LOAD_TOKEN } = process.env;
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !KRITER_LOAD_TOKEN) {
  console.error('Faltan SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY o KRITER_LOAD_TOKEN.');
  process.exit(2);
}

const texto = readFileSync(join(RAIZ, 'data', 'demo_sales.csv'), 'utf8').replace(/^﻿/, '').trim();
const lineas = texto.split(/\r?\n/);
const cabecera = lineas[0].split(',');
const ESPERADA = ['SEMANA', 'FECHA', 'ANIO', 'REGION', 'ITEM_CODE', 'PRODUCTO', 'SEGMENTO', 'MARCA', 'VENTAS_VALOR', 'VENTAS_UNIDADES'];
if (cabecera.join(',') !== ESPERADA.join(',')) {
  console.error('La cabecera del CSV no coincide con el contrato de datos.');
  process.exit(1);
}
const filas = lineas.slice(1).map((l, i) => {
  const c = l.split(',');
  if (c.length !== cabecera.length) throw new Error(`Fila ${i + 2} con ${c.length} campos`);
  return Object.fromEntries(cabecera.map((h, j) => [h, c[j]]));
});

const LOTE = 1680;
let enviadas = 0;
for (let i = 0; i < filas.length; i += LOTE) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/kriter_stage_rows`, {
    method: 'POST',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: KRITER_LOAD_TOKEN, p_rows: filas.slice(i, i + LOTE) })
  });
  const cuerpo = await r.text();
  if (!r.ok) { console.error(`Lote ${i}: HTTP ${r.status} ${cuerpo.slice(0, 200)}`); process.exit(1); }
  enviadas += Number(cuerpo);
  console.log(`Lote ${i / LOTE + 1}: ${enviadas}/${filas.length} filas`);
}
console.log(`Carga completada: ${enviadas} filas en el area de preparacion.`);
console.log('Siguiente paso: aplicar las migraciones 05 (normalizar) y 06 (cerrar el canal).');
