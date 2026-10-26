-- Existing events retain unlimited capacity until their owner sets a limit.
alter table public.events add column capacity integer check (capacity > 0);

create function public.check_ticket_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_limit integer;
  assigned bigint;
begin
  -- Serialize allocations with each other and with changes to the event limit.
  select capacity into event_limit from public.events where id = new.event_id for update;
  if event_limit is not null then
    select coalesce(sum(capacity), 0) into assigned
      from public.ticket_types where event_id = new.event_id and id <> new.id;
    if assigned + new.capacity > event_limit then
      raise exception 'Ticket capacities exceed event capacity' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create function public.check_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.capacity is not null and new.capacity < (
    select coalesce(sum(capacity), 0) from public.ticket_types where event_id = new.id
  ) then
    raise exception 'Event capacity is below assigned ticket capacities' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_ticket_capacity(), public.check_event_capacity() from public, anon, authenticated;

create trigger ticket_types_check_capacity
before insert or update on public.ticket_types
for each row execute function public.check_ticket_capacity();

create trigger events_check_capacity
before update of capacity on public.events
for each row execute function public.check_event_capacity();
