create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  description text not null,
  starts_at timestamptz not null,
  location text not null check (length(btrim(location)) > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name)
);

create index events_owner_id_idx on public.events(owner_id);
create index ticket_types_event_id_idx on public.ticket_types(event_id);

create function public.set_row_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    new.created_at := statement_timestamp();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke execute on function public.set_row_timestamps() from public, anon, authenticated;

create trigger events_set_timestamps
before insert or update on public.events
for each row execute function public.set_row_timestamps();

create trigger ticket_types_set_timestamps
before insert or update on public.ticket_types
for each row execute function public.set_row_timestamps();

alter table public.events enable row level security;
alter table public.ticket_types enable row level security;

revoke all on public.events, public.ticket_types from public, anon, authenticated;
grant select on public.events, public.ticket_types to anon;
grant select, insert, update, delete on public.events, public.ticket_types to authenticated;
grant all on public.events, public.ticket_types to service_role;

create policy events_read_published on public.events
for select to anon, authenticated
using (status = 'published');

create policy events_read_own on public.events
for select to authenticated
using (owner_id = (select auth.uid()));

create policy events_insert_own on public.events
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy events_update_own on public.events
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy events_delete_own on public.events
for delete to authenticated
using (owner_id = (select auth.uid()));

-- The parent event's SELECT policies also protect direct ticket type queries.
create policy ticket_types_read_visible_event on public.ticket_types
for select to anon, authenticated
using (exists (
  select 1 from public.events where events.id = ticket_types.event_id
));

create policy ticket_types_insert_own on public.ticket_types
for insert to authenticated
with check (exists (
  select 1 from public.events
  where events.id = ticket_types.event_id and events.owner_id = (select auth.uid())
));

create policy ticket_types_update_own on public.ticket_types
for update to authenticated
using (exists (
  select 1 from public.events
  where events.id = ticket_types.event_id and events.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.events
  where events.id = ticket_types.event_id and events.owner_id = (select auth.uid())
));

create policy ticket_types_delete_own on public.ticket_types
for delete to authenticated
using (exists (
  select 1 from public.events
  where events.id = ticket_types.event_id and events.owner_id = (select auth.uid())
));
