# Cambios

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
