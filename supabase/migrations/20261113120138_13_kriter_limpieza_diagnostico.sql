-- Elimina la funcion auxiliar de medicion de tiempos usada durante el
-- diagnostico. No forma parte del producto y el analizador la marcaba por
-- tener search_path mutable.
drop function if exists app.medir(text);
