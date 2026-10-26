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
- The public header links to the organizer workspace. Event rows include each ticket type's capacity followed by its name, or “Sin entradas”. They use columns on desktop and stacked information on mobile.
- Editors start closed; open one event with “Editar”. Successful saves of existing events close the editor. Creating an event with a total capacity keeps its saved editor open for optional ticket creation; the organizer can close it without adding tickets. Creating an event without a total capacity closes the editor. “Crear evento” always starts a fresh form. Existing event values are loaded when editing.
- Event details and ticket management sit side by side on large screens. Existing ticket types are listed without forms; only one ticket edit form opens at a time. Successful ticket creation clears its inputs and returns focus to its name field; successful ticket edits close their form.
- Drafts are private. Published events and their ticket types are publicly readable through the existing RLS policies. Listing in the organizer panel explicitly filters by owner even when other events are published.
- Dates are entered and displayed in the device's timezone and stored as UTC instants.
- The date/time field occupies a full form row and accepts only today or a later day in the device's timezone. The native minimum refreshes on focus and payload validation checks the boundary again at submission. Earlier times on the current day remain valid. Editing a past event requires updating its date before saving.
- Total event capacity is optional. Ticket capacity must be a positive PostgreSQL integer. Equal totals are allowed; over-allocation and reducing the event limit below the assigned total are rejected with actionable UI feedback. Increasing a limit or removing it is allowed. Existing events have no limit until edited.
- The new migration checks these rules in database triggers, including direct API requests. Ticket inserts and updates lock the parent event row before summing allocations, serializing them with other allocations and event-limit updates under the default READ COMMITTED isolation. Conflicting transactions may fail and should be retried. The database remains authoritative when the panel has stale data.
- Failed saves preserve form contents. Successful writes reload the event list. If reloading fails, editing is suspended until the page is reloaded to avoid continuing with stale capacities.
- Form errors appear at the form that failed, including errors returned by the database. Ticket capacity fields display remaining allocation limits, flag excess immediately, and disable submission while over the limit. A fully allocated event shows recovery instructions instead of offering another ticket creation form. The capacity budget uses saved event data; save a higher limit before assigning more tickets.

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

The organizer UX refinement was verified in an isolated local copy using an in-memory Supabase substitute, with no credentials or database connection. Browser checks covered desktop and mobile layouts, names in event rows, initially closed editors, clean new-event forms, event creation and edit defaults, closing after event saves, one ticket edit form at a time, ticket creation resets and focus, over-limit prevention, exact-limit allocation, fully allocated events, and inline server-error feedback with retained values. These checks verify the UI behavior; they do not repeat real Supabase integration or concurrency testing.

Refinement validation passed: ESLint, TypeScript, the four Node validation tests, and the standard `pnpm build` using Turbopack and Tailwind. This build succeeded with the required process permissions; the earlier sandboxed Turbopack stall was not reproduced.

The subsequent per-type capacity labels and optional ticket-creation continuation were implemented without running tests, lint, builds, or browser checks, at the owner's request. Manual verification is pending.

The later compact ticket labels and minimum event date were also implemented without running tests, lint, builds, or browser checks. The supplied screenshot could not be opened because of macOS file permissions; the row refinement was based on the existing event list implementation. Manual verification is pending.
