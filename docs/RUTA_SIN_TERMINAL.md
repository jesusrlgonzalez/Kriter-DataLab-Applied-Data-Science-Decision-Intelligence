# Publicación íntegramente con interfaz gráfica

Esta ruta no requiere instalar Python ni usar PowerShell. Se puede ejecutar desde Windows mediante GitHub Desktop y el navegador.

## A. Repositorio GitHub

1. Descarga y descomprime el paquete `Kriter_Sales_Intelligence_GitHub_HuggingFace.zip`.
2. Crea un repositorio GitHub llamado `kriter-sales-intelligence` bajo la cuenta u organización autorizada. No lo inicialices con archivos de ejemplo.
3. Instala **GitHub Desktop** desde https://desktop.github.com/ e inicia sesión.
4. En GitHub Desktop selecciona **File → Clone repository**, elige el repositorio recién creado y una carpeta vacía en Windows.
5. Copia **el contenido** de la carpeta descomprimida `kriter-sales-intelligence` a la carpeta clonada, sin introducir un nivel de carpetas adicional.
6. Comprueba que existen los directorios `site`, `src`, `tools`, `data`, `tests` y `.github/workflows` directamente en la raíz de la copia.
7. En GitHub Desktop, escribe un mensaje de commit (por ejemplo `Release 1.0.0`) y presiona **Commit to main** y **Push origin**.
8. Abre GitHub en el navegador y verifica que se ven `site/index.html`, `site/README.md` y los dos flujos YAML.

## B. Space Hugging Face

1. Entra en https://huggingface.co/new-space.
2. Crea un Space, por ejemplo `kriter-sales-intelligence`, de tipo **Static HTML**.
3. Selecciona visibilidad pública solo porque los datos del paquete son completamente sintéticos.
4. Anota el identificador exacto que aparece en la URL: `USUARIO_HF/kriter-sales-intelligence`.
5. Crea un token personal **fine-grained** en Hugging Face con permiso para escribir en ese Space. No copies el token en el repositorio.

## C. Conectar GitHub con Hugging Face

1. En GitHub, entra al repositorio → **Settings → Secrets and variables → Actions**.
2. En **Variables** crea `HF_SPACE_ID` con `USUARIO_HF/kriter-sales-intelligence` (usa tu identificador real).
3. En **Secrets** crea `HF_TOKEN` con el token de Hugging Face.
4. Abre **Actions** → `Publicar en Hugging Face Spaces` → **Run workflow**.
5. El flujo valida el conjunto sintético, recompila el sitio, ejecuta pruebas y sube únicamente `site/`.
6. En el Space, abre **App** y prueba los filtros de región y marca, la navegación y la exportación de CSV.
7. Copia la URL real del Space, no un marcador, y pruébala sin haber iniciado sesión.

## D. Si no aparece la acción

- Revisa que el repositorio tenga `main` como rama principal.
- Confirma que `.github/workflows/deploy-huggingface.yml` se subió conservando la ruta exacta.
- En **Settings → Actions** verifica que las acciones estén habilitadas.

## E. Seguimiento

Para futuras modificaciones: actualiza el repositorio mediante GitHub Desktop y usa **Push origin**. La publicación se automatiza al pasar las pruebas en `main`.

### Importante

No subas el PBIX ni los archivos de ventas originales. Todo lo publicado en este producto es un conjunto sintético. El sitio no tiene autenticación y el código de un Space público puede consultarse y copiarse.
