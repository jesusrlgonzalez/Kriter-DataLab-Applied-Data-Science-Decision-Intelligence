# Guía de publicación sin terminal

**Estado al 12-nov-2026:** el código ya está publicado en GitHub y la validación automática pasa. Falta **solo** conectar Hugging Face, y eso requiere credenciales que únicamente tú puedes crear. Son 4 pasos, unos 10 minutos, todo en el navegador.

- Repositorio: https://github.com/jesusrlgonzalez/Kriter-DataLab-Applied-Data-Science-Decision-Intelligence
- Space que se creará: `JesusRLGonzalez/kriter-datalab`

## Lo que debes hacer tú (en este orden)

### Paso 1 · Crear el Space (2 min)

1. Abre https://huggingface.co/new-space con tu sesión de `JesusRLGonzalez`.
2. **Space name:** `kriter-datalab`.
3. **Select the Space SDK:** *Static* → plantilla *Blank*.
4. Visibilidad: **Public** (los datos son sintéticos).
5. Pulsa **Create Space**. No subas ni edites archivos ahí: GitHub lo llenará.

### Paso 2 · Crear el token de publicación (3 min)

1. Abre https://huggingface.co/settings/tokens → **Create new token**.
2. Tipo **Fine-grained**. Nombre: `github-kriter-datalab`.
3. En **Repositories permissions**, busca y selecciona `spaces/JesusRLGonzalez/kriter-datalab` y marca **Write access to contents/settings of selected repos**. No marques nada más.
4. **Create token** y copia el valor (empieza por `hf_`). Solo se muestra una vez. No lo pegues en ningún archivo ni chat.

### Paso 3 · Guardar la variable y el secreto en GitHub (3 min)

1. Abre https://github.com/jesusrlgonzalez/Kriter-DataLab-Applied-Data-Science-Decision-Intelligence/settings/variables/actions → **New repository variable**.
   - Name: `HF_SPACE_ID`
   - Value: `JesusRLGonzalez/kriter-datalab`
2. Abre https://github.com/jesusrlgonzalez/Kriter-DataLab-Applied-Data-Science-Decision-Intelligence/settings/secrets/actions → **New repository secret**.
   - Name: `HF_TOKEN`
   - Secret: el token del paso 2.

### Paso 4 · Lanzar la publicación (2 min)

1. Abre https://github.com/jesusrlgonzalez/Kriter-DataLab-Applied-Data-Science-Decision-Intelligence/actions/workflows/deploy-huggingface.yml
2. **Run workflow** → rama `main` → **Run workflow**.
3. Espera a que los trabajos `validar` y `deploy` queden en verde (≈1 minuto).
4. Abre https://huggingface.co/spaces/JesusRLGonzalez/kriter-datalab y comprueba que carga el tablero.

**Cuando termines, avísame** («Space publicado») y hago la verificación de la fase 7 sobre la URL real: gráficos, filtros, exportación y vista móvil.

## Opcional (recomendado)

- En la página del repositorio, engrane de **About** → pega la URL del Space en *Website*.
- En **Actions**, la primera ejecución aparece en rojo: fue el fallo real que detectó el control de integridad (finales de línea de los CSV) y que se corrigió en el commit siguiente. Puedes borrarla con el menú «…» → *Delete workflow run*.

## Cómo seguir trabajando desde tu PC

Tu carpeta `Kriter DataLab` no es un clon de git. Para editar en adelante:

1. Instala **GitHub Desktop** (https://desktop.github.com) e inicia sesión como `jesusrlgonzalez`.
2. **File → Clone repository** → elige el repositorio → carpeta vacía dentro de `Kriter DataLab`.
3. Cambia archivos en `src/` (nunca `site/index.html` a mano). Para recompilar necesitas Python: `python tools/build.py` y `python tools/verify_release.py --write`. Si no quieres usar Python, pídemelo y lo hago yo.
4. En GitHub Desktop: escribe el mensaje, **Commit to main**, **Push origin**. Cada push valida y publica solo.

## Reglas

- El Space es un espejo de `site/`: lo que edites directamente en Hugging Face se borra en la siguiente publicación.
- No subas PBIX, archivos de ventas originales ni material académico. Todo lo público es sintético.
- Autoría de los commits: `Jesús R. L. González`, sin coautores ni bots.
