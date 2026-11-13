# Cambios

## 2.2.0 — 2026-11-13

Cierre de estandares profesionales: seguridad, validacion independiente,
gobierno del codigo, gestion de identidades, continuidad, calidad y
documentacion.

- Reduce la superficie del canal de bitacora: `kriter_log_event` deja de estar
  disponible para el rol anonimo, exige identidad verificada, fija la fecha en
  el servidor, acota los eventos a una lista cerrada, trunca el detalle y limita
  a 50 apuntes por usuario y hora (migracion 14).
- Registra formalmente el riesgo aceptado de ese canal, con la alternativa
  descartada y nueve controles compensatorios.
- Las pruebas adversariales de autorizacion pasan a ser un control bloqueante
  del flujo de publicacion: sin credenciales de prueba configuradas no se
  publica, y la evidencia se conserva 90 dias como artefacto de la ejecucion.
- Corrige el contraste de cuatro tokens de color que no alcanzaban el minimo
  WCAG AA (3.03:1 y 2.86:1 entre ellos) y los lleva por encima de 5.4:1.
- Retira el foco de teclado de los 80 puntos de la grafica, que obligaban a 80
  tabulaciones para cruzar el tablero.
- Anade encabezados de fila a la tabla de la bitacora, que un lector de pantalla
  leia sin referencia.
- Guiones de respaldo y de retiro de identidades de prueba en
  `supabase/respaldo/`.
- Documentacion nueva: continuidad operativa con restauracion comprobada,
  politica de datos sinteticos, accesibilidad y compatibilidad, ciclo de vida de
  identidades y distincion explicita entre el RLS de PostgreSQL y el RLS de
  Power BI.
- Los nombres de los archivos de migracion 12 y 13 ahora coinciden exactamente
  con las versiones aplicadas en la base.

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
