# Plan de reversión

La versión pública original **no se ha sustituido**. Convive con la candidata, ya publicada en su propio Space:

| Entorno | Contenido | Space | Flujo que lo publica |
|---|---|---|---|
| Producción | `site/` · aplicación estática con los datos incrustados | `JesusRLGonzalez/kriter-datalab` | `deploy-huggingface.yml` (push a `main`) |
| Candidata | `site-secure/` · Supabase, autenticación y RLS | `JesusRLGonzalez/kriter-datalab-rls` | `deploy-candidate-hf.yml` (solo manual) |

El flujo de la candidata **falla si el Space de destino es el de producción**.

## Revertir antes de sustituir

No hay nada que revertir: basta con no ejecutar el flujo manual. La producción
sigue publicándose desde `site/`.

## Revertir después de sustituir

Si en el futuro se decide que la candidata ocupe el Space principal:

1. **Reversión inmediata (minutos).** En GitHub, *Actions → Publicar en Hugging
   Face Spaces → Run workflow* sobre el último commit en el que `site/`
   contenía la versión estática. `hub-sync` reescribe el Space con ese contenido.
2. **Reversión por commit.** `git revert <commit de sustitución>` y push a
   `main`: la validación y la publicación se ejecutan solas.
3. **Reversión manual (sin terminal).** Subir a mano `site/index.html` y
   `site/README.md` en la pestaña *Files* del Space. Úsalo solo si GitHub Actions
   no está disponible: el siguiente push lo sobrescribe.

## Si falla Supabase

La versión estática **no depende de Supabase**: funciona aunque el proyecto esté
pausado o eliminado. Es la reversión natural ante cualquier incidente de la base
de datos.

El plan gratuito de Supabase **pausa los proyectos sin actividad**. Si eso
ocurre, la candidata muestra el aviso de error de conexión y el botón de
reintento; el proyecto se reanuda desde el panel.

## Criterio de abandono

Si tras el piloto la autenticación añade fricción sin aportar valor, se conserva
la versión estática como producto público y la candidata queda como evidencia
técnica de arquitectura segura.
