# Kriter DataLab

**Applied Data Science & Decision Intelligence** · Plataforma web de análisis comercial · 2026  
**Autor:** Jesus R.L. Gonzalez · **Marca:** Kriter Systems

Producto analítico estático para explorar tendencias de ventas, distribución comercial, concentración de portafolio y escenarios de sensibilidad. Se ejecuta desde un navegador moderno y puede desplegarse como Hugging Face Static Space.

**Demo en vivo:** https://huggingface.co/spaces/JesusRLGonzalez/kriter-datalab

> **Datos de demostración sintéticos.** No se publican datos de terceros ni se afirman resultados empresariales reales. Los cálculos, gráficos y filtros son funcionales y se ejecutan sobre el dataset incluido.

## Funciones

- Resumen ejecutivo con indicadores dinámicos.
- Comparación por marcas, segmentos, áreas y periodos.
- Ranking de productos, búsqueda y exportación CSV.
- Mapa de calor por área y mes.
- Simulación con horizonte, ventana histórica y amplitud de sensibilidad ajustables.
- Adaptación a pantallas móviles y navegación sin dependencias externas.

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

## Estado

- **Publicado:** [Space en Hugging Face](https://huggingface.co/spaces/JesusRLGonzalez/kriter-datalab) · [pantalla completa](https://jesusrlgonzalez-kriter-datalab.static.hf.space/index.html). Verificado el 12-nov-2026 sobre la URL pública.
- **Publicación automática:** cada push a `main` valida y sincroniza `site/` con el Space.
