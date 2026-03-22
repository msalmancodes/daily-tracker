-- Daily Routine Tracker — Supabase Schema
-- Run this in your Supabase SQL editor

create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  submitted_at timestamptz default now(),
  prayers jsonb not null default '{"fajr":false,"dhuhr":false,"asr":false,"maghrib":false,"isha":false,"jumuah":false}',
  quran jsonb not null default '{"juz":0,"memorize":0,"recite":0}',
  learning jsonb not null default '{"reading":0,"broad":0,"iqbal":0,"rl":0,"scholar":0,"finance":0,"journaling":0}',
  health jsonb not null default '{"gym":0}',
  work jsonb not null default '{"office":0,"campus":0}',
  current_affairs boolean default false,
  notes text default '',
  ai_summary text default '',
  unique(user_id, date)
);

-- Run this if the table already exists:
-- alter table daily_logs add column if not exists ai_summary text default '';

-- quran jsonb now includes juz_number (int 1-30) and page (int 1-20) for cycle tracking

-- Row-Level Security
alter table daily_logs enable row level security;

create policy "Users can view own logs"
  on daily_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on daily_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on daily_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own logs"
  on daily_logs for delete
  using (auth.uid() = user_id);

-- Quran revision cycles
create table if not exists quran_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  cycle_number int not null,
  started_at date not null,
  completed_at date
);

alter table quran_cycles enable row level security;

create policy "Users can view own cycles"
  on quran_cycles for select using (auth.uid() = user_id);

create policy "Users can insert own cycles"
  on quran_cycles for insert with check (auth.uid() = user_id);

create policy "Users can update own cycles"
  on quran_cycles for update using (auth.uid() = user_id);
