-- Kriter DataLab - 03 Catalogos de roles y areas comerciales. Idempotente.

insert into public.roles (code, name, description, global_scope, can_export, can_view_scenarios, can_read_audit) values
  ('administrador','Administrador','Acceso a todas las areas del entorno autorizado.',          true,  true,  true,  true),
  ('regional',     'Gerente regional','Acceso limitado a las areas expresamente asignadas.',    false, true,  true,  false),
  ('analista',     'Analista','Areas asignadas y consultas analiticas permitidas.',             false, true,  true,  false),
  ('auditor',      'Auditor','Solo lectura de areas asignadas y de la bitacora de seguridad.',  false, true,  false, true)
on conflict (code) do update set
  name = excluded.name, description = excluded.description, global_scope = excluded.global_scope,
  can_export = excluded.can_export, can_view_scenarios = excluded.can_view_scenarios,
  can_read_audit = excluded.can_read_audit;

insert into public.regions (code, name, is_public) values
  ('NOR','Norte',         true),
  ('OCC','Occidente',     false),
  ('BAJ','Bajío',         false),
  ('CEN','Centro',        false),
  ('MET','Metropolitana', false),
  ('SUR','Sureste',       false)
on conflict (name) do update set code = excluded.code, is_public = excluded.is_public;
