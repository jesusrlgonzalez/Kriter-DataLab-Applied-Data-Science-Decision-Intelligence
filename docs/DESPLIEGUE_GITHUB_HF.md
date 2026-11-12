# Despliegue: GitHub → Hugging Face Spaces

Repositorio: https://github.com/jesusrlgonzalez/Kriter-DataLab-Applied-Data-Science-Decision-Intelligence
Space previsto: `JesusRLGonzalez/kriter-datalab` (SDK `static`).

## Cómo funciona

```text
push a main ─> deploy-huggingface.yml
                 ├─ validar  (reutiliza ci.yml: sintaxis JS, reconstrucción, pruebas,
                 │            reproducibilidad con git diff, manifiesto SHA-256)
                 └─ deploy   (solo si validar pasa y existe la variable HF_SPACE_ID)
                               huggingface/hub-sync@v0.3.0  →  site/  →  Space
```

- `ci.yml` se ejecuta por sí solo únicamente en pull requests o a mano; en `main` lo invoca el flujo de publicación. Así cada push valida **una** vez y publica **una** vez.
- `concurrency` pone en cola los despliegues: nunca hay dos sincronizaciones simultáneas.
- **Borrado remoto:** `delete_removed: 'true'`. El Space queda como espejo de `site/`: cualquier archivo del Space que no exista en `site/` se elimina en la siguiente publicación. No edites archivos directamente en el Space; cambia `src/`, recompila y haz push.
- La acción crea el Space si no existe (`--exist-ok`), con SDK `static`.
- Si falta la variable `HF_SPACE_ID`, el trabajo `deploy` aparece como *omitido* (publicación bloqueada, no fallida). Si falta el secreto `HF_TOKEN`, falla con un mensaje explícito.

## Configuración (una sola vez)

En GitHub → **Settings → Secrets and variables → Actions**:

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `HF_SPACE_ID` | `JesusRLGonzalez/kriter-datalab` |
| Secreto | `HF_TOKEN` | Token de Hugging Face con permiso de escritura sobre ese Space |

No escribas el token en archivos, README ni URLs.

## Con terminal

```bash
git clone https://github.com/jesusrlgonzalez/Kriter-DataLab-Applied-Data-Science-Decision-Intelligence.git
cd Kriter-DataLab-Applied-Data-Science-Decision-Intelligence
python tools/generate_data.py && python tools/build.py
python -m unittest discover -s tests -v
python tools/verify_release.py --write   # si cambiaste algún archivo
git add -A && git commit -m "Describe el cambio" && git push
```

## Incidencias

- **`deploy` omitido:** falta la variable `HF_SPACE_ID`.
- **Falla «Falta el secreto HF_TOKEN» o 401/403:** crea o renueva el token y actualiza el secreto.
- **Falla «Reproducibilidad»:** se editó `site/index.html` o `data/demo_sales.csv` a mano. Recompila con `tools/build.py`.
- **Falla «Manifiesto de integridad»:** ejecuta `python tools/verify_release.py --write` y vuelve a hacer push.
- **El Space muestra una versión anterior:** recarga sin caché (Ctrl+F5) y revisa la pestaña *Files* del Space.
