# Commit and Push Conventions

## Message Format

Write commit subjects and bodies in English. Follow the existing history: a descriptive subject in the imperative, without a required Conventional Commits prefix. Prefer a subject under 72 characters and omit the final period.

Examples:

```text
Add Supabase organizer dashboard with event and ticket type CRUD
Improve organizer workflows and ticket capacity visibility
Fix event date validation in the device timezone
```

For changes spanning multiple behaviors, add a body separated from the subject by a blank line. Explain the resulting behavior and why it matters. Include material validation results or limitations, and distinguish earlier checks from verification of the final changes. If the owner requests no tests, honor that request and state that tests were not run.

## Scope and Staging

- Group related changes into one coherent commit. Include the code, removed files, assets, and documentation needed for that change.
- Review `git status`, the diff, the current branch, and the configured remote before staging.
- Stage explicit paths rather than using `git add .` when unrelated local files are present.
- Review the staged diff before committing. Include intended deletions.
- Keep environment files, credentials, Supabase connection metadata, generated output, temporary previews, and unrelated local tool settings out of commits.
- Preserve the established Spanish UI labels; English commit messages do not require translating the product.

## Commit and Push

Create commits and push only when authorized by the owner. Use the existing branch and configured remote unless instructed otherwise. Do not force-push or rewrite published history without explicit authorization.

For example, after staging the intended files:

```sh
git diff --cached --stat
git commit -m "Improve organizer workflows and ticket capacity visibility" -m "Describe the resulting behavior and any verification limitations."
git push origin main
git status --short
```

`origin main` reflects the current project setup; verify it before reusing the example. Confirm that the push succeeded and report the commit identifier and branch. Mention any intentionally excluded local files when relevant. Database access and dependency installation still require the separate approvals described in [AGENTS.md](../AGENTS.md).
