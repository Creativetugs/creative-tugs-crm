-- Run this in Supabase → SQL Editor (your project already has the base schema)

alter table public.leads
  add column if not exists deal_amount numeric(12, 2);

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
create index if not exists projects_lead_id_idx on public.projects (lead_id);
create index if not exists project_assets_project_id_idx on public.project_assets (project_id);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_assets enable row level security;

drop policy if exists "projects_all_authenticated" on public.projects;
create policy "projects_all_authenticated"
  on public.projects for all to authenticated
  using (true) with check (true);

drop policy if exists "project_assets_all_authenticated" on public.project_assets;
create policy "project_assets_all_authenticated"
  on public.project_assets for all to authenticated
  using (true) with check (true);
