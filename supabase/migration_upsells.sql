-- Run in Supabase → SQL Editor (adds upsells/services on projects)

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

drop policy if exists "project_services_all_authenticated" on public.project_services;
create policy "project_services_all_authenticated"
  on public.project_services for all to authenticated
  using (true) with check (true);
