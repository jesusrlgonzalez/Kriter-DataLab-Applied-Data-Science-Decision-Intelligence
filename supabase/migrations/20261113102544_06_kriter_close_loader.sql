-- Cierre del canal temporal de carga: se elimina la funcion expuesta, el area
-- de preparacion y los tokens. Despues de esta migracion no existe ninguna ruta
-- de escritura accesible desde el navegador.

drop function if exists public.kriter_stage_rows(text, jsonb);
drop table if exists app.stage_sales;
drop table if exists app.load_tokens;
