-- Run as postgres in a development database; fixtures are rolled back.
begin;

create function pg_temp.assert_capacity_error(command text)
returns void language plpgsql as $$
begin
  begin
    execute command;
  exception when check_violation then return;
  end;
  raise exception 'Expected capacity constraint violation: %', command;
end;
$$;

do $$
begin
  execute format('grant usage on schema %I to authenticated', pg_my_temp_schema()::regnamespace);
end;
$$;

insert into auth.users(id) values ('00000000-0000-0000-0000-000000000011');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
insert into public.events(id, title, description, starts_at, location, capacity) values
  ('10000000-0000-0000-0000-000000000011', 'Limited', '', now(), 'Here', 100),
  ('10000000-0000-0000-0000-000000000012', 'Unlimited', '', now(), 'Here', null);

insert into public.ticket_types(id, event_id, name, capacity) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', 'General', 60),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000011', 'VIP', 40),
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000012', 'General', 200);

select pg_temp.assert_capacity_error($q$insert into public.ticket_types(event_id, name, capacity) values ('10000000-0000-0000-0000-000000000011', 'Extra', 1)$q$);
select pg_temp.assert_capacity_error($q$update public.ticket_types set capacity = 61 where name = 'General' and event_id = '10000000-0000-0000-0000-000000000011'$q$);
select pg_temp.assert_capacity_error($q$update public.events set capacity = 99 where title = 'Limited'$q$);
select pg_temp.assert_capacity_error($q$update public.events set capacity = 0 where title = 'Limited'$q$);
select pg_temp.assert_capacity_error($q$update public.events set capacity = 199 where title = 'Unlimited'$q$);
select pg_temp.assert_capacity_error($q$update public.ticket_types set event_id = '10000000-0000-0000-0000-000000000011' where event_id = '10000000-0000-0000-0000-000000000012'$q$);

-- Unchanged capacities do not double count the ticket being edited.
update public.ticket_types set name = 'VIP renamed' where name = 'VIP';
update public.ticket_types set capacity = 50 where id = '20000000-0000-0000-0000-000000000011';
update public.events set capacity = 90 where title = 'Limited';
delete from public.ticket_types where name = 'VIP renamed';
update public.events set capacity = 50 where title = 'Limited';
update public.events set capacity = null where title = 'Limited';
insert into public.ticket_types(event_id, name, capacity) values ('10000000-0000-0000-0000-000000000011', 'Extra', 1000);
update public.events set capacity = 1050 where title = 'Limited';

rollback;
