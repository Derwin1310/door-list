-- Run against a development database as postgres. All fixtures are rolled back.
begin;

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

create function pg_temp.assert_error(command text, expected_state text)
returns void language plpgsql as $$
begin
  begin
    execute command;
  exception when others then
    if SQLSTATE = expected_state then return; end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE % for %', expected_state, command;
end;
$$;

do $$
begin
  execute format('grant usage on schema %I to anon, authenticated', pg_my_temp_schema()::regnamespace);
end;
$$;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

insert into public.events (id, title, description, starts_at, location) values
  ('10000000-0000-0000-0000-000000000001', 'Draft A', '', '2030-01-01T20:00:00Z', 'Bogotá');
insert into public.events (id, title, description, starts_at, location, status) values
  ('10000000-0000-0000-0000-000000000002', 'Public A', '', '2030-01-01T20:00:00Z', 'Bogotá', 'published');
insert into public.ticket_types (id, event_id, name, capacity) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'General', 100),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'General', 50);

select pg_temp.assert_true((select status = 'draft' and owner_id = auth.uid() and created_at = updated_at from public.events where title = 'Draft A'), 'event defaults');
select pg_temp.assert_error($q$update public.events set owner_id = '00000000-0000-0000-0000-000000000002' where title = 'Draft A'$q$, '42501');
select pg_temp.assert_error($q$update public.events set status = 'invalid' where title = 'Draft A'$q$, '23514');
select pg_temp.assert_error($q$update public.events set title = ' ' where title = 'Draft A'$q$, '23514');
select pg_temp.assert_error($q$update public.events set location = ' ' where title = 'Draft A'$q$, '23514');
select pg_temp.assert_error($q$update public.ticket_types set capacity = 0$q$, '23514');
select pg_temp.assert_error($q$update public.ticket_types set capacity = -1$q$, '23514');
select pg_temp.assert_error($q$update public.ticket_types set name = ' '$q$, '23514');
select pg_temp.assert_error($q$insert into public.ticket_types (event_id, name, capacity) values ('10000000-0000-0000-0000-000000000001', 'General', 1)$q$, '23505');
select pg_temp.assert_error($q$insert into public.events (owner_id, title, description, starts_at, location) values ('00000000-0000-0000-0000-000000000002', 'Spoof', '', now(), 'Here')$q$, '42501');

reset role;
create temporary table saved_event as select * from public.events where title = 'Draft A';
create temporary table saved_ticket as select * from public.ticket_types where id = '20000000-0000-0000-0000-000000000001';
grant select on saved_event, saved_ticket to authenticated;

set local role authenticated;
update public.ticket_types set capacity = 99, created_at = '2000-01-01', updated_at = '2000-01-01'
where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select t.created_at = s.created_at and t.updated_at >= s.updated_at and t.updated_at = statement_timestamp() from public.ticket_types t cross join saved_ticket s where t.id = s.id), 'ticket timestamps maintained');
select pg_temp.assert_true((select e.updated_at = s.updated_at from public.events e cross join saved_event s where e.id = s.id), 'ticket update leaves parent timestamp unchanged');
update public.events set description = 'Updated', created_at = '2000-01-01', updated_at = '2000-01-01' where title = 'Draft A';
select pg_temp.assert_true((select e.created_at = s.created_at and e.updated_at >= s.updated_at and e.updated_at = statement_timestamp() from public.events e cross join saved_event s where e.id = s.id), 'event timestamps maintained');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.assert_true((select count(*) = 1 from public.events), 'visitors see only published events');
select pg_temp.assert_true((select count(*) = 1 from public.ticket_types), 'visitors cannot query draft ticket types directly');
select pg_temp.assert_error($q$insert into public.events (title, description, starts_at, location) values ('Visitor', '', now(), 'Here')$q$, '42501');
select pg_temp.assert_error($q$update public.events set title = 'Visitor'$q$, '42501');
select pg_temp.assert_error($q$delete from public.events$q$, '42501');
select pg_temp.assert_error($q$insert into public.ticket_types (event_id, name, capacity) values ('10000000-0000-0000-0000-000000000002', 'Visitor', 1)$q$, '42501');
select pg_temp.assert_error($q$update public.ticket_types set capacity = 1$q$, '42501');
select pg_temp.assert_error($q$delete from public.ticket_types$q$, '42501');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true((select count(*) = 1 from public.events), 'other organizer cannot read private event');
select pg_temp.assert_true((select count(*) = 1 from public.ticket_types), 'other organizer cannot read private ticket type');
with changed as (update public.events set title = 'Stolen' returning id)
select pg_temp.assert_true((select count(*) = 0 from changed), 'other organizer cannot update events');
with changed as (delete from public.events returning id)
select pg_temp.assert_true((select count(*) = 0 from changed), 'other organizer cannot delete events');
with changed as (update public.ticket_types set capacity = 1 returning id)
select pg_temp.assert_true((select count(*) = 0 from changed), 'other organizer cannot update ticket types');
with changed as (delete from public.ticket_types returning id)
select pg_temp.assert_true((select count(*) = 0 from changed), 'other organizer cannot delete ticket types');
select pg_temp.assert_error($q$insert into public.ticket_types (event_id, name, capacity) values ('10000000-0000-0000-0000-000000000002', 'Stolen', 1)$q$, '42501');
insert into public.events (id, title, description, starts_at, location, status) values
  ('10000000-0000-0000-0000-000000000003', 'Public B', '', now(), 'Here', 'published');
insert into public.ticket_types (id, event_id, name, capacity) values
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'General', 10);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_error($q$update public.ticket_types set event_id = '10000000-0000-0000-0000-000000000003' where id = '20000000-0000-0000-0000-000000000001'$q$, '42501');
with changed as (update public.ticket_types set event_id = '10000000-0000-0000-0000-000000000001' where id = '20000000-0000-0000-0000-000000000003' returning id)
select pg_temp.assert_true((select count(*) = 0 from changed), 'cannot take another organizers ticket type');
update public.events set status = 'published' where title = 'Draft A';
set local role anon;
select pg_temp.assert_true((select count(*) = 3 from public.events), 'publication makes event public');
select pg_temp.assert_true((select count(*) = 3 from public.ticket_types), 'publication makes ticket types public');

set local role authenticated;
update public.events set status = 'draft' where title = 'Draft A';
set local role anon;
select pg_temp.assert_true((select count(*) = 2 from public.events), 'unpublication hides event');
select pg_temp.assert_true((select count(*) = 2 from public.ticket_types), 'unpublication hides ticket types');

reset role;
select pg_temp.assert_error($q$delete from auth.users where id = '00000000-0000-0000-0000-000000000001'$q$, '23503');
select pg_temp.assert_error($q$insert into public.ticket_types (event_id, name, capacity) values ('10000000-0000-0000-0000-000000000099', 'Missing', 1)$q$, '23503');
set local role authenticated;
delete from public.ticket_types where id = '20000000-0000-0000-0000-000000000002';
delete from public.events where title = 'Draft A';
reset role;
select pg_temp.assert_true(not exists (select 1 from public.ticket_types where event_id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')), 'owner deletes ticket types and event deletion cascades');
select pg_temp.assert_true((select count(*) = 1 from public.ticket_types), 'other organizers ticket type survives');

rollback;
