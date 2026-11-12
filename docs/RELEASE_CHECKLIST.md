# Control de liberación — 1.0.0

| Control | Estado | Evidencia |
|---|---|---|
| Eliminación de identificadores académicos en la interfaz | PASS | Búsqueda automatizada en `tests/test_package.py` |
| Dataset público sintético | PASS | `tools/generate_data.py`, `data/demo_sales.csv` |
| Cardinalidad y claves coherentes | PASS | `tests/test_package.py` |
| Reproducción determinista | PASS | `python -m unittest discover -s tests -v` |
| JavaScript y YAML válidos | PASS | `node --check`, validación YAML local |
| Cálculos, filtros, navegación, CSV y escenarios | PASS | `evidence/browser_checks.json` |
| Adaptación de escritorio y móvil | PASS | `evidence/01_vista_escritorio.png`, `02_vista_movil.png` |
| Código y configuración GitHub Actions preparados | PASS | `.github/workflows/` |
| Space publicado y URL comprobada | PENDIENTE | Requiere cuenta, credenciales y ejecución en GitHub/Hugging Face |
| Acceso público desde navegador externo | PENDIENTE | Verificar tras publicar |

Las pruebas de navegador se realizaron cargando el HTML en Chromium con Playwright. Debido a una restricción de navegación local del entorno, no constituyen todavía una comprobación HTTP del Space remoto.

**Criterio de salida:** no anunciar URL de producto hasta que la sincronización y la prueba externa sean correctas.
