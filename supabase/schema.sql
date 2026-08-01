-- Creative Tugs CRM schema
-- Run this once in Supabase → SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  job_title text,
  email text not null,
  phone text,
  website text not null,
  industry text not null,
  city text,
  country text not null default 'USA',
  lead_source text not null,
  website_platform text,
  status text not null default 'new_lead',
  mockup_link text,
  portfolio_sent boolean not null default false,
  outreach_date date,
  last_follow_up date,
  next_follow_up date,
  notes text not null default '',
  deal_amount numeric(12, 2),
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  type text not null check (type in ('email', 'whatsapp', 'call', 'note', 'status_change')),
  content text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_assigned_to_idx on public.leads (assigned_to);
create index if not exists leads_next_follow_up_idx on public.leads (next_follow_up);
create index if not exists activities_lead_id_idx on public.activities (lead_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case
      when (select count(*) from public.profiles) = 0 then 'admin'
      else 'member'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;

-- Small team: any signed-in employee can read/write shared CRM data
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated using (true);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "leads_all_authenticated"
  on public.leads for all to authenticated
  using (true) with check (true);

create policy "activities_all_authenticated"
  on public.activities for all to authenticated
  using (true) with check (true);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lead_id uuid references public.leads (id) on delete set null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'in_review', 'delivered', 'on_hold')),
  assigned_to uuid references public.profiles (id) on delete set null,
  deal_amount numeric(12, 2),
  start_date date,
  due_date date,
  notes text not null default '',
  next_meeting_date date,
  next_meeting_about text,
  meeting_notes text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_assigned_to_idx on public.projects (assigned_to);
create index if not exists project_assets_project_id_idx on public.project_assets (project_id);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_assets enable row level security;

create policy "projects_all_authenticated"
  on public.projects for all to authenticated
  using (true) with check (true);

create policy "project_assets_all_authenticated"
  on public.project_assets for all to authenticated
  using (true) with check (true);

create table if not exists public.project_services (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  amount numeric(12, 2) not null default 0,
  status text not null default 'sold'
    check (status in ('planned', 'sold', 'in_progress', 'done')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists project_services_project_id_idx
  on public.project_services (project_id);

alter table public.project_services enable row level security;

create policy "project_services_all_authenticated"
  on public.project_services for all to authenticated
  using (true) with check (true);
