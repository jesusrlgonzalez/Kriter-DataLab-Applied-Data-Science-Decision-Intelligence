# Kriter DataLab

**Applied Data Science & Decision Intelligence** · Plataforma web de análisis comercial · 2026  
**Autor:** Jesus R.L. Gonzalez · **Marca:** Kriter Systems

Producto analítico para explorar tendencias de ventas, distribución comercial, concentración de portafolio y escenarios de sensibilidad. Se despliega como Hugging Face Static Space.

El repositorio contiene **dos versiones del mismo producto**:

| Versión | Carpeta | Qué hace | Estado |
|---|---|---|---|
| **Pública** | `site/` | Tablero estático; los datos viajan incrustados en el HTML | Publicada y verificada |
| **Candidata con control de acceso** | `site-secure/` | Mismo tablero contra PostgreSQL (Supabase) con autenticación, roles y **Row Level Security** | Validada; pendiente de publicar en un Space aparte |

La versión pública **no se sustituye** hasta autorizar expresamente el cambio.

**Demo en vivo:** https://huggingface.co/spaces/JesusRLGonzalez/kriter-datalab

> **Datos de demostración sintéticos.** No se publican datos de terceros ni se afirman resultados empresariales reales. Los cálculos, gráficos y filtros son funcionales y se ejecutan sobre el dataset incluido.

## Funciones

- Resumen ejecutivo con indicadores dinámicos.
- Comparación por marcas, segmentos, áreas y periodos.
- Ranking de productos, búsqueda y exportación CSV.
- Mapa de calor por área y mes.
- Simulación con horizonte, ventana histórica y amplitud de sensibilidad ajustables.
- Adaptación a pantallas móviles y navegación sin dependencias externas.

## Versión candidata: autenticación y seguridad por filas

Cada perfil ve únicamente las áreas comerciales que tiene asignadas, y la
autorización se evalúa en PostgreSQL, no en el navegador.

| Perfil | Áreas | Escenarios | Exportar | Bitácora |
|---|---|:-:|:-:|:-:|
| Administrador | Todas | Sí | Sí | Sí |
| Gerente regional | Asignadas | Sí | Sí | No |
| Analista | Asignadas | Sí | Sí | No |
| Auditor | Asignadas | No | Sí | Sí |
| Visitante o usuario sin rol | Solo el área pública | No | No | No |

```bash
python tools/build_secure.py      # compila site-secure/index.html
python tools/security_scan.py     # comprueba que no se publican credenciales ni datos
node tests/adversarial_http.mjs   # 20 casos adversariales con identidades reales
```

Detalle en **[arquitectura](docs/ARQUITECTURA_SUPABASE.md)**,
**[modelo de seguridad](docs/MODELO_SEGURIDAD_RLS.md)**,
**[administración](docs/ADMINISTRACION.md)** y **[plan de reversión](docs/REVERSION.md)**.

## Inicio local

```bash
python tools/generate_data.py
python tools/build.py
python -m http.server 8000 --directory site
```

Abre `http://localhost:8000` (o abre directamente `site/index.html`). No se requiere instalación de paquetes Python para ejecutar la compilación.

## Calidad

```bash
python -m unittest discover -s tests -v
```

```bash
pip install playwright            # solo para la prueba de navegador
python tools/browser_smoke.py     # 28 controles funcionales; usa Chrome/Chromium del sistema o KRITER_BROWSER
python tools/verify_release.py    # integridad frente a MANIFIESTO_SHA256.txt (--write lo regenera)
```

En cada push a `main`, GitHub Actions reconstruye el dataset y la aplicación, ejecuta las pruebas, comprueba que lo reconstruido coincide con lo versionado y, solo entonces, sincroniza `site/` con el Space. Los flujos están en `.github/workflows/`.

## Publicación

Lee **[la guía de publicación sin terminal](docs/RUTA_SIN_TERMINAL.md)** o **[la guía técnica de GitHub → Hugging Face](docs/DESPLIEGUE_GITHUB_HF.md)**. Solo se sincroniza el directorio `site/` a un Space con SDK estático; el Space es un espejo exacto de `site/`.

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md)
- [Datos y límites de interpretación](docs/DATOS_Y_LIMITACIONES.md)
- [Aviso de derechos y uso](NOTICE.md)
- [Consideraciones de seguridad](SECURITY.md)
- [Informe de auditoría y estados por fase](docs/INFORME_AUDITORIA.md)
- [Arquitectura con Supabase y RLS](docs/ARQUITECTURA_SUPABASE.md)
- [Modelo de seguridad y límites](docs/MODELO_SEGURIDAD_RLS.md)
- [Manual de administración](docs/ADMINISTRACION.md)
- [Plan de reversión](docs/REVERSION.md)
- [Carga reproducible del dataset](tools/CARGA_DATASET.md)
- [Dictamen técnico de la migración](docs/DICTAMEN_MIGRACION_RLS.md)

## Estado

- **Publicado:** [Space en Hugging Face](https://huggingface.co/spaces/JesusRLGonzalez/kriter-datalab) · [pantalla completa](https://jesusrlgonzalez-kriter-datalab.static.hf.space/index.html). Verificado el 12-nov-2026 sobre la URL pública.
- **Publicación automática:** cada push a `main` valida y sincroniza `site/` con el Space.
- **Candidata con RLS:** validada sobre el proyecto Supabase `kriter-analytics` (20/20 casos adversariales en verde). Su publicación es **manual** y exige un Space distinto del de producción.
