<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Documentation and Decisions

- When starting a task, read [RULES.md](RULES.md), which directs you to the relevant documents in `docs/`, before making decisions or requesting confirmation.
- For product decisions, consult [docs/PRODUCT.md](docs/PRODUCT.md); for design decisions, also consult [docs/DESIGN.md](docs/DESIGN.md). Reuse confirmed decisions without asking again.
- Store all new project Markdown documentation inside `docs/`, including architecture and framework documentation. Keep `AGENTS.md`, `README.md`, and `RULES.md` as root-level entry points.
- Write all project Markdown documentation and agent instructions in English, including future additions. Preserve proper names, code, commands, and exact UI labels when quoting them.
- The documentation paths specified here override default locations suggested by skills. Do not recreate PRODUCT.md or DESIGN.md at the root.

## Project Approvals

- The owner authorizes file edits within this project folder without additional confirmation.
- Request explicit approval before running any command that accesses a database, including read-only queries, or modifies it (including migrations, seeds, and resets).
- Request explicit approval before installing, adding, or updating dependencies, including through scripts or tools that install them automatically.
- Inspect scripts before running them to identify database access or dependency installation. Do not bundle these operations with authorized commands to bypass approval.
- Permission to edit files does not authorize the operations above; code changes and migration files may be prepared without applying them to a database.
