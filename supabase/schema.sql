create table if not exists runs (
  run_id text primary key,
  run_date date not null,
  status text not null,
  selected_model text not null,
  selected_threshold numeric not null,
  label_source text,
  label_status text,
  started_at timestamptz,
  finished_at timestamptz,
  feature_window_days integer,
  fire_f1 numeric,
  balanced_accuracy numeric,
  created_at timestamptz default now()
);

alter table runs add column if not exists window_mode text;
alter table runs add column if not exists fire_precision numeric;
alter table runs add column if not exists fire_recall numeric;
alter table runs add column if not exists critical_districts integer default 0;
alter table runs add column if not exists warning_districts integer default 0;
alter table runs add column if not exists active_fire_districts integer default 0;
alter table runs add column if not exists app_url text;
alter table runs add column if not exists download_urls jsonb default '{}'::jsonb;
alter table runs add column if not exists asset_date_used date;
alter table runs add column if not exists asset_selection_mode text;

create table if not exists district_risk_daily (
  record_id bigint generated always as identity primary key,
  run_id text not null references runs(run_id) on delete cascade,
  district_id text not null,
  district_name text not null,
  mean_risk numeric not null,
  max_fire_prob numeric not null,
  high_or_very_high_area_pct numeric not null,
  dominant_risk_class text not null,
  hotspot_count_24h integer not null default 0,
  lat numeric,
  lon numeric,
  updated_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists active_fire_daily (
  fire_id text primary key,
  run_id text references runs(run_id) on delete set null,
  district_id text,
  district_name text,
  lat numeric not null,
  lon numeric not null,
  source text not null,
  confidence text,
  detected_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists alert_events (
  alert_id text primary key,
  run_id text not null references runs(run_id) on delete cascade,
  district_id text not null,
  district_name text not null,
  severity text not null,
  trigger_reason text not null,
  max_fire_prob numeric,
  high_or_very_high_area_pct numeric,
  hotspot_count_24h integer,
  channel text not null,
  message_status text not null,
  sent_at timestamptz,
  preview_message text,
  chat_id text,
  send_result jsonb,
  created_at timestamptz default now()
);

create table if not exists subscribers (
  subscriber_id text primary key,
  channel_type text not null,
  chat_id text not null,
  district_scope text not null default 'all',
  enabled boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists alert_rules (
  ruleset_id text primary key,
  probability_watch_min numeric not null,
  probability_warning_min numeric not null,
  high_or_very_high_area_pct_min numeric not null,
  hotspot_count_critical_min integer not null,
  updated_at timestamptz default now()
);

create table if not exists map_config (
  config_id text primary key,
  region_name text not null,
  timezone text not null,
  refresh_cadence text not null,
  gee_app_url text,
  download_base_url text,
  legend jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

insert into alert_rules (
  ruleset_id,
  probability_watch_min,
  probability_warning_min,
  high_or_very_high_area_pct_min,
  hotspot_count_critical_min
)
values ('default', 0.55, 0.70, 10, 1)
on conflict (ruleset_id) do nothing;

insert into map_config (
  config_id,
  region_name,
  timezone,
  refresh_cadence,
  gee_app_url,
  download_base_url,
  legend
)
values (
  'default',
  'Antalya, Turkey',
  'Europe/Istanbul',
  'Daily at 08:00',
  '',
  '',
  '[
    {"class":"Very Low","color":"#4575b4"},
    {"class":"Low","color":"#91bfdb"},
    {"class":"Medium","color":"#ffffbf"},
    {"class":"High","color":"#fdae61"},
    {"class":"Very High","color":"#d73027"}
  ]'::jsonb
)
on conflict (config_id) do nothing;

create index if not exists idx_runs_run_date on runs(run_date desc);
create index if not exists idx_district_risk_daily_run_id on district_risk_daily(run_id);
create index if not exists idx_district_risk_daily_district_id on district_risk_daily(district_id);
create unique index if not exists uq_district_risk_daily_run_district
  on district_risk_daily(run_id, district_id);
create index if not exists idx_active_fire_daily_detected_at on active_fire_daily(detected_at desc);
create index if not exists idx_alert_events_run_id on alert_events(run_id);
create index if not exists idx_alert_events_district_id on alert_events(district_id);

alter table runs enable row level security;
alter table district_risk_daily enable row level security;
alter table active_fire_daily enable row level security;
alter table alert_events enable row level security;
alter table subscribers enable row level security;
alter table alert_rules enable row level security;
alter table map_config enable row level security;
