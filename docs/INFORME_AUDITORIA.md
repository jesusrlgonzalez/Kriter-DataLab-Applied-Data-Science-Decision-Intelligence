# Informe de auditoría y despliegue — Kriter DataLab 1.2.0

**Fecha:** 12-nov-2026 · **Responsable:** Jesus R.L. Gonzalez
**Repositorio:** https://github.com/jesusrlgonzalez/Kriter-DataLab-Applied-Data-Science-Decision-Intelligence

## 1. Conclusión

El producto está **publicado en GitHub y validado**; la **publicación en Hugging Face está bloqueada** únicamente por dos credenciales que debe crear el titular (`HF_SPACE_ID` y `HF_TOKEN`). No existe todavía una URL pública del Space y este informe no declara ninguna.

| Fase | Preparación local | Validación técnica | Publicación remota |
|---|:-:|:-:|:-:|
| 0 · Auditoría de recepción | PASS | PASS | n/a |
| 1 · Producto y UX | PASS | PASS (28/28 en navegador) | n/a |
| 2 · Reproducibilidad | PASS | PASS (clon limpio y GitHub Actions) | n/a |
| 3 · Hugging Face Space estático | PASS | PASS (contrato del README y de `site/`) | BLOCKED |
| 4 · GitHub y CI/CD | PASS | PASS (trabajo `validar` en verde) | PASS en GitHub · `deploy` omitido |
| 5 · Seguridad y propiedad intelectual | PASS | PASS | PASS (repositorio sin secretos) |
| 6 · Validación funcional | PASS | PASS | BLOCKED (sobre la URL real) |
| 7 · Publicación | PASS | PASS | GitHub: PASS · Hugging Face: **BLOCKED** |

Ninguna fase quedó en FAIL. Desbloqueo: `docs/RUTA_SIN_TERMINAL.md` (4 pasos, ≈10 min).

## 2. Fase 0 — Recepción

- **Entrada:** la carpeta contenía el paquete ya descomprimido (entonces con el nombre «Kriter Sales Intelligence», 27 archivos) y una copia del Space. El archivo `.zip` no estaba en la carpeta; se auditó el contenido descomprimido.
- **Integridad:** los 27 archivos coincidían con su `MANIFIESTO_SHA256.txt`. `Space_Estatico/index.html` era idéntico byte a byte a `site/index.html`.
- **Credenciales:** búsqueda de tokens de Hugging Face y GitHub, claves AWS, claves privadas y contraseñas: 0 coincidencias.
- **Dependencias:** ninguna en ejecución (HTML, CSS y JavaScript propios, sin CDN ni tipografías externas). Compilación con la biblioteca estándar de Python. Playwright solo para la prueba de navegador.
- **Datos:** 20,160 filas generadas con `random.Random(20261112)`; marcas «Portafolio 01–24» y productos «KS-0001…»; sin nombres comerciales reales.
- **Derechos:** `NOTICE.md` reserva derechos; no hay archivo de licencia, por lo que el código es legible pero no reutilizable por terceros. Decisión del titular.

| Decisión | Archivos |
|---|---|
| Conservar | `src/`, `tools/generate_data.py`, `tools/build.py`, `data/`, `NOTICE.md`, `SECURITY.md`, `docs/ARQUITECTURA.md`, `docs/DATOS_Y_LIMITACIONES.md` |
| Modificar | `src/app.js`, `src/styles.css`, `src/template.html`, ambos flujos, `tests/test_package.py`, `tools/browser_smoke.py`, `tools/verify_release.py`, `.gitattributes`, `README.md`, `site/README.md`, guías |
| Regenerar | `site/index.html`, `evidence/*`, `MANIFIESTO_SHA256.txt` |
| No publicar | La copia duplicada del Space (se obtiene de `site/`) |

## 3. Hallazgos y correcciones

| # | Hallazgo (evidencia) | Gravedad | Corrección |
|---|---|---|---|
| 1 | Los CSV se guardan con CRLF y `.gitattributes` los convertía a LF: en un clon nuevo el hash del dataset no coincidía con el manifiesto ni con el incrustado en la aplicación. Lo detectó la primera ejecución en GitHub Actions (fallo real). | Alta | `*.csv -text`: los CSV se conservan byte a byte. Ejecución siguiente en verde. |
| 2 | En cada push a `main` se ejecutaban dos flujos con la misma validación (`ci.yml` y `deploy`). | Media | `ci.yml` es reutilizable; en `main` solo corre el flujo de publicación (valida → publica). Se añadió `concurrency`. |
| 3 | Sin `HF_SPACE_ID`, cada push terminaba en rojo. | Media | `deploy` se omite si falta la variable; si falta `HF_TOKEN`, falla con mensaje explícito. |
| 4 | Comportamiento de borrado remoto implícito: `hub-sync@v0.3.0` borra por defecto lo que no esté en el conjunto subido. | Media | Declarado (`delete_removed: 'true'`) y documentado: el Space es espejo de `site/`. |
| 5 | El orden de la tabla no era operable con teclado y la flecha «↓» no cambiaba de columna. | Media | `tabindex`, Enter/Espacio, `aria-sort`, flecha dinámica. |
| 6 | La barra seleccionada como filtro se atenuaba (60 % de opacidad), al revés de lo esperado. | Baja | Resaltado y `aria-pressed`. |
| 7 | Rango «desde» posterior a «hasta»: todo en cero sin explicación. | Baja | Mensaje explícito en la barra de alcance. |
| 8 | Mapa de calor con cifras de 6–7 caracteres en celdas de 38 px y contraste bajo en celdas claras. | Baja | Formato compacto sin decimales y texto más oscuro. |
| 9 | En móvil, fuera del Resumen, el aviso de datos sintéticos solo quedaba en el pie. | Baja | Etiqueta «Datos sintéticos» en la barra de filtros, visible en todas las páginas. |
| 10 | Menú móvil sin `aria-expanded`; botón «Exportar CSV» partido en tres líneas. | Baja | Atributo sincronizado, cierre con Escape, `nowrap`. |
| 11 | `browser_smoke.py` dependía de `/usr/bin/chromium`. | Baja | Detección automática o `KRITER_BROWSER`. |
| 12 | El manifiesto no se podía regenerar con las herramientas del repositorio. | Baja | `verify_release.py --write`. |

**Rendimiento:** recalcular los 20,160 registros y redibujar las cinco páginas tarda 11–12 ms de mediana (máx. 26 ms) en escritorio, tableta y móvil emulados. No hay problema demostrable; no se añadió caché ni se cambió el algoritmo. Solo se agrupó el redibujado al redimensionar en un `requestAnimationFrame`.

## 4. Reproducibilidad (fase 2)

Clon limpio del repositorio, borrado de `data/demo_sales.csv` y `site/index.html`, regeneración con `tools/generate_data.py` y `tools/build.py`:

| Archivo | SHA-256 (versionado = regenerado) |
|---|---|
| `data/demo_sales.csv` | `e33df39cd5be722fc828179bcee16fe43f1c20671d48b17cbb90d0998898bfa6` |
| `site/index.html` | `7ac69b4e429c4fed2bdd6efc4712c59603bf41e82630eb346207b9fda9182748` |

El dataset no cambió frente al paquete recibido. `site/index.html` cambió porque cambiaron sus fuentes en `src/`; nunca se editó a mano. Pruebas unitarias: 9/9. GitHub Actions repite lo mismo y compara con `git diff --exit-code`.

## 5. Validación funcional (fase 6)

`evidence/browser_checks.json`: **28/28 PASS**, 0 errores de JavaScript, 0 solicitudes de red. Cada indicador se compara con un cálculo independiente en Python sobre el CSV:

- Ventas totales y filtros por área, marca, año, segmento y rango de semanas (valor, unidades y productos distintos).
- Escenario base y optimista reconciliados con el promedio de las últimas 8 semanas × 4.
- Exportación CSV: 350 filas y suma igual al total.
- Orden por teclado, filtro desde gráfico (80 puntos en la serie), navegación de las cinco páginas.
- Móvil 390 px: sin desbordamiento horizontal, menú operable, mapa de calor visible.
- Accesibilidad básica: todos los controles con etiqueta, un solo `h1`, `lang="es"`.

Capturas: `evidence/01_vista_escritorio.png`, `evidence/02_vista_movil.png`. Exportación: `evidence/export_smoke.csv`.

## 6. Publicación (fase 7)

| Elemento | Estado | Evidencia |
|---|---|---|
| Repositorio GitHub público con historial de un solo autor | PASS | Commits de `Jesús R. L. González`, sin coautores ni bots |
| Validación en GitHub Actions | PASS | Ejecución 43316184984 (`validar` en verde, `deploy` omitido) |
| Primera ejecución | FAIL corregido | Ejecución 43314235748: hallazgo n.º 1 |
| Space `JesusRLGonzalez/kriter-datalab` | BLOCKED | No existe todavía; faltan `HF_SPACE_ID` y `HF_TOKEN` |
| Verificación sobre la URL pública | BLOCKED | Depende del punto anterior |

## 7. Límites

- Pruebas en Chrome (motor Chromium), con móvil emulado. No se probó en Firefox, Safari ni en un teléfono físico.
- Accesibilidad «básica»: no es una auditoría WCAG completa ni se probó con lector de pantalla.
- El paso `hub-sync` no se ha ejecutado nunca contra Hugging Face; su configuración se revisó contra el `action.yml` de la versión `v0.3.0`.
- Todas las cifras del tablero son sintéticas y los escenarios son análisis de sensibilidad, no pronósticos.
- El producto se llamaba «Kriter Sales Intelligence» en el paquete recibido; desde la versión 1.2.0 se llama **Kriter DataLab**, igual que el repositorio. Las ejecuciones y commits anteriores conservan el nombre antiguo en su historial.

## 8. Plan de 3 pasos

1. **Tú (10 min):** crear Space y token, guardar `HF_SPACE_ID` y `HF_TOKEN`, pulsar *Run workflow*.
2. **Verificación:** comprobar la URL real (gráficos, filtros, CSV, móvil) y pasar las fases 3, 6 y 7 a PASS.
3. **Cierre:** añadir la URL al README y al *About* del repositorio; decidir licencia.
