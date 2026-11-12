# Control de liberación — 1.2.1

| Control | Estado | Evidencia |
|---|---|---|
| Sin identificadores académicos en la interfaz | PASS | `tests/test_package.py::test_no_course_markers_in_public_app` |
| Dataset público sintético y reproducible | PASS | `tools/generate_data.py`, SHA-256 en `MANIFIESTO_SHA256.txt` |
| Reproducción desde clon limpio | PASS | Hashes idénticos tras regenerar; ver `docs/INFORME_AUDITORIA.md` |
| Cálculos, filtros, orden, CSV, escenarios, móvil y accesibilidad básica | PASS | `evidence/browser_checks.json` (28/28) |
| Validación en GitHub Actions | PASS | Flujo «Publicar en Hugging Face Spaces», trabajo `validar` |
| Space publicado y URL comprobada | PASS | https://huggingface.co/spaces/JesusRLGonzalez/kriter-datalab · ejecución 43321716779 |

**Criterio de salida cumplido:** la URL pública se comprobó el 12-nov-2026.
