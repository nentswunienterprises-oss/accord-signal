create table if not exists public.document_composer_drafts (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  document_type text not null default 'letter',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists document_composer_drafts_updated_at_idx
  on public.document_composer_drafts (updated_at desc);

alter table public.document_composer_drafts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'document_composer_drafts'
      and policyname = 'service_role_full_access_document_composer_drafts'
  ) then
    create policy service_role_full_access_document_composer_drafts
      on public.document_composer_drafts
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end
$$;

create or replace function public.set_document_composer_drafts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists document_composer_drafts_set_updated_at
  on public.document_composer_drafts;

create trigger document_composer_drafts_set_updated_at
before update on public.document_composer_drafts
for each row
execute function public.set_document_composer_drafts_updated_at();
