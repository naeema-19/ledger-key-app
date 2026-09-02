-- ============================================================
-- Ledger & Key — initial schema, roles, and Row Level Security
-- Run this once in Supabase: Dashboard → SQL Editor → New query
-- ============================================================

-- ---------- Tables ----------

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  rent numeric not null default 0,
  bedrooms int,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  property_id uuid references public.properties(id) on delete set null,
  phone text,
  lease_start date,
  lease_end date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  amount numeric not null default 0,
  status text not null default 'due' check (status in ('paid','due','overdue')),
  paid_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  issue text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','in-progress','resolved')),
  created_by text not null check (created_by in ('owner','tenant')),
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  related_to text not null check (related_to in ('tenant','property')),
  related_id uuid not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'tenant' check (role in ('owner','tenant')),
  tenant_id uuid references public.tenants(id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

-- ---------- New-user handling ----------
-- First person ever to sign up becomes 'owner'. Everyone after that becomes
-- 'tenant', and gets auto-linked to a tenants row if their email matches one
-- the owner already added.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_first boolean;
  matched_tenant uuid;
begin
  select not exists(select 1 from public.profiles where role = 'owner') into is_first;

  if is_first then
    insert into public.profiles (id, role, full_name)
    values (new.id, 'owner', coalesce(new.raw_user_meta_data->>'full_name', new.email));
  else
    select id into matched_tenant from public.tenants where lower(email) = lower(new.email) limit 1;
    insert into public.profiles (id, role, tenant_id, full_name)
    values (new.id, 'tenant', matched_tenant, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- If the owner adds a tenant row AFTER that person already has an account,
-- link them automatically the next time this runs (call manually if needed):
create or replace function public.relink_tenant_profiles()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles p
  set tenant_id = t.id
  from auth.users u
  join public.tenants t on lower(t.email) = lower(u.email)
  where p.id = u.id and p.role = 'tenant' and p.tenant_id is null;
end;
$$;

-- ---------- Helper functions for RLS ----------

create or replace function public.is_owner()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

create or replace function public.current_tenant_id()
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

-- ---------- Enable RLS ----------

alter table public.properties enable row level security;
alter table public.tenants enable row level security;
alter table public.payments enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.documents enable row level security;
alter table public.profiles enable row level security;

-- ---------- Policies: profiles ----------

create policy "read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_owner());

create policy "owner manages profiles" on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------- Policies: properties ----------

create policy "owner full access properties" on public.properties
  for all using (public.is_owner()) with check (public.is_owner());

create policy "tenant reads own property" on public.properties
  for select using (id = public.current_tenant_id() or id in (select property_id from public.tenants where id = public.current_tenant_id()));

-- ---------- Policies: tenants ----------

create policy "owner full access tenants" on public.tenants
  for all using (public.is_owner()) with check (public.is_owner());

create policy "tenant reads own record" on public.tenants
  for select using (id = public.current_tenant_id());

-- ---------- Policies: payments ----------

create policy "owner full access payments" on public.payments
  for all using (public.is_owner()) with check (public.is_owner());

create policy "tenant reads own payments" on public.payments
  for select using (tenant_id = public.current_tenant_id());

-- ---------- Policies: maintenance_requests ----------

create policy "owner full access maintenance" on public.maintenance_requests
  for all using (public.is_owner()) with check (public.is_owner());

create policy "tenant reads own maintenance" on public.maintenance_requests
  for select using (tenant_id = public.current_tenant_id());

create policy "tenant inserts own maintenance" on public.maintenance_requests
  for insert with check (tenant_id = public.current_tenant_id() and created_by = 'tenant');

-- ---------- Policies: documents ----------

create policy "owner full access documents" on public.documents
  for all using (public.is_owner()) with check (public.is_owner());

create policy "tenant reads own documents" on public.documents
  for select using (
    (related_to = 'tenant' and related_id = public.current_tenant_id())
    or (related_to = 'property' and related_id = (select property_id from public.tenants where id = public.current_tenant_id()))
  );

-- ============================================================
-- Done. Next: create your Owner account by signing up in the app
-- with your own email — the trigger above makes the first signup
-- the Owner automatically.
-- ============================================================
