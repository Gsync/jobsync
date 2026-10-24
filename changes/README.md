# Release note fragments

Every user-facing change adds one file here, `<slug>.<type>.md`, holding one capitalized sentence written for users. The slug is lowercase kebab-case; the type is one of:

- `breaking`: `drop-sqlite.breaking.md` → `Remove support for SQLite databases.`
- `feat`: `company-notes.feat.md` → `Add notes to companies.`
- `fix`: `job-sort.fix.md` → `Fix the jobs list losing its sort after a status change.`
- `other`: `node-24.other.md` → `Build release images with Node 24.`

Nothing else belongs here: no subdirectories and no other files, or the release stops. Within a section, fragments are sorted by slug, so a numeric prefix (`01-contacts`) sets the order.

Edit, rename, merge or delete fragments freely until the release. Preview the notes with `npm run release:notes`. The release commit deletes the fragments it shipped, and a release with no fragments fails.

Merge conflicts: an add/add conflict means two branches picked the same name, so rename one. A modify/delete conflict means the fragment already shipped, so keep it deleted.
