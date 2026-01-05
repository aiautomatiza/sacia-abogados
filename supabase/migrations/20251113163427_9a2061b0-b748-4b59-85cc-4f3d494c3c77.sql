-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  tenant_id uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- RLS policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create crm_contacts table
create table public.crm_contacts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null,
  numero text not null,
  nombre text,
  attributes jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, numero)
);

-- Enable RLS on crm_contacts
alter table public.crm_contacts enable row level security;

-- RLS policies for crm_contacts
create policy "Users can view their tenant contacts"
  on public.crm_contacts for select
  using (
    tenant_id = (select tenant_id from public.profiles where id = auth.uid())
  );

create policy "Users can insert their tenant contacts"
  on public.crm_contacts for insert
  with check (
    tenant_id = (select tenant_id from public.profiles where id = auth.uid())
  );

create policy "Users can update their tenant contacts"
  on public.crm_contacts for update
  using (
    tenant_id = (select tenant_id from public.profiles where id = auth.uid())
  );

create policy "Users can delete their tenant contacts"
  on public.crm_contacts for delete
  using (
    tenant_id = (select tenant_id from public.profiles where id = auth.uid())
  );

-- Create webhooks table
create table public.webhooks (
  id serial primary key,
  tenant_id uuid not null,
  webhook text not null,
  channel text not null check (channel in ('whatsapp', 'llamadas')),
  created_at timestamptz not null default now(),
  unique(tenant_id, channel)
);

-- Enable RLS on webhooks
alter table public.webhooks enable row level security;

-- RLS policies for webhooks
create policy "Users can view their tenant webhooks"
  on public.webhooks for select
  using (
    tenant_id = (select tenant_id from public.profiles where id = auth.uid())
  );

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, tenant_id)
  values (
    new.id,
    new.email,
    uuid_generate_v4()
  );
  return new;
end;
$$;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add triggers for updated_at
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_crm_contacts
  before update on public.crm_contacts
  for each row execute function public.handle_updated_at();