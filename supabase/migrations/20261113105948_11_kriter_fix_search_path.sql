-- Endurecimiento: fijar search_path en todas las funciones. Sin esto, el
-- analizador de Supabase advierte que un llamante podria alterar la resolucion
-- de nombres. Todos los objetos ya se referencian cualificados.

alter function public.kriter_session_context() set search_path = '';
alter function public.kriter_filter_options() set search_path = '';
alter function public.kriter_dashboard(text,int,text,text,date,date,int,int,text,text) set search_path = '';
alter function public.kriter_scenario(text,int,text,text,date,date,int,int,numeric) set search_path = '';
alter function public.kriter_export_products(text,int,text,text,date,date) set search_path = '';
alter function app.resolve_region(text) set search_path = '';
