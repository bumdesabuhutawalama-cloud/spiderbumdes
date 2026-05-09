create table if not exists public.coa_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type text not null,
  normal_balance text not null,
  entry_type text not null,
  status text not null default 'Aktif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coa_accounts_code_idx on public.coa_accounts (code);
create index if not exists coa_accounts_type_idx on public.coa_accounts (type);

alter table public.coa_accounts enable row level security;

create policy "coa_accounts_public_read"
  on public.coa_accounts for select
  using (true);

create policy "coa_accounts_auth_insert"
  on public.coa_accounts for insert
  to authenticated
  with check (true);

create policy "coa_accounts_auth_update"
  on public.coa_accounts for update
  to authenticated
  using (true) with check (true);

create policy "coa_accounts_auth_delete"
  on public.coa_accounts for delete
  to authenticated
  using (true);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists coa_accounts_updated_at on public.coa_accounts;
create trigger coa_accounts_updated_at
  before update on public.coa_accounts
  for each row execute function public.set_updated_at();