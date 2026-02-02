-- Enable PostGIS
create extension if not exists postgis;

-- Create Profiles Table (extends Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  role text check (role in ('customer', 'contractor')) not null,
  full_name text,
  phone text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Create Contractors Table
create table contractors (
  id uuid references profiles(id) primary key,
  company_name text not null,
  org_nr text,
  service_radius_km int default 20,
  -- Store location as a geography point (Long, Lat)
  location geography(POINT), 
  services jsonb default '[]'::jsonb, -- e.g. ["plumbing", "electrical"]
  is_available boolean default true
);

alter table contractors enable row level security;

-- Create Jobs Table
create table jobs (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references profiles(id) not null,
  description_raw text,
  structured_data jsonb, -- AI extracted data
  location_address text,
  location geography(POINT),
  price_min int,
  price_max int,
  stripe_payment_intent_id text,
  status text check (status in ('draft', 'pending_contractor', 'assigned', 'completed', 'cancelled', 'manual_review')) default 'draft',
  created_at timestamptz default now()
);

alter table jobs enable row level security;

-- Create Job Offers Table (Routing)
create table job_offers (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references jobs(id) not null,
  contractor_id uuid references contractors(id) not null,
  status text check (status in ('pending', 'accepted', 'declined', 'expired')) default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table job_offers enable row level security;

-- RLS Policies (Basic Draft)

-- Profiles: Users can read their own profile.
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Contractors: Public read (for routing/searching), Owner write
create policy "Contractors are viewable by everyone" on contractors
  for select using (true);

create policy "Contractors can update own data" on contractors
  for update using (auth.uid() = id);

-- Jobs: Customer can CRUD own jobs. Contractors can view assigned jobs.
create policy "Customers can manage own jobs" on jobs
  for all using (auth.uid() = customer_id);

create policy "Contractors can view jobs offered to them" on jobs
  for select
  using (
    exists (
      select 1 from job_offers
      where job_offers.job_id = jobs.id
      and job_offers.contractor_id = auth.uid()
    )
  );

-- Job Offers: Contractors can view/update offers for them.
create policy "Contractors can view own offers" on job_offers
  for select using (contractor_id = auth.uid());

create policy "Contractors can update own offers" on job_offers
  for update using (contractor_id = auth.uid());
