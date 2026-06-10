create extension if not exists pgcrypto;

create table if not exists public.capability_briefs (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  status text not null default 'new',
  requester_name text not null,
  requester_role text,
  requester_email text not null,
  organization_name text not null,
  team_size text not null,
  primary_need text not null,
  urgency text,
  budget_range text,
  decision_maker text,
  main_problem text not null,
  desired_outcome text not null,
  source text not null default 'capability-brief'
);

create or replace function public.set_capability_briefs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists capability_briefs_set_updated_at on public.capability_briefs;

create trigger capability_briefs_set_updated_at
before update on public.capability_briefs
for each row
execute function public.set_capability_briefs_updated_at();
