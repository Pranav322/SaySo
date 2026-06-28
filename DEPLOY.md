# Sayso — Deployment

Live: **https://sayso-tqvrg.ondigitalocean.app**
Hosted on **DigitalOcean App Platform** (one app, two components) + **DigitalOcean Managed Postgres**.

## Resources (DigitalOcean, team "My Team")
| Thing | Value |
|---|---|
| App | `sayso` · ID `dd3af2f2-50ef-4f67-9b01-86a737a2ab15` · region `sgp` |
| Default URL | https://sayso-tqvrg.ondigitalocean.app |
| Postgres cluster | `sayso-pg` · ID `05dfb5fe-bc35-4d2c-9dac-7e8ab9e016b5` · PG 16 · `sgp1` · 1vCPU/1GB |
| GitHub repo | `Pranav322/SaySo` (branch `main`) |
| App spec (committed) | `.do/app.yaml` |

All ops use `doctl` (already authenticated locally). `doctl apps ...`, `doctl databases ...`.

## Architecture
One App Platform app, two components sharing one domain:
- **`web`** (Next.js, Node buildpack) → route `/`. Build `npm run build`, run `npm start`.
- **`api`** (FastAPI/WebSocket, built from root `Dockerfile`) → route `/api`. App Platform **strips
  the `/api` prefix** before forwarding, so the backend still sees `/personas`, `/voices`,
  `/health`, `/ws/converse/...`. Health check: `/health`.
- **`sayso-pg`** Postgres attached as a `databases:` entry; `DATABASE_URL` injected into `api`.

Frontend talks to the backend **same-origin** via `NEXT_PUBLIC_API_BASE=/api` (set at build).
The WS base is derived in the browser from `window.location` (see `frontend/src/lib/constants.ts`),
so no domain is hardcoded.

## Auto-deploy (the main workflow)
`deploy_on_push: true` on both components. **Just `git push origin main`** — App Platform rebuilds
**only the component whose files changed**:
- touched `frontend/**` → only `web` redeploys
- touched `backend/**`, `Dockerfile`, `pyproject.toml`, `uv.lock` → only `api` redeploys
- both → both

Watch a deploy:
```bash
APP=dd3af2f2-50ef-4f67-9b01-86a737a2ab15
doctl apps list-deployments $APP --format Phase,Cause,Updated | head -3   # BUILDING→DEPLOYING→ACTIVE
doctl apps logs $APP --type build   # or --type run
```

## Environment variables
**Backend (`api`)** — set in the app (RUN_TIME):
- `DATABASE_URL` = `${sayso-pg.DATABASE_URL}` (auto-bound to the cluster)
- `ALLOWED_ORIGINS` = `${APP_URL}` (CORS locked to the app's own origin)
- `DASHSCOPE_API_KEY` = **SECRET** (Qwen / DashScope key)
- Optional tunables (defaults in `backend/limits.py`): `SESSION_MAX_SECONDS` (600),
  `MAX_CONCURRENT_PER_SID` (3), `MAX_ENROLLMENTS_PER_DAY` (20)

**Frontend (`web`)** — BUILD_TIME:
- `NEXT_PUBLIC_API_BASE` = `/api`
- (`NEXT_PUBLIC_SITE_URL` optional — sets `metadataBase` for absolute OG URLs; currently unset)

## ⚠️ The secret + spec gotcha
`.do/app.yaml` declares `DASHSCOPE_API_KEY` as a `SECRET` **with no value** (so the key isn't in
git). The running app already has the real value. Therefore:
- `git push` redeploys **without touching** the secret — safe. ✅
- `doctl apps update --spec .do/app.yaml` would push the empty secret and **blank it**. ❌
  If you must update the spec via doctl, inject the key into a temp copy first:
  ```bash
  # reads DASHSCOPE_API_KEY from ./.env, writes a temp spec with the value, updates the app
  python3 - <<'PY'
  k=[l.split("=",1)[1].strip() for l in open(".env") if l.startswith("DASHSCOPE_API_KEY=")][0]
  s=open(".do/app.yaml").read().replace(
    "      - key: DASHSCOPE_API_KEY\n        scope: RUN_TIME\n        type: SECRET\n",
    f"      - key: DASHSCOPE_API_KEY\n        scope: RUN_TIME\n        type: SECRET\n        value: {k}\n")
  open("/tmp/sayso-spec.yaml","w").write(s)
  PY
  doctl apps update dd3af2f2-50ef-4f67-9b01-86a737a2ab15 --spec /tmp/sayso-spec.yaml
  ```
  (Or just set the key in the DO dashboard → app → Settings → `api` → Environment Variables.)

## Database
- Managed Postgres, **trusted sources locked** to: the app + the maintainer's dev IP. It is NOT
  open to the world. To let a new dev machine connect for local work:
  ```bash
  doctl databases firewalls append 05dfb5fe-bc35-4d2c-9dac-7e8ab9e016b5 \
    --rule "ip_addr:$(curl -s https://checkip.amazonaws.com)"
  doctl databases firewalls list 05dfb5fe-bc35-4d2c-9dac-7e8ab9e016b5
  ```
- Connection string: `doctl databases connection 05dfb5fe-bc35-4d2c-9dac-7e8ab9e016b5 --format URI`
- Schema is created automatically by `store.init_db()` on app startup. No migrations tool yet —
  if you change the `personas` table, alter it manually or add a migration step.

## Local development
`.env` (gitignored) needs `DASHSCOPE_API_KEY` and `DATABASE_URL` (points at the managed cluster —
your IP must be a trusted source, see above).
```bash
# backend
cd ~/personal/mirror && PYTHONPATH=. uv run uvicorn backend.main:app --reload
# frontend (talks to localhost:8000 by default)
cd ~/personal/mirror/frontend && npm run dev
```

## Smoke test (prod)
```bash
BASE=https://sayso-tqvrg.ondigitalocean.app
curl -s $BASE/api/health                                   # {"ok":true}
curl -s $BASE/api/personas -H "X-Session-Id: t" | head     # 5 presets
curl -s -o /dev/null -w "%{http_code}\n" $BASE/            # 200
```

## Cost (approx)
2 × basic-xxs services (~$5 each) + Managed Postgres (~$15) ≈ **$25–30/mo**. Cloudflare (if added
in front for DNS/SSL/WAF) is free.

## Before a fully public launch
CORS is locked, the DB is private, and per-session abuse caps exist — but **every conversation
still bills one shared `DASHSCOPE_API_KEY`**. For open/anonymous traffic, add an access gate
(invite code or login) so a single abuser can't drain the key. Fine for a private/beta share now.
