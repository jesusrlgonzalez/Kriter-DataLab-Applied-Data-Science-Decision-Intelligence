# Cambios

## 2.1.0 — 2026-11-13

- Corrige la exportacion CSV, que la API truncaba en silencio a 1,000 filas: la funcion devuelve ahora un unico valor JSON y la suma vuelve a cuadrar con el indicador del tablero.
- Una sola recarga por cambio de sesion: el tablero ya no parpadea en blanco al iniciar o cerrar sesion.
- Mensaje claro cuando el servidor cancela una consulta por tiempo de ejecucion, con opcion de reintento.
- Caso RLS-21: comprueba que la exportacion completa no se trunca (21 casos adversariales en total).
- Verificacion sobre la URL publicada del Space candidato.

## 2.0.0 — 2026-11-13

- Nueva version candidata con **autenticacion, roles y Row Level Security** sobre PostgreSQL (Supabase, plan gratuito), sin Docker ni FastAPI.
- Modelo relacional de ocho tablas con denegacion por defecto y sin ninguna ruta de escritura accesible desde el navegador.
- Cuatro perfiles (administrador, gerente regional, analista y auditor) con alcance por area y capacidades diferenciadas de exportacion, simulacion y auditoria.
- API analitica en PL/pgSQL que agrega dentro de la base respetando RLS; busqueda, orden y paginacion en el servidor.
- Aplicacion estatica sin datos comerciales incrustados: de 674 KB a 287 KB.
- Banco de pruebas adversariales con identidades independientes y banco de aislamiento en SQL.
- Publicacion manual hacia un Space distinto del de produccion, con salvaguarda que impide sobrescribirlo.
- La aplicacion publica original se mantiene intacta.

## 1.2.1 — 2026-11-12

- Publicación en Hugging Face Spaces verificada sobre la URL pública.
- Metadatos del Space: `license: other`, `short_description` y `colorTo: green` (Hugging Face no admite `cyan`).

## 1.2.0 — 2026-11-12

- El producto pasa a llamarse **Kriter DataLab** (antes «Kriter Sales Intelligence») en la aplicación, la documentación, las pruebas y el Space previsto (`JesusRLGonzalez/kriter-datalab`).

## 1.1.0 — 2026-11-12

- Accesibilidad: orden de la tabla operable con teclado (`aria-sort`), menú móvil con `aria-expanded` y cierre con Escape, barras seleccionadas con `aria-pressed`.
- UX: la barra seleccionada se resalta en lugar de atenuarse; el mapa de calor usa cifras compactas legibles; aviso explícito cuando el rango de semanas está invertido; etiqueta «Datos sintéticos» visible en todas las páginas y tamaños.
- CI/CD: un solo flujo por push a `main` (valida y después publica), sin validaciones duplicadas; cola de despliegues (`concurrency`); la publicación se omite si falta `HF_SPACE_ID`; borrado remoto explícito (`delete_removed`).
- Pruebas: 28 controles de navegador (antes 19) y contratos del Space y del flujo de publicación.
- Herramientas: `tools/verify_release.py --write` regenera el manifiesto; `tools/browser_smoke.py` localiza el navegador sin rutas fijas.

## 1.0.0 — 2026-11-12

- Publicación inicial del producto analítico web bajo la marca Kriter Systems.
- Generador reproducible de 20,160 registros comerciales sintéticos.
- Cinco vistas analíticas con filtros, exportación CSV y escenarios de sensibilidad.
- Space HTML estático, integración continua y sincronización GitHub → Hugging Face.
- Pruebas de contratos de datos y navegación verificadas localmente.
