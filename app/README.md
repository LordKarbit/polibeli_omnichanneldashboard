# Polibeli Omnichannel Dashboard

Management-grade omnichannel sales analytics dashboard for GT, MT, Shopee, TikTok Shop (Kayou ID), and TikTok Shop (Kayou Card ID). The application converts raw operational files into normalized orders, order items, customers, products, sales hierarchy, geo analytics, marketplace metrics, exports, and AI query logs.

The product is built for business reporting workflows where management needs fast answers across channels, regions, products, customers, order statuses, and city-level sales coverage.

## Highlights

- Executive overview for GMV, active GMV, orders, cancellation, channel mix, weekly movement, and alerts.
- GT Performance module with Regional Manager visibility as the primary view, Area Manager drilldown, BD/sales leaderboard, customer retention, city ranking, SKU pareto, and transaction-level drilldown.
- Geo Sales module with MapLibre GL JS and deck.gl, Indonesia city boundary rendering, uploaded-data-driven GMV polygons, GT district drilldown, channel filters, clear map mode, and responsive map controls.
- Marketplace grouping for Shopee, TikTok ID, and TikTok Card under one Marketplace category, with sub-channel drilldown where relevant.
- Upload center for raw GT/MT and marketplace source files, sample ingestion, batch tracking, parsing status, and normalized order counts.
- SQLite + Drizzle ORM backend with Next.js route handlers.
- Better Auth integration with SQLite-backed user, session, account, and verification tables.
- Cleaned dataset exports for downstream analysis.
- AI insight logging layer for chatbot questions, generated SQL metadata, chart suggestions, result counts, latency, and error tracking.

## Supported Data Sources

| Source | Expected file type | Notes |
| --- | --- | --- |
| GT | CSV or Excel exported raw dashboard data | Rows where `bdcity` is not `Agency`; province uses `recipient addressprovince`; city uses `recipient addresscity`; district uses `recipient addressarea`; BD/sales uses `BD bd name`; Regional Manager uses `Regional Manager`. |
| MT | CSV or Excel exported raw dashboard data | Rows where `bdcity` is `Agency`; province uses `recipient addressprovince`; city uses `recipient addresscity`. |
| Shopee | Excel order export | Normalized as Marketplace / Shopee. |
| TikTok Shop (Kayou ID) | CSV order export | Normalized as Marketplace / TikTok ID. |
| TikTok Shop (Kayou Card ID) | CSV order export | Normalized as Marketplace / TikTok Card. |

GMV for GT and MT is computed from SKU GMV fields at item level. Giveaway and POSM SKUs such as Scratch Card, Poster POSM, and MLBB Display Rack are excluded from reporting metrics.

## Core Modules

### Executive Overview

- Total booked GMV, active GMV, refunds, orders, active orders, and cancellation rate.
- Channel grouping into GT, MT, and Marketplace.
- Marketplace aggregates Shopee, TikTok Shop (Kayou ID), and TikTok Shop (Kayou Card ID).
- Global filters are staged: expanding the filter card lets users select detailed filters, then apply or reset them explicitly.

### GT Performance

- Regional Manager Comparison as a large responsive donut plus ranked detail panel.
- Clickable regional slices and rows for drilldown.
- Area Manager GMV command chart.
- BD/sales leaderboard based on `BD bd name`.
- Customer retention analytics for one-time and repeat buyers.
- City demand ranking and GT SKU pareto.
- Transaction drilldown by RM, AM, BD/sales, city, customer, and date.

### Geo Sales

- Indonesia GMV Boundary Map with MapLibre GL JS and deck.gl.
- Dynamic city boundaries generated from `VILLAGE-SUB-DISTRICT BOUNDARIES.kml`.
- Only boundaries with available GMV are shown.
- Hover tooltip shows total GMV and GMV by channel.
- Left click opens detailed city transaction popup.
- GT-only mode can drill from city into district-level boundary and heat intensity.
- Channel filter supports GT, MT, and Marketplace; Marketplace can split into Shopee, TikTok ID, and TikTok Card.
- Toggle supports GMV or cancellation value heat basis for Marketplace views.

### Upload Center

- Upload raw operational files.
- Ingest bundled sample files during QA.
- Track upload batches, raw files, raw order lines, parsing status, normalized orders, and normalized items.
- Refresh analytics cache after new uploads so dashboards use the latest data.

### AI Insight Center

- Chatbot interface for sales questions.
- Logs questions, generated SQL metadata, filter context, result size, latency, status, and chart suggestions.
- Designed to support auditability before wider production AI query execution.

## Backend Architecture

The backend is implemented with Next.js App Router route handlers, Drizzle ORM, libSQL SQLite, and Better Auth.

### Main technologies

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- ECharts
- MapLibre GL JS
- deck.gl
- Drizzle ORM
- SQLite through `@libsql/client`
- Better Auth
- XLSX parser

### Database

Default local database:

```bash
data/omnichannel.sqlite
```

Override with:

```bash
DATABASE_URL=file:./data/omnichannel.sqlite
DATABASE_AUTH_TOKEN=
DRIZZLE_LOG=false
BETTER_AUTH_SECRET=replace-with-a-secure-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Schema coverage

The Drizzle schema includes:

- Authentication: `user`, `session`, `account`, `verification`
- Upload pipeline: `upload_batches`, `raw_uploaded_files`, `raw_order_lines`
- Reference data: `channels`, `platforms`, `products`, `product_aliases`, `customers`, `locations`, `order_statuses`
- Sales organization: `regional_managers`, `area_managers`, `sales_hierarchy`
- Normalized business data: `normalized_orders`, `order_items`, `marketplace_orders`
- Reporting and audit: `metrics_snapshots`, `ai_query_logs`, `cleaned_dataset_exports`, `source_field_mappings`, `dedupe_keys`

Deduplication is enforced through order keys, item hashes, file hashes, row hashes, and the `dedupe_keys` table.

## API Routes

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Health check. |
| `POST /api/ingest/files` | Upload and parse raw CSV/XLS/XLSX files. |
| `POST /api/ingest/samples` | Load bundled sample files for QA. |
| `GET /api/analytics/summary` | Dashboard analytics payload used by all modules. |
| `GET /api/orders` | Normalized order listing. |
| `GET /api/orders/[orderKey]` | Single-order detail. |
| `GET /api/raw/files/[fileId]/lines` | Raw line inspection for an uploaded file. |
| `GET /api/exports/cleaned` | Download cleaned normalized dataset. |
| `GET /api/upload/batches` | Upload batch metadata. |
| `GET /api/upload/files` | Uploaded file metadata. |
| `POST /api/normalize/orders` | Normalize persisted raw rows into reporting tables. |
| `GET /api/metrics/snapshots` | Metrics snapshots. |
| `POST /api/ai/ask` | AI question endpoint. |
| `GET /api/ai/query-logs` | AI query log listing. |
| `POST /api/reference/bootstrap` | Bootstrap reference/channel/platform mappings. |
| `/api/auth/[...all]` | Better Auth handler. |

## Project Structure

```text
app/
  src/app/(dashboard)/        Dashboard pages and layout
  src/app/api/                Next.js route handlers
  src/components/charts/      ECharts wrapper
  src/components/geo/         MapLibre + deck.gl geo map
  src/components/layout/      Header, sidebar, route loading overlay
  src/components/ui/          Shared UI primitives and cards
  src/lib/                    Formatting, download, dashboard client, chart config
  src/server/analytics/       Analytics aggregation layer
  src/server/db/              Drizzle schema and database client
  src/server/ingestion/       Upload parsing and normalization
  drizzle/                    Generated migrations
  public/data/                Geo boundary and basemap assets
  scripts/                    Boundary and basemap generation scripts
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` for local development:

```bash
DATABASE_URL=file:./data/omnichannel.sqlite
BETTER_AUTH_SECRET=replace-with-a-secure-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Start development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Upload and QA Flow

1. Open Upload Center.
2. Upload the raw GT/MT file exported from the dashboard.
3. Upload Shopee order export.
4. Upload TikTok Shop Kayou ID export.
5. Upload TikTok Shop Kayou Card ID export.
6. Confirm normalized orders and normalized items are created.
7. Visit Executive Overview, GT Performance, Geo Sales, Marketplace, SKU, Customers, Operations, and Data Quality.
8. Use global filters, drilldowns, map interactions, exports, and AI questions to validate reporting behavior.

Recommended QA checks:

- GT rows classify from `bdcity <> "Agency"`.
- MT rows classify from `bdcity = "Agency"`.
- Province and city for GT/MT come from `recipient addressprovince` and `recipient addresscity`.
- GT district drilldown uses `recipient addressarea`.
- GMV comes from SKU GMV at item level.
- Marketplace files map to Shopee, TikTok ID, and TikTok Card correctly.
- Duplicate files, duplicate rows, and duplicate order lines do not inflate metrics.
- Cancelled/refunded orders affect active GMV and cancellation value correctly.
- Scratch Card, Poster POSM, and MLBB Display Rack are excluded from all reporting metrics.
- Cleaned export downloads contain normalized, filtered rows.
- Responsive layouts work on mobile, tablet, and desktop.

## Geo Boundary Workflow

City and district boundaries are derived from the provided KML source:

```text
VILLAGE-SUB-DISTRICT BOUNDARIES.kml
```

The app uses prepared assets under:

```text
public/data/geo-sales-city-boundaries.geojson
public/data/geo-sales-subdistrict-boundaries.geojson
public/data/geo-sales-basemap.png
```

Only cities or districts with uploaded GMV are rendered in the map. If a future upload introduces a new city with GMV and that city exists in the boundary index, the boundary appears automatically.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start local Next.js development server. |
| `npm run build` | Build production bundle. |
| `npm run start` | Start production server after build. |
| `npm run lint` | Run ESLint. |
| `npm run db:generate` | Generate Drizzle migration files. |
| `npm run db:migrate` | Apply Drizzle migrations. |
| `npm run db:studio` | Open Drizzle Studio. |

## Production Notes

- Use a strong `BETTER_AUTH_SECRET` in production.
- Do not commit `.env*`, `data/*.sqlite`, `.next`, or local dev logs.
- Use persistent storage for SQLite or migrate to managed libSQL/Turso by changing `DATABASE_URL` and `DATABASE_AUTH_TOKEN`.
- Protect upload endpoints before public deployment if this dashboard is exposed outside a trusted network.
- Review AI SQL execution rules before enabling unrestricted natural-language querying in production.

## Current Status

The app has been validated with:

```bash
npm run lint
npm run build
```

Both commands pass in the current workspace.
