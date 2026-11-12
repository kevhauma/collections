# TICKET-PLAT-04: Docker image and deployment notes

- **Area:** Platform
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack) (Deploy row), [technical-design.md § Auth and security](../../technical-design.md#auth-and-security) (TLS)

## User story

As the owner, I want one Docker image with a single data volume, so I can run the app on my own server and back it
up by backing up one folder.

## Description

A multi-stage Dockerfile, an example compose file, and a short deploy guide covering the reverse proxy, the data
volume and password recovery.

## Current situation (as-is)

- The app runs with `npm start` locally (TICKET-PLAT-02) and creates its DB in `DATA_DIR` (TICKET-PLAT-03).

## Desired result (to-be)

- `Dockerfile`:
  - build stage: `npm ci`, `npm run build`, prune dev dependencies
  - runtime stage: `node:<pinned-lts>-slim` (glibc for `sharp` and `better-sqlite3` prebuilds), running as the
    non-root `node` user, with `ENV DATA_DIR=/data`, `VOLUME /data`, `EXPOSE 3000` and a `HEALTHCHECK` on `/healthz`
- `.dockerignore` excludes `node_modules`, `data`, `.git` and docs.
- `docker-compose.example.yml` with the volume, `PORT` and `TRUST_PROXY`.
- `docs/platform/deploy.md` covering:
  - running and upgrading the container
  - what lives in `/data` (`db.sqlite`, `uploads/`) and that this volume is the backup target
  - reverse proxy requirements: TLS, forwarding `X-Forwarded-Proto` / `X-Forwarded-For`, setting `TRUST_PROXY`
    so the `Secure` cookie and rate limiting see the real scheme and IP
  - password recovery command (filled in by TICKET-AUTH-03)

## UI requirements

- None.

## Acceptance criteria

- [x] `docker build` produces an image that starts and passes its healthcheck. (Docker 27.3: `docker build -t
      collections:plat04 .` → 386 MB image; the container reports `healthy` with exit code 0; `/healthz` 200, `/` serves
      the Dutch shell, `/nope` 404)
- [x] Data in `/data` survives `docker compose down && up`. (`docker-compose.example.yml`, project `plat04test`:
      inserted a `survivor` collection, `down`, `up` → the row is still there and the container is healthy again)
- [x] ~~`sharp` and `better-sqlite3` load~~ `better-sqlite3` loads in the runtime image (exercised by the healthcheck plus one image upload
      once TICKET-ITM-04 lands). (better-sqlite3: the healthcheck queries the DB, and `docker exec … node` opened
      `/data/db.sqlite` (SQLite 3.54.1, `user_version` 1). `sharp` isn't a dependency yet, so its check moved to a
      criterion on TICKET-ITM-04, approved 2026-11-12)
- [x] The process runs as a non-root user and `/data` is writable by it. (`id` → `uid=1000(node)`, PID 1 `Uid: 1000`;
      `/data` owned by `node:node`, `touch /data/probe` succeeded, and the DB and WAL files are created by `node`)
- [x] `docs/platform/deploy.md` exists and covers the points above. (run and upgrade, `/data` contents and backup,
      reverse proxy TLS / forwarded headers / `TRUST_PROXY` with Caddy and nginx examples, password recovery command.
      A note on TICKET-AUTH-03 says the runtime image must copy its script)

## Notes

- Needs TICKET-PLAT-02 and TICKET-PLAT-03. Can ship any time after them; the image grows with the app.
- No CI pipeline is in scope. Building on the server is fine for a personal app.
