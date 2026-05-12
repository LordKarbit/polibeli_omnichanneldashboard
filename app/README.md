# Polibeli Omnichannel Dashboard App

Management-grade Next.js application for omnichannel sales analytics across GT, MT, Shopee, TikTok Shop Kayou ID, TikTok Shop Kayou Card ID, and Income & Settlement reporting.

The app normalizes uploaded files into Supabase PostgreSQL through Drizzle ORM, then powers dashboard cards, charts, filters, drilldowns, exports, Geo Sales maps, role access, and AI query logs from the database.

## Highlights

- Executive overview for GMV, active GMV, orders, cancellation, channel mix, weekly movement, and alerts.
- GT Performance with Regional Manager comparison as the primary visibility layer, Area Manager drilldown, BD/sales leaderboard, customer retention, city ranking, SKU pareto, and transaction-level drilldown.
- Geo Sales with MapLibre GL JS and deck.gl, Indonesia city boundary rendering, uploaded-data-driven GMV polygons, GT district drilldown, channel filters, clear map mode, 3D building mode, right-click building detail, orbit interaction, and responsive map controls.
- Marketplace grouping for Shopee, TikTok ID, and TikTok Card under one Marketplace category, with source-specific analytics when a marketplace is selected.
- Income & Settlement control tower for marketplace income files, payout visibility, fees, adjustments, source detail, and reconciliation views.
- Upload Center for raw GT/MT and marketplace source files, wipe-data reset, batch tracking, parsing status, and normalized order counts.
- Supabase PostgreSQL + Drizzle ORM backend with Next.js Route Handlers.
- Better Auth integration with PostgreSQL-backed user, session, account, verification, and role permission tables.
- Role-based access control for Administrator, Head, GT & MT, and Marketplace workspaces.
- Cleaned dataset exports for downstream analysis.
- AI insight logging layer for chatbot questions, generated SQL metadata, chart suggestions, result counts, latency, and errors.

## Supported Data Sources

| Source | Expected file type | Notes |
| --- | --- | --- |
| GT + MT | CSV or Excel exported raw dashboard data | GT rows use `bdcity <> "Agency"`; MT rows use `bdcity = "Agency"`. Province uses `recipient addressprovince`; city uses `recipient addresscity`; district uses `recipient addressarea`; BD/sales uses `BD bd name`; Regional Manager uses `Regional Manager`. |
| Shopee orders | Excel order export | Normalized as Marketplace / Shopee. |
| Shopee income | Excel income export | Used only in Income & Settlement. |
| TikTok Shop Kayou ID orders | CSV or Excel order export | Normalized as Marketplace / TikTok ID. |
| TikTok Shop Kayou ID income | Excel income export | Used only in Income & Settlement. |
| TikTok Shop Kayou Card ID orders | CSV or Excel order export | Normalized as Marketplace / TikTok Card. |
| TikTok Shop Kayou Card ID income | Excel income export | Used only in Income & Settlement. |

GMV for GT and MT is computed from SKU GMV fields at item level. Giveaway and POSM SKUs such as Scratch Card, Poster POSM, and MLBB Display Rack are excluded from reporting metrics.

## Backend Architecture

The backend is implemented with:

- Next.js 16 App Router route handlers.
- Drizzle ORM using PostgreSQL schema and migrations.
- Supabase PostgreSQL for production runtime data.
- Better Auth with PostgreSQL adapter provider `pg`.
- PGlite only for local test/build fallback when no database URL is available.
- XLSX/CSV parsing and normalization services under `src/server/ingestion`.

### Database Schema Coverage

The Drizzle schema includes:

- Authentication and access control: `user`, `session`, `account`, `verification`, `role_permissions`
- Upload pipeline: `upload_batches`, `raw_uploaded_files`, `raw_order_lines`
- Reference data: `channels`, `platforms`, `products`, `product_aliases`, `customers`, `locations`, `order_statuses`
- Sales organization: `regional_managers`, `area_managers`, `sales_hierarchy`
- Normalized business data: `normalized_orders`, `order_items`, `marketplace_orders`
- Reporting and audit: `metrics_snapshots`, `ai_query_logs`, `cleaned_dataset_exports`, `source_field_mappings`, `dedupe_keys`

Deduplication is enforced through order keys, item hashes, file hashes, row hashes, and the `dedupe_keys` table.

## Environment

Create `.env.local` from `.env.example`.

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Required Supabase/PostgreSQL variables:

```bash
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
# POSTGRES_URL_NON_POOLING can also be used for the direct migration connection on Vercel/Supabase setups.
POSTGRES_SSL=require
POSTGRES_PREPARE=false
DRIZZLE_LOG=false
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Guidance:

- `DATABASE_URL` is used by the running Next.js app.
- `DIRECT_DATABASE_URL` is used by Drizzle migrations and should use the direct Supabase database URL.
- `POSTGRES_URL_NON_POOLING` is also supported as a direct migration URL when your deployment platform provides it.
- `POSTGRES_PREPARE=false` avoids prepared-statement problems with Supabase poolers.
- `POSTGRES_SSL=require` should be used for hosted Supabase.
- In production runtime, a real PostgreSQL connection string is required.
- During local build/test without `DATABASE_URL`, the app can use in-memory PGlite so CI and `next build` do not accidentally depend on a developer machine database.

Optional AI chatbot LLM mode:

```bash
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4.1-mini
```

OpenAI-compatible provider mode:

```bash
LLM_API_KEY=your-provider-key
LLM_API_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4.1-mini
LLM_PROVIDER=openai-compatible
```

Without an LLM key, `/api/ai/ask` uses the local semantic fallback.

## Getting Started

```bash
npm install
npm run db:migrate
npm run dev
```

Open:

```text
http://localhost:3000
```

## Migrating Legacy SQLite Data

Older local builds used SQLite. If you have existing uploaded data in that database, migrate it into Supabase PostgreSQL:

```bash
npm run db:migrate
npm run db:migrate:sqlite -- --dry-run
npm run db:migrate:sqlite -- --truncate
```

Migration variables:

```bash
SQLITE_DATABASE_URL=file:./data/omnichannel.sqlite
DIRECT_DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
POSTGRES_SSL=require
MIGRATION_BATCH_SIZE=500
```

Use `--dry-run` first. Use `--truncate` only when the Supabase target should be cleared before importing legacy rows.

## API Routes

| Route | Purpose |
| --- | --- |
| `GET /api/health` | PostgreSQL health check. |
| `POST /api/ingest/files` | Upload and parse raw CSV/XLS/XLSX files. |
| `POST /api/ingest/wipe` | Wipe all uploaded and normalized dashboard data. |
| `GET /api/analytics/summary` | Dashboard analytics payload used by modules. |
| `GET /api/analytics/income` | Income & Settlement analytics payload. |
| `GET /api/analytics/filter-options` | Filter option payload. |
| `GET /api/orders` | Normalized order listing. |
| `GET /api/orders/[orderKey]` | Single order and SKU-level detail. |
| `GET /api/raw/files/[fileId]/lines` | Raw line inspection for an uploaded file. |
| `GET /api/exports/cleaned` | Download cleaned normalized dataset. |
| `GET /api/upload/batches` | Upload batch metadata. |
| `GET /api/upload/files` | Uploaded file metadata. |
| `POST /api/normalize/orders` | Normalize persisted raw rows into reporting tables. |
| `GET /api/metrics/snapshots` | Metrics snapshots. |
| `POST /api/ai/ask` | AI question endpoint. |
| `GET /api/ai/query-logs` | AI query log listing. |
| `GET /api/geo/reverse` | Authenticated reverse-geocode helper for 3D building tooltips. |
| `POST /api/reference/bootstrap` | Bootstrap reference/channel/platform mappings. |
| `GET /api/users` / `POST /api/users` | Administrator-only user management. |
| `PATCH /api/roles/permissions` | Administrator-only role permission management. |
| `POST /api/setup/administrator` | First-user setup endpoint, only available before any user exists. |
| `/api/auth/[...all]` | Better Auth handler. |

## Project Structure

```text
src/app/(dashboard)/        Dashboard pages and layout
src/app/api/                Next.js route handlers
src/components/charts/      ECharts wrapper
src/components/geo/         MapLibre + deck.gl geo map
src/components/layout/      Header, sidebar, route loading overlay
src/components/ui/          Shared UI primitives and cards
src/lib/                    Formatting, download, dashboard client, chart config
src/server/analytics/       Analytics aggregation layer
src/server/db/              Drizzle PostgreSQL schema and database client
src/server/ingestion/       Upload parsing and normalization
drizzle/                    Generated PostgreSQL migrations
public/data/                Geo boundary and basemap assets
scripts/                    Boundary, basemap, and migration scripts
```

## Upload and QA Flow

1. Sign in as Administrator or Head.
2. Open Upload Center.
3. Upload the raw GT/MT file exported from the dashboard.
4. Upload Shopee order export.
5. Upload TikTok Shop Kayou ID export.
6. Upload TikTok Shop Kayou Card ID export.
7. Upload income files for Shopee, TikTok ID, and TikTok Card when settlement reporting is needed.
8. Confirm normalized orders and normalized items are created.
9. Visit Executive Overview, GT Performance, Geo Sales, Marketplace, SKU, Customers, Operations, and Data Quality.
10. Use filters, drilldowns, map interactions, exports, and AI questions to validate reporting behavior.

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

## PWA Support

The dashboard is installable as a Progressive Web App on supported desktop and mobile browsers.

- App manifest is served from `/manifest.webmanifest`.
- Service worker is served from `/sw.js`.
- Offline fallback page is served from `/offline.html`.
- Install icons are available under `public/icons/`, including standard, maskable, and Apple touch icons.
- API routes remain network-only so uploads, authentication, normalization, exports, and analytics always use fresh backend data.
- Static app assets, icons, geo assets, and previously visited pages are cached for faster repeat loading.

For a production PWA check:

```bash
npm run build
npm run start
```

Then open the app over HTTPS, or `localhost` during local development, and verify the browser install prompt is available.

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

At close zoom levels, the map can render optional 3D building extrusions. Building details are intentionally loaded only on right-click rather than hover so the map remains responsive and reverse-geocode requests stay controlled.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start local Next.js development server. |
| `npm run build` | Build production bundle. |
| `npm run start` | Start production server after build. |
| `npm run lint` | Run ESLint. |
| `npm test -- --run` | Run Vitest suite. |
| `npm run db:generate` | Generate Drizzle PostgreSQL migration files. |
| `npm run db:migrate` | Apply Drizzle PostgreSQL migrations. |
| `npm run db:push` | Push schema directly during development. Prefer migrations for production. |
| `npm run db:studio` | Open Drizzle Studio. |
| `npm run db:migrate:sqlite` | Copy legacy SQLite data into Supabase PostgreSQL. |

## Production Notes

- Use a strong `BETTER_AUTH_SECRET` in production.
- Set `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `BETTER_AUTH_TRUSTED_ORIGINS` to the real deployment origin. For Cloudflared, include the exact tunnel origin instead of using wildcards.
- Use Supabase environment variables through deployment secrets, not committed files.
- Keep `POSTGRES_PREPARE=false` when using Supabase poolers.
- Upload, wipe, export, order detail, AI, user, and role endpoints require authenticated role permissions and reject cross-origin mutations.
- Review AI SQL execution rules before enabling unrestricted natural-language querying in production.

## Current Status

Validate the workspace with:

```bash
npm run lint
npm run build
npm test -- --run
```
