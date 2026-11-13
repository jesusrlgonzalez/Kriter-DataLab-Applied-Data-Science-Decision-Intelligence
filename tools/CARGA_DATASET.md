# Carga reproducible del dataset sintético

El dataset público (`data/demo_sales.csv`, 20,160 filas, SHA-256
`e33df39cd5be722fc828179bcee16fe43f1c20671d48b17cbb90d0998898bfa6`) se carga una
sola vez por proyecto. El canal de carga **se abre y se cierra con migraciones
versionadas**, de modo que en el estado final no existe ninguna ruta de escritura
accesible desde el navegador.

## Procedimiento

1. Aplica las migraciones `01`, `02`, `03` y `04` en orden.
2. Crea un token de un solo uso y cópialo:

   ```sql
   insert into app.load_tokens (token)
   values (replace(gen_random_uuid()::text, '-', ''))
   returning token;
   ```

3. Ejecuta la carga desde una máquina con acceso a internet:

   ```bash
   export SUPABASE_URL="https://<ref>.supabase.co"
   export SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
   export KRITER_LOAD_TOKEN="<token del paso 2>"
   node tools/cargar_dataset.mjs
   ```

4. Aplica la migración `05` (normaliza el área de preparación hacia
   `products` y `sales`) y comprueba las cifras de control:

   | Control | Valor esperado |
   |---|---|
   | Filas en `sales` | 20,160 |
   | Productos | 350 |
   | Áreas | 6 |
   | Semanas | 80 |
   | Suma de `value` | 48,820,590.6720 |
   | Suma de `units` | 473,632 |

5. Aplica la migración `06`: elimina la función `kriter_stage_rows`, el área de
   preparación y los tokens. **Este paso no es opcional.**

## Si no hay salida a internet desde la terminal

El mismo contenido puede enviarse desde la consola del navegador con la clave
publicable y el token; el procedimiento es idéntico (lotes de 1,680 filas contra
`/rest/v1/rpc/kriter_stage_rows`). El token caduca al cerrarse con la migración 06.

## Ventana de exposición

Entre los pasos 2 y 5 la función de carga está expuesta a quien tenga la clave
publicable **y** el token. Por eso el token es aleatorio, de un solo uso y se
destruye en el paso 5. En un entorno con datos reales, realiza la carga con la
clave de servicio desde un proceso del servidor y no publiques el proyecto hasta
haber cerrado el canal.
