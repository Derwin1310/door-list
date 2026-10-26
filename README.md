# Doorlist

An events and ticketing platform scaffold built with Next.js App Router, TypeScript, and Tailwind CSS 4.

## Development

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Validation

```sh
pnpm lint
pnpm build
```

The public page `/` presents the fixed event in `app/page.tsx`. “Regístrame” expands the registration status (not available yet) and offers a calendar download. `/organizador` provides Supabase email/password sign-in and CRUD for the organizer's events and ticket types. See [organizer setup and validation](docs/ORGANIZER.md). Tables and access policies are defined in `supabase/migrations/`.

Read [documentation and decision rules](RULES.md) at the root for guidance on consulting [product context](docs/PRODUCT.md), [visual design guide](docs/DESIGN.md), and other documents in `docs/`. Add future project documentation there as well. Write all project Markdown documentation in English. Fonts are served locally, with their licenses in `public/fonts/`. If the fixed public event details change, update `public/events/doorlist-sessions.ics` as well.

## Supabase

The `@supabase/supabase-js` client is installed. The migration creates `events` and
`ticket_types`, with RLS, integrity constraints, and automatic timestamps.
Organizers manage their own events; visitors can only read published events and
their ticket types. Drafts may have no ticket types; publishing does not require
a minimum number. An optional event capacity limits the sum of ticket type capacities; changes that exceed it are rejected. Capacity does not control bookings yet.

To apply migrations to your project:

```sh
pnpm exec supabase login
pnpm exec supabase projects list
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
pnpm exec supabase migration list
```

Before applying migrations, verify that the linked project is correct and that the
dry run includes only the expected migrations. Do not commit credentials to Git.

The SQL tests check permissions, organizer isolation, publishing, constraints,
timestamps, and deletion. Run them as `postgres` in a development database with
the migrations applied; all test data is rolled back:

```sh
pnpm exec supabase db query --local --file supabase/tests/events_and_ticket_types.sql
```
