# HazardSignal

HazardSignal is the public and operational deployment of the fire-risk platform.`r`n`r`nThis repository now contains two layers of the platform:

- `GEE.js`: the research and training workflow in Google Earth Engine
- `production/GEE_operational_app.js`: the Earth Engine operational app script
- `apps/web`: the public-facing Next.js dashboard
- `services/worker`: the Node.js daily worker and Telegram alert engine
- `supabase/schema.sql`: the relational schema for production storage
- `data/mock`: local mock operational data used before real credentials are wired

## What is implemented

### Research workflow

The original `GEE.js` remains the source-of-truth ML workflow:
- dynamic feature engineering
- fire labeling
- RF + Gradient Tree Boost training
- model comparison and threshold selection
- fire-risk probability, binary, and class maps
- reporting exports

### Operational product

The new product layer adds:
- a Next.js dashboard with map, district pages, alerts page, and admin page
- API endpoints for latest run, district summaries, active fires, alerts, and map config
- admin endpoints for test alerts, subscribers, and alert rules
- a Node worker for daily inference orchestration and Telegram alerts
- a production Earth Engine app script for daily asset visualization
- a Supabase schema for the long-term production backend

## Current architecture

### Phase 1

- Earth Engine App for public map presentation
- Daily worker for district summaries and Telegram alerts
- Admin audience for alerts
- Local JSON mock storage in `data/mock`

### Phase 2 scaffold

- Next.js public web app
- Cloud Run worker
- Cloud Scheduler daily trigger
- Supabase persistence
- Telegram bot integration

## API endpoints

The web app exposes these routes:

- `GET /api/latest-run`
- `GET /api/districts/latest`
- `GET /api/districts/:districtId/history`
- `GET /api/alerts/recent`
- `GET /api/fires/latest`
- `GET /api/map-config/latest`
- `POST /api/admin/alerts/test`
- `POST /api/admin/subscribers`
- `PATCH /api/admin/alert-rules`

## Worker endpoints

The worker exposes:

- `GET /health`
- `POST /run-export`
- `POST /run-daily`
- `POST /run-pipeline`

The worker can also be started directly from the CLI:

- `npm run run:export`
- `npm run run:export -- --date=2026-03-10`
- `npm run run:worker`
- `npm run run:worker -- --date=2026-03-10`
- `npm run run:worker -- --date=2026-03-10 --export-first`

## Local run

1. Install dependencies:
   - `npm install`
2. Start the dashboard:
   - `npm run dev:web`
3. Start the worker:
   - `npm run start:worker`
4. Trigger a daily run:
   - `npm run run:worker`
5. Run the worker tests:
   - `npm run test:worker`

## Environment

Copy `.env.example` to `.env` and set:

- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_EE_APP_URL`
- `WORKER_PORT`
- `WORKER_USE_MOCK_EE`
- `WORKER_EXPORT_BEFORE_RUN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_DEFAULT_CHAT_ID`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If `SUPABASE_URL` and a valid key are present, the web app and worker switch automatically from
`data/mock` to Supabase-backed storage.

## Switch To Supabase

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Put these values into `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Seed the database from the current mock data:
   - `npm run seed:supabase`
5. Restart the web app and worker:
   - `npm run dev:web`
   - `npm run start:worker`
6. If you want the worker to keep using mock Earth Engine inference while storing to Supabase:
   - keep `WORKER_USE_MOCK_EE=true`

At that point:
- the dashboard reads from Supabase
- `/admin` writes subscribers, alert rules, and test alerts to Supabase
- the worker writes runs, district summaries, active fires, and alert events to Supabase

## Important implementation note

The current repo is intentionally honest about operational boundaries:

- the research model stays in `GEE.js`
- the public app does not retrain models
- the worker supports mock mode and real Earth Engine asset ingestion mode
- the Earth Engine operational app expects exported raster asset IDs to be configured

This means the system is implementable now, demoable now, and ready for real credentials and asset promotion without changing the overall design.

## Next production steps

1. Publish the Earth Engine operational app and replace placeholder asset IDs.
2. Connect the worker from mock JSON storage to Supabase.
3. Add real Telegram credentials and validate message delivery.
4. Configure Earth Engine service-account ingestion by setting:
   - `WORKER_USE_MOCK_EE=false`
   - `EE_SERVICE_ACCOUNT_KEY_PATH`
   - `EE_ASSET_ROOT`
   - `EE_ASSET_NAME_PREFIX`
   - `EE_CLASSIFIER_ASSET_ID`
5. Deploy `apps/web` and `services/worker`.

## Real Earth Engine worker mode

When `WORKER_USE_MOCK_EE=false`, the worker no longer reads `data/mock` for operational inference.
Instead it:

- authenticates to Earth Engine using a service-account JSON key
- loads exported raster assets from `EE_ASSET_ROOT`
- can fall back to the latest complete asset set on or before the requested date when `EE_ASSET_DATE_POLICY=latest_available`
- computes district summaries for the configured region
- reads last-24h FIRMS detections
- writes runs, district risk, active fires, and alerts to Supabase

Required env vars:

- `EE_SERVICE_ACCOUNT_KEY_PATH`
- `EE_ASSET_ROOT`
- `EE_ASSET_NAME_PREFIX`
- `EE_CLASSIFIER_ASSET_ID`
- `EE_ASSET_DATE_POLICY`
- `EE_MAX_ASSET_AGE_DAYS`
- `EE_REGION_COUNTRY`
- `EE_REGION_LEVEL1`
- `EE_SELECTED_MODEL`
- `EE_SELECTED_THRESHOLD`

Recommended production flow:

1. Export an approved classifier asset from `GEE.js` and set `EE_CLASSIFIER_ASSET_ID`.
2. Ensure the service account has access to the Earth Engine project/assets.
3. Set `WORKER_USE_MOCK_EE=false`.
4. Run the daily export+ingestion pipeline:
   - `./scripts/run-daily-pipeline.sh YYYY-MM-DD`
5. For API-based execution:
   - `POST /run-pipeline?date=YYYY-MM-DD`
6. Keep `EE_ASSET_DATE_POLICY=latest_available` only for standalone ingestion mode (`run-daily` without export).


## Domain and reverse proxy

Production domain:

- https://hazardsignal.com`r

Recommended public routing:

- / -> Next.js web app on 127.0.0.1:3000`r
- /worker/health -> worker API on 127.0.0.1:8080/health`r

An Nginx site config is included at:

- deploy/nginx/hazardsignal.com.conf`r

After copying it to Ubuntu:

1. sudo mkdir -p /var/www/certbot`r
2. sudo cp deploy/nginx/hazardsignal.com.conf /etc/nginx/sites-available/hazardsignal.com.conf`r
3. sudo ln -sf /etc/nginx/sites-available/hazardsignal.com.conf /etc/nginx/sites-enabled/hazardsignal.com.conf`r
4. sudo nginx -t`r
5. sudo systemctl reload nginx`r
6. sudo certbot --nginx -d hazardsignal.com -d www.hazardsignal.com`r

## Production health and runtime

For a stable Ubuntu deployment:

- use `Node.js 20+`
- enable `fire-risk-web.service`
- enable `fire-risk-worker.service`
- enable `fire-risk-daily-run.timer`

Useful checks:

- `./scripts/healthcheck.sh`
- `./scripts/verify-systemd.sh`
