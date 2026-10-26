# Organizer Panel

`/organizador` uses the installed `@supabase/supabase-js` browser client. Sign-in uses email and password; the SDK persists and refreshes the browser session and the panel responds to auth changes. Private event data is fetched only after `getUser()` confirms the account. Ownership is enforced by the existing RLS policies on every request, including requests made outside the UI. No service-role key is used. Auth state callbacks only update React state; queries run outside the callbacks to avoid auth lock contention. See [Supabase auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) and [React integration](https://supabase.com/docs/guides/getting-started/tutorials/with-react).

## Setup

Create `.env.local` (ignored by Git) with values from the intended Supabase project's API settings:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Use a publishable key (or legacy anon key), never a secret or service-role key. Restart development after setting these values; production builds embed public environment variables and must be rebuilt when they change. The unconfigured panel displays a setup notice.

Enable email/password authentication and provision confirmed organizer accounts in Supabase Auth. There is no public signup or account recovery UI in this change. Every authenticated account can manage its own events; no additional organizer role is required by the current schema.

Both migrations in `supabase/migrations/` are required. Request explicit owner approval before any database command, including inspecting migration status, dry runs, applying migrations, or running SQL tests. Do not run dependency installers as part of setup without approval.

## Behavior

- Create, list, edit, publish/unpublish, and delete owned events. Event deletion cascades to ticket types, with confirmation before deletion.
- Create, list, edit, and delete ticket types within the selected event. Deletion requires confirmation.
- Drafts are private. Published events and their ticket types are publicly readable through the existing RLS policies. Listing in the organizer panel explicitly filters by owner even when other events are published.
- Dates are entered and displayed in the device's timezone and stored as UTC instants.
- Total event capacity is optional. Ticket capacity must be a positive PostgreSQL integer. Equal totals are allowed; over-allocation and reducing the event limit below the assigned total are rejected with actionable UI feedback. Increasing a limit or removing it is allowed. Existing events have no limit until edited.
- The new migration checks these rules in database triggers, including direct API requests. Ticket inserts and updates lock the parent event row before summing allocations, serializing them with other allocations and event-limit updates under the default READ COMMITTED isolation. Conflicting transactions may fail and should be retried. The database remains authoritative when the panel has stale data.
- Failed saves preserve form contents. Successful writes reload the event list. If reloading fails, editing is suspended until the page is reloaded to avoid continuing with stale capacities.

## Validation

Commands without database access or dependency installation:

```sh
node --test app/organizador/validation.test.mjs
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

With explicit approval, run the existing ownership/permissions regression suite and the capacity suite against a development database with both migrations applied:

```sh
pnpm exec supabase db query --local --file supabase/tests/events_and_ticket_types.sql
pnpm exec supabase db query --local --file supabase/tests/event_capacity.sql
```

Both SQL suites roll back their fixtures. For concurrency verification, create an event limited to 100 with no ticket types, start a transaction in session A, insert a type with capacity 60, and leave it uncommitted. In session B, insert another type with capacity 60 for the same event. B must wait; after A commits, B must fail with SQLSTATE `23514`. Also check that lowering the event capacity to 50 while A holds the allocation lock waits and fails after A commits. These checks require explicit database approval too.

With configured Supabase, verify sign-in errors, session persistence and logout; CRUD with two organizer accounts; direct API rejection of cross-owner writes; capacity boundaries; failed-save form retention; and mobile/keyboard operation. The public landing page remains a fixed event and does not display organizer-created events.

Implementation checks passed: four Node validation tests, ESLint, TypeScript, and `pnpm exec next build --webpack`. The default Turbopack build stalled during compilation and was interrupted.

With explicit owner approval, migration `20261026210000_event_capacity.sql` was applied to the linked project `door-list-db` (`esvuuaiqanixpakosuxy`). A dry run confirmed that only this migration was pending; Vault, seeds, and roles were excluded. Local and remote migration histories now match. Both SQL suites passed with rolled-back fixtures. The ownership suite's expected SQLSTATE for deleting a referenced user was corrected to `23503`, matching the database's foreign-key violation.

Local `.env.local` now contains the project's public URL and public API key and remains ignored by Git. Browser verification confirmed that the configured panel displays the email/password sign-in form. Concurrency checks and authenticated UI verification remain pending; no organizer credentials were supplied and no persistent test accounts were created.
