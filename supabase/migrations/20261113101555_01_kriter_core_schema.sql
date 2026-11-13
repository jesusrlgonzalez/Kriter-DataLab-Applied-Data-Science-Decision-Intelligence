-- Kriter DataLab - Kriter Systems
-- Autor: Jesus R.L. Gonzalez - Derechos reservados (c) 2026
-- 01 Esquema relacional base. Datos sinteticos autorizados para publicacion.

create schema if not exists app;
revoke all on schema app from anon, authenticated;

create table if not exists public.regions (
  id         smallint generated always as identity primary key,
  code       text not null unique check (code ~ '^[A-Z]{3}$'),
  name       text not null unique,
  is_public  boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.regions is 'Areas comerciales. is_public marca el area de demostracion visible sin iniciar sesion.';

create table if not exists public.products (
  id        integer generated always as identity primary key,
  item_code text not null unique,
  name      text not null,
  segment   text not null,
  brand     text not null
);
create index if not exists products_segment_idx on public.products (segment);
create index if not exists products_brand_idx   on public.products (brand);

create table if not exists public.sales (
  id         bigint generated always as identity primary key,
  region_id  smallint not null references public.regions(id) on delete restrict,
  product_id integer  not null references public.products(id) on delete restrict,
  sale_date  date     not null,
  week_label text     not null,
  year       smallint not null,
  value      numeric(14,4) not null check (value >= 0),
  units      integer  not null check (units >= 0),
  constraint sales_grain_uniq unique (region_id, product_id, sale_date)
);
create index if not exists sales_region_date_idx on public.sales (region_id, sale_date);
create index if not exists sales_date_idx        on public.sales (sale_date);
create index if not exists sales_product_idx     on public.sales (product_id);
create index if not exists sales_region_year_idx on public.sales (region_id, year);
comment on table public.sales is 'Registros comerciales sinteticos reproducibles. No contienen informacion empresarial real.';

create table if not exists public.roles (
  id                 smallint generated always as identity primary key,
  code               text not null unique check (code in ('administrador','regional','analista','auditor')),
  name               text not null,
  description        text not null,
  global_scope       boolean not null default false,
  can_export         boolean not null default false,
  can_view_scenarios boolean not null default false,
  can_read_audit     boolean not null default false
);

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  created_at   timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id    uuid     not null references public.profiles(id) on delete cascade,
  role_id    smallint not null references public.roles(id)    on delete restrict,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.user_regions (
  user_id    uuid     not null references public.profiles(id) on delete cascade,
  region_id  smallint not null references public.regions(id)  on delete restrict,
  granted_at timestamptz not null default now(),
  primary key (user_id, region_id)
);

create table if not exists public.security_audit (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  user_id     uuid,
  event       text not null,
  detail      jsonb not null default '{}'::jsonb
);
create index if not exists security_audit_time_idx on public.security_audit (occurred_at desc);

create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
