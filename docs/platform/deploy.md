# Deploying Collections

One Docker image, one data volume, behind your own TLS reverse proxy. Built from the repository's
[Dockerfile](../../Dockerfile). Ticket: [TICKET-PLAT-04](tickets/TICKET-PLAT-04-docker-deployment.md).

## Run it

```bash
git clone <this repo> collections && cd collections
cp docker-compose.example.yml docker-compose.yml   # adjust the port or volume if needed
docker compose up -d --build
docker compose ps                                  # STATUS shows "(healthy)" once /healthz answers
```

The image runs `node src/server.ts --prod` as the unprivileged `node` user, listens on `PORT` (3000), and applies
database migrations at startup. If a migration fails, the container exits instead of serving, so check
`docker compose logs` when it keeps restarting.

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Port inside the container. |
| `DATA_DIR` | `/data` | Where `db.sqlite` and `uploads/` live. Leave it as is and mount a volume there. |
| `TRUST_PROXY` | off | Express "trust proxy". Set it to the number of proxies in front (usually `1`). See below. |

## Upgrade

```bash
git pull
docker compose up -d --build
```

Back up `/data` first (below). New migrations run on startup. There is no downgrade: to go back, restore the backup
together with the older version.

## Data and backups

Everything the app stores lives in the `/data` volume:

- `db.sqlite` (plus `db.sqlite-wal` / `db.sqlite-shm` while running): collections, fields, items, settings, the
  admin password hash and sessions
- `uploads/`: item images (from TICKET-ITM-04)

**That volume is the backup target.** For a consistent copy, stop the container first, or use the in-app export
zip (TICKET-BAK-01):

```bash
docker compose stop
docker run --rm -v collections_collections-data:/data -v "$PWD":/backup busybox \
  tar czf /backup/collections-data-$(date +%F).tgz -C /data .
docker compose start
```

The volume name is `<project>_collections-data`; `docker volume ls` shows it. If you bind-mount a host folder
instead of a named volume, make it writable by uid 1000 (`chown 1000:1000 <folder>`).

## Reverse proxy

The app speaks plain HTTP and expects a reverse proxy on the same host to terminate TLS. The example compose file
publishes the port on `127.0.0.1` only, so the proxy is the only way in.

The proxy must:

- serve HTTPS. The session cookie is `Secure`, so logging in over plain HTTP doesn't work.
- forward `Host`, `X-Forwarded-Proto` and `X-Forwarded-For`.
- allow request bodies of at least 16 MB (image uploads are capped at 15 MB).

Set `TRUST_PROXY` to the number of proxies in front of the app, usually `1`. The app then believes the forwarded
scheme and client IP, which the `Secure` cookie and the login rate limit depend on (TICKET-AUTH-02). Never trust a
header from a client that bypasses the proxy, so don't publish the port beyond `127.0.0.1` when `TRUST_PROXY` is
set.

Caddy:

```caddyfile
collections.example.org {
  reverse_proxy 127.0.0.1:3000
}
```

nginx:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  client_max_body_size 16m;
}
```

## Lost admin password

Reset it from inside the container. The command arrives with TICKET-AUTH-03:

```bash
docker compose exec collections npm run reset-password
```
