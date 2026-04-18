# Deployment Guide

## 1. Local development

1. Install dependencies:
   - `npm install`
2. Start the web app:
   - `npm run dev:web`
3. Start the worker locally:
   - `npm run start:worker`
4. Trigger a daily run locally:
   - `npm run run:export`
   - `npm run run:export -- --date=2026-03-10`
   - `npm run run:worker`
   - `npm run run:worker -- --date=2026-03-10`
   - `npm run run:worker -- --date=2026-03-10 --export-first`
   - `./scripts/run-daily-pipeline.sh 2026-03-10`
   - or `curl -X POST "http://localhost:8080/run-pipeline?date=2026-03-10"`

The repository defaults to mock operational data in `data/mock`. This keeps the app usable before wiring real credentials.

## 2. Earth Engine production setup

1. Keep `GEE.js` as the research/training script.
2. Open `production/GEE_operational_app.js` in the Earth Engine Code Editor.
3. Replace the asset placeholders:
   - `riskProbAssetId`
   - `riskClassAssetId`
   - `riskBinaryAssetId`
   - or keep the default project root `projects/wildfire-540/assets/fire_risk_ops` and let the script build dated asset IDs automatically
4. Publish the Earth Engine App and copy the public URL into:
   - `.env`
   - `data/mock/latest-run.json`
   - `data/mock/map-config.json`

## 3. Supabase

1. Create a Supabase project.
2. Run the SQL in `supabase/schema.sql`.
3. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to `.env`.
4. Replace the local JSON persistence layer when you are ready to move from mock mode to real storage.

## 4. Telegram

1. Create a Telegram bot via BotFather.
2. Put the token in `TELEGRAM_BOT_TOKEN`.
3. Add one or more group or chat IDs.
4. In v1, admin recipients are stored through the subscriber API or the local mock file.

## 5. Cloud Run and Scheduler

1. Containerize `services/worker`.
2. Deploy it to Cloud Run.
3. Expose:
   - `GET /health`
   - `POST /run-export`
   - `POST /run-daily`
   - `POST /run-pipeline`
4. Create a Cloud Scheduler job:
   - cron: `0 8 * * *`
   - timezone: `Europe/Istanbul`
   - target: `POST https://your-worker-url/run-pipeline`

## 6. Production promotion path

1. Train and validate models in `GEE.js`.
2. Export the approved classifier asset and daily raster assets.
3. Update the asset IDs in the operational GEE app.
4. Run the daily pipeline (`export -> ingestion`) to refresh summaries and alerts.
5. Serve the public app from Next.js and point users to the Earth Engine App until custom raster delivery is added.

## 7. Ubuntu self-hosting

Recommended target layout on the Ubuntu server:

- app path: `/opt/fire-risk/current`
- service-account key path: `/opt/fire-risk/secrets/earthengine-service-account.json`
- systemd user/group: `fire-risk`

Prepare the server:

1. Install:
   - `nodejs` 20+
   - `npm`
2. Copy the repository to:
   - `/opt/fire-risk/current`
3. Create a dedicated user:
   - `sudo useradd -r -s /usr/sbin/nologin fire-risk`
4. Create the secrets directory:
   - `sudo mkdir -p /opt/fire-risk/secrets`
5. Copy the Earth Engine service-account JSON there
6. Set ownership:
   - `sudo chown -R fire-risk:fire-risk /opt/fire-risk`
7. Make scripts executable:
   - `chmod +x scripts/*.sh`

Set `.env` for production. Important values:

- `WORKER_USE_MOCK_EE=false`
- `EE_SERVICE_ACCOUNT_KEY_PATH=/opt/fire-risk/secrets/earthengine-service-account.json`
- `EE_ASSET_ROOT=projects/wildfire-540/assets/fire_risk_ops`
- `EE_ASSET_NAME_PREFIX=antalya_fire_risk`
- `EE_CLASSIFIER_ASSET_ID=projects/wildfire-540/assets/fire_risk_ops/approved_rf_classifier`
- `EE_ASSET_DATE_POLICY=latest_available`

Build and install:

1. `./scripts/prepare-production.sh`
2. `sudo ./scripts/install-systemd.sh`

Post-install verification:

- `./scripts/healthcheck.sh`
- `./scripts/verify-systemd.sh`

Service operations:

- `sudo systemctl status fire-risk-web`
- `sudo systemctl status fire-risk-worker`
- `sudo systemctl status fire-risk-daily-run.timer`
- `journalctl -u fire-risk-web -f`
- `journalctl -u fire-risk-worker -f`
- `journalctl -u fire-risk-daily-run.service -f`
- `./scripts/healthcheck.sh`
- `./scripts/verify-systemd.sh`

Manual real ingestion test:

- `./scripts/run-daily-export.sh 2024-08-15`
- `./scripts/run-daily-worker.sh 2024-08-15`
- `./scripts/run-daily-pipeline.sh 2024-08-15`

`run-daily-pipeline.sh` forces:
- `WORKER_USE_MOCK_EE=false`
- `EE_ASSET_DATE_POLICY=exact`
so daily runs fail fast if same-day assets are missing.

The units assume:

- `User=fire-risk`
- `Group=fire-risk`
- app path `/opt/fire-risk/current`

If your Ubuntu server uses a different path or user, update the unit files in `deploy/systemd/` before installation.

## 8. Windows self-hosting

This repository now includes Windows PowerShell scripts for a laptop or local Windows server:

- `scripts/prepare-production.ps1`
- `scripts/start-web-prod.ps1`
- `scripts/start-worker-prod.ps1`
- `scripts/run-daily-worker.ps1`
- `scripts/register-windows-tasks.ps1`
- `scripts/unregister-windows-tasks.ps1`

Recommended flow:

1. Prepare the production build:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\prepare-production.ps1`
2. Manually test production processes:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\start-web-prod.ps1`
   - `powershell -ExecutionPolicy Bypass -File .\scripts\start-worker-prod.ps1`
3. Test one manual daily run:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\run-daily-worker.ps1`
4. Register background scheduled tasks:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\register-windows-tasks.ps1`

The scripts write logs to the local `logs` directory:

- `logs/web.out.log`
- `logs/web.err.log`
- `logs/worker.out.log`
- `logs/worker.err.log`
- `logs/daily-run.out.log`
- `logs/daily-run.err.log`
