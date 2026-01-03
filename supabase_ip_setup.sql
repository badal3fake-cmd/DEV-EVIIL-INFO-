-- Create a table to track usage per IP
create table if not exists public.ip_usage (
  ip_address text primary key,
  search_count int default 0,
  last_reset_date date default current_date
);

-- Enable Row Level Security (RLS)
alter table public.ip_usage enable row level security;

-- Drop policy if it exists to prevent errors when re-running
drop policy if exists "Allow anonymous access to ip_usage" on public.ip_usage;

-- Create a policy to allow anyone (anon) to select their own IP data
create policy "Allow anonymous access to ip_usage"
on public.ip_usage
for all
to anon
using (true)
with check (true);

-- Grant access to the anon role (standard for public Supabase clients)
grant all on public.ip_usage to anon;
grant all on public.ip_usage to authenticated;
