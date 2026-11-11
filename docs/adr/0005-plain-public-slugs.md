# 0005: Plain public slugs, no share tokens

Status: accepted (2026-11-11)

## Context

Collections are shared through a public have/want page. The alternative was unguessable, regenerable tokens per list.

## Decision

- Public URLs are plain: `/vinyl`, `/vinyl/want`.
- Each collection has an `is_public` toggle, **off by default**. Private or unknown slugs return 404.
- `/` lists the public collections.
- Slugs are generated from the name, unique, editable, with no redirect from old slugs.

## Consequences

- Anyone can guess `/lego`. "Public" means public; the toggle is the access control.
- Renaming a slug breaks links already shared. Accepted for a personal app.
- Reserved slugs must not collide with app routes: `admin`, `setup`, `uploads`, `api`, `locale`, `assets`.
- Field-level privacy (`is_public` per field) covers sensitive data such as purchase price.
