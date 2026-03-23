-- ComplyHub database schema
-- Run this in the Supabase SQL editor to initialise the database

-- Enable Row Level Security on all tables

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan_type text not null default 'starter' check (plan_type in ('starter', 'business', 'accountant')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own record"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own record"
  on public.users for update
  using (auth.uid() = id);


create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_name text not null,
  company_number text not null,
  industry text,
  employee_count integer,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create policy "Users can manage own companies"
  on public.companies for all
  using (auth.uid() = user_id);


create table if not exists public.compliance_scores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.compliance_scores enable row level security;

create policy "Users can read scores for own companies"
  on public.compliance_scores for select
  using (
    exists (
      select 1 from public.companies
      where companies.id = compliance_scores.company_id
        and companies.user_id = auth.uid()
    )
  );


create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  description text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  due_date date,
  created_at timestamptz not null default now()
);

alter table public.alerts enable row level security;

create policy "Users can read alerts for own companies"
  on public.alerts for select
  using (
    exists (
      select 1 from public.companies
      where companies.id = alerts.company_id
        and companies.user_id = auth.uid()
    )
  );


create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  policy_type text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.policies enable row level security;

create policy "Users can manage policies for own companies"
  on public.policies for all
  using (
    exists (
      select 1 from public.companies
      where companies.id = policies.company_id
        and companies.user_id = auth.uid()
    )
  );
