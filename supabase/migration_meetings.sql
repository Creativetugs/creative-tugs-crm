-- Run in Supabase → SQL Editor (Option A: upsell meetings on projects)

alter table public.projects
  add column if not exists next_meeting_date date;

alter table public.projects
  add column if not exists next_meeting_about text;

alter table public.projects
  add column if not exists meeting_notes text not null default '';
