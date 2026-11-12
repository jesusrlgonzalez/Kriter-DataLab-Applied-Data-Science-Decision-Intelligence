# Arquitectura de la aplicación

```text
Repositorio GitHub (main)
 ├─ src/template.html + src/styles.css + src/app.js
 ├─ tools/generate_data.py ──> data/demo_sales.csv
 ├─ tools/build.py ──────────> site/index.html
 ├─ tests/ ──────────────────> controles reproducibles
 └─ .github/workflows/
       ├─ ci.yml (reconstruir + comparar)
       └─ deploy-huggingface.yml (sincronizar site/)
                               ↓
                     Hugging Face Space
                     SDK static
                     index.html
                               ↓
                    Navegador del usuario
                 filtros / KPIs / CSV / SVG
```

No existen peticiones de datos a APIs ni servicios externos. El navegador procesa las filas contenidas en `site/index.html`. Esta estrategia es apropiada para una demostración pública de tamaño moderado, pero no proporciona autenticación, políticas de acceso ni actualizaciones incrementales.

## Modelo de datos

- **Hecho:** venta por semana, área y código de producto.
- **Dimensiones:** semana, área, segmento, marca y producto.
- **Métricas:** importe, unidades, productos activos y promedio por semana observada.
- **Contratos:** producto asociado a exactamente una marca y un segmento; claves semana-área-producto únicas; importes y unidades no negativos.
- **Fuente:** generador sintético determinista con semilla `20261112`.

## Limitaciones y siguiente evolución

- La simulación comercial usa promedios recientes y multiplicadores. No incluye inferencia estadística validada.
- El diseño estático expone todo el dataset integrado: no utilizar para datos confidenciales.
- Para operar con fuentes empresariales reales se necesitarían autenticación, API, control de acceso, data pipeline, observabilidad y permisos de uso.
