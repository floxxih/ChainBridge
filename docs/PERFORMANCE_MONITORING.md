# Performance Monitoring

ChainBridge now ships with a Prometheus + Grafana monitoring stack for backend API and relayer performance visibility.

## What Is Collected

- API request throughput and latency (`chainbridge_http_*`)
- Swap completion duration (`chainbridge_swap_completion_seconds`)
- Database query volume, latency, and slow-query counts (`chainbridge_db_*`)
- Indexer sync health and lag (`chainbridge_indexer_*`)
- Relayer chain polling health and error rate (`chainbridge_relayer_*`)

## Local Stack

Start development stack with monitoring:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Endpoints:

- Backend API: `http://localhost:8000`
- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Grafana: `http://localhost:3001` (default `admin` / `admin`)
- Relayer metrics: `http://localhost:9108/metrics`

## Alerting

Prometheus rules are defined in:

- `monitoring/prometheus/alert_rules.yml`

Alerts include:

- High API latency (p95)
- Elevated API 5xx rate
- Slow database query spikes
- Indexer lag
- Slow swap completion p95
- Relayer degraded health

## Dashboards

Grafana provisions dashboards from:

- `monitoring/grafana/dashboards/chainbridge-performance.json`

The dashboard includes:

- API request rate + latency
- Slow query trends
- Indexer lag by chain
- Swap completion p95
- Relayer health + error rate
