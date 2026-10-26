# Documentation and Decision Rules

## Reference Documents

Before making a decision or requesting confirmation about product, design, or implementation, consult the relevant documents in `docs/`:

- [PRODUCT.md](docs/PRODUCT.md): product purpose, scope, capabilities, constraints, and open decisions.
- [DESIGN.md](docs/DESIGN.md): visual identity, typography, composition, interaction, and accessibility.
- [COMMITS.md](docs/COMMITS.md): commit messages, staging scope, and authorized push workflow.
- Architecture, framework, and other documents added in the future.

Reuse documented decisions without requesting confirmation again. Ask the owner when missing information would materially change the outcome, or when contradictions cannot be resolved using the owner's current instructions and the code. Do not treat assumptions as confirmed decisions.

## File Location and Language

Keep all new project documentation in Markdown inside `docs/`: product, design, architecture, frameworks, technical decisions, guides, and plans. Use subfolders within `docs/` when they help organize the content.

Keep `AGENTS.md` at the root as the entry point for agents, `README.md` as the repository introduction, and `RULES.md` as the guide to consulting and maintaining project documentation. These are the exceptions to this structure; they should link to `docs/` for detailed documentation. Do not duplicate documents or create root-level copies of PRODUCT.md or DESIGN.md, even if a skill suggests that location.

Write all project Markdown documentation and agent instructions in English, including future additions. Preserve proper names, code, commands, and exact UI labels when quoting them.

## Maintenance

- Read these rules when starting a task, then read only the relevant documents.
- Update the existing document when a decision changes instead of creating conflicting versions.
- Record confirmed decisions and distinguish them from proposals or open questions.
- Update links and references when moving or renaming files.
- Treat code paths written in backticks as relative to the project root unless otherwise specified. Markdown links are relative to the file containing them.
- Follow the owner's current instructions and the approval rules in `AGENTS.md`.
