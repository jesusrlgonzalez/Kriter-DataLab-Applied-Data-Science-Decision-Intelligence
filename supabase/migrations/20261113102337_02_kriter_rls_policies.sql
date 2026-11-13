-- Kriter DataLab - 02 Row Level Security con denegacion por defecto.
-- La identidad proviene de auth.uid(); el navegador no puede declarar rol ni region.

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid()) and r.global_scope
  );
$$;

create or replace function app.allowed_region_ids() returns smallint[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct r.id), '{}'::smallint[])
  from public.regions r
  where r.is_public
     or app.is_admin()
     or exists (select 1 from public.user_regions ur
                where ur.user_id = (select auth.uid()) and ur.region_id = r.id);
$$;

create or replace function app.has_capability(p_cap text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and case p_cap
            when 'export'    then r.can_export
            when 'scenarios' then r.can_view_scenarios
            when 'audit'     then r.can_read_audit
            when 'global'    then r.global_scope
            else false
          end
  );
$$;

create or replace function app.log_security_event(p_event text, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.security_audit (user_id, event, detail)
  values ((select auth.uid()), p_event, coalesce(p_detail, '{}'::jsonb));
end;
$$;

revoke all on function app.is_admin(), app.allowed_region_ids(), app.has_capability(text), app.log_security_event(text, jsonb) from public, anon, authenticated;
grant execute on function app.is_admin(), app.allowed_region_ids(), app.has_capability(text) to anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.regions, public.products, public.sales, public.roles,
                public.profiles, public.user_roles, public.user_regions, public.security_audit
  to anon, authenticated;

alter table public.regions        enable row level security;
alter table public.products       enable row level security;
alter table public.sales          enable row level security;
alter table public.roles          enable row level security;
alter table public.profiles       enable row level security;
alter table public.user_roles     enable row level security;
alter table public.user_regions   enable row level security;
alter table public.security_audit enable row level security;

-- Sin politicas de INSERT, UPDATE o DELETE: la escritura queda denegada para
-- anon y authenticated. Solo service_role (servidor) puede administrar.

drop policy if exists regions_select on public.regions;
create policy regions_select on public.regions for select to anon, authenticated
  using (id = any (app.allowed_region_ids()));

drop policy if exists products_select on public.products;
create policy products_select on public.products for select to anon, authenticated
  using (true);

drop policy if exists sales_select on public.sales;
create policy sales_select on public.sales for select to anon, authenticated
  using (region_id = any (app.allowed_region_ids()));

drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles for select to anon, authenticated
  using (true);

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select to authenticated
  using (id = (select auth.uid()) or app.is_admin());

drop policy if exists user_roles_select_self on public.user_roles;
create policy user_roles_select_self on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or app.is_admin());

drop policy if exists user_regions_select_self on public.user_regions;
create policy user_regions_select_self on public.user_regions for select to authenticated
  using (user_id = (select auth.uid()) or app.is_admin());

drop policy if exists security_audit_select on public.security_audit;
create policy security_audit_select on public.security_audit for select to authenticated
  using (app.has_capability('audit'));
