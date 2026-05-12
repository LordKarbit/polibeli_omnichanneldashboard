# Polibeli Omnichannel Dashboard

Enterprise-grade omnichannel business intelligence dashboard for GT, MT / Agency, Shopee, TikTok Shop Kayou ID, TikTok Shop Kayou Card ID, and settlement reporting.

The application converts raw operational marketplace and field-sales exports into normalized orders, SKU-level order items, cleaned customer/product/location data, role-scoped dashboards, drilldown analytics, geospatial GMV maps, downloadable cleaned datasets, and AI-assisted business answers.

> The Next.js application lives in the `app/` directory. Run all npm commands from `app/`.

## Executive Summary

Polibeli Omnichannel Dashboard is designed for management-level commercial reporting where leadership needs one reliable view of channel performance, regional execution, customer retention, marketplace order health, income settlement, and geo sales coverage.

The system is built around uploaded operational files. Every KPI, chart, table, popup, filter, and export is intended to come from the normalized SQLite database after ingestion, not from mock data.

## Key Capabilities

- Executive Overview for booked GMV, active GMV, orders, cancellations, channel mix, trend movement, risk alerts, and top performers.
- GT Performance centered on Regional Manager comparison, Area Manager drilldown, BD/sales visibility, customer retention, city ranking, SKU pareto, and transaction details.
- MT / Agency reporting separated from GT by the raw `bdcity = Agency` rule.
- Marketplace Sales Performance grouping Shopee, TikTok ID, and TikTok Card into one Marketplace lens with source-specific analytics when a marketplace is selected.
- Income & Settlement control center for Shopee, TikTok Shop, and Tokopedia-related purchase channels, kept separate from Sales Performance release-payment data.
- Geo Sales map built with MapLibre GL JS and deck.gl, dynamic GMV city boundaries, GT district drilldown, channel filters, cancellation heat basis, clear map mode, exportable map screenshots, and optional 3D buildings.
- Upload Center with channel-specific replacement semantics: uploading a new file for a channel replaces the previous data for that channel, while GT and MT share one raw dashboard upload source.
- Customer analytics with role-scoped customer visibility and retention tracking.
- AI chatbot with local semantic fallback and optional LLM integration when an API key is configured.
- Better Auth login, role-based access control, user management, and role permission editing.
- PWA install support for desktop and mobile browsers.

## Roles and Permissions

| Role | Access |
| --- | --- |
| Administrator | Full access, including Upload Center, User Management, wipe data, exports, permissions, and all dashboards. |
| Head | Full reporting and upload access except User Management. |
| GT & MT | GT/MT-focused reporting. No User Management, Upload Center, Marketplace, or Income pages. Customer data is scoped to GT/MT. |
| Marketplace | Marketplace-focused reporting. No User Management, Upload Center, GT Performance, or MT/Agency pages. Customer data is scoped to Marketplace. |

The first administrator is created through the login/setup screen when no user exists yet. After that, public sign-up is disabled and users are created by an Administrator.

## Supported Upload Sources

| Source | File type | Classification and important fields |
| --- | --- | --- |
| GT + MT raw dashboard | CSV / XLS / XLSX | GT uses `bdcity <> "Agency"`; MT uses `bdcity = "Agency"`. Province uses `recipient addressprovince`, city uses `recipient addresscity`, GT district uses `recipient addressarea`, Regional Manager uses `Regional Manager`, and BD/sales uses `BD bd name`. |
| Shopee orders | XLS / XLSX | Normalized as Marketplace / Shopee. |
| Shopee income | XLS / XLSX | Used only inside Income & Settlement. |
| TikTok Shop Kayou ID orders | CSV / XLS / XLSX | Normalized as Marketplace / TikTok ID. |
| TikTok Shop Kayou ID income | XLS / XLSX | Used only inside Income & Settlement. |
| TikTok Shop Kayou Card ID orders | CSV / XLS / XLSX | Normalized as Marketplace / TikTok Card. |
| TikTok Shop Kayou Card ID income | XLS / XLSX | Used only inside Income & Settlement. |

Giveaway/POSM SKUs are excluded from reporting metrics across menus:

- Scratch Card
- Poster POSM
- MLBB Display Rack

## Marketplace GMV Logic

Marketplace Sales Performance keeps order sales metrics separate from settlement/released payment metrics.

- Sales Performance focuses on booked GMV, active GMV, order status, cancellation, products, buyers, and operational performance.
- Income & Settlement focuses on released amount, settlement reconciliation, fees, adjustments, and payout visibility.

Shopee released amount logic is intentionally kept in Income & Settlement. Shopee order exports can reconstruct a payment-like amount from unique order payment, row-level Shopee voucher support, and unique buyer shipping payment, but that value should not pollute the Sales Performance tab.

## Geo Sales Map

The Geo Sales map combines:

- MapLibre GL JS for the map engine and base layers.
- deck.gl `GeoJsonLayer` for dynamic GMV polygon rendering.
- Prepared city and district boundary GeoJSON generated from `VILLAGE-SUB-DISTRICT BOUNDARIES.kml`.
- OpenFreeMap vector tiles for optional 3D building extrusion.
- A protected reverse-geocode API route for building tooltip addresses.

Map behavior:

- Only boundaries with available GMV/cancellation value are shown.
- City-level boundaries appear dynamically based on uploaded data.
- GT-only mode supports city right-click drilldown into district-level GMV heat intensity.
- Boundary hover shows Total GMV and channel breakdown.
- Boundary left-click opens detailed transaction popup.
- `3D buildings` toggle appears only at close zoom levels.
- When 3D is active, building detail appears on right-click, not hover, to keep the map light.
- Middle mouse drag, or holding `O` while dragging, enables orbit interaction in 3D mode.

## Architecture

```text
Root
  app/                         Next.js application
    src/app/(dashboard)/        Dashboard pages and protected layouts
    src/app/api/                Route handlers
    src/components/             UI, layout, charts, PWA, and geo components
    src/lib/                    Client utilities, formatters, RBAC, chart config
    src/server/analytics/       Analytics aggregation
    src/server/db/              Drizzle schema and database client
    src/server/ingestion/       Upload parsing and normalization
    drizzle/                    Drizzle migrations
    public/                     PWA assets and generated geo assets
    scripts/                    Data preparation scripts
```

## Technology Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- ECharts
- MapLibre GL JS
- deck.gl
- Drizzle ORM
- SQLite / libSQL through `@libsql/client`
- Better Auth
- XLSX parsing
- PWA manifest and service worker

## Database Scope

The schema covers:

- Authentication: users, sessions, accounts, verification records.
- Authorization: role permissions.
- Upload pipeline: upload batches, raw files, raw order lines.
- Reference data: channels, platforms, products, product aliases, customers, locations, statuses.
- Sales hierarchy: Regional Managers, Area Managers, BD/sales relationships.
- Business data: normalized orders, order items, marketplace orders.
- Reporting and audit: metrics snapshots, cleaned dataset exports, AI query logs, source field mappings, dedupe keys.

Deduplication is supported through order keys, file hashes, row hashes, item hashes, and persisted dedupe keys.

## API Surface

Important route handlers include:

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Database health check. |
| `POST /api/ingest/files` | Upload and parse channel files. |
| `POST /api/ingest/wipe` | Wipe uploaded and normalized data. |
| `GET /api/analytics/summary` | Main analytics payload for dashboard pages. |
| `GET /api/analytics/income` | Income & Settlement analytics payload. |
| `GET /api/analytics/filter-options` | Filter option payload. |
| `GET /api/orders` | Normalized orders. |
| `GET /api/orders/[orderKey]` | Order and SKU-level detail. |
| `GET /api/raw/files/[fileId]/lines` | Raw uploaded line inspection. |
| `GET /api/exports/cleaned` | Download cleaned normalized datasets. |
| `GET /api/upload/batches` | Upload batch metadata. |
| `GET /api/upload/files` | Uploaded file metadata. |
| `POST /api/normalize/orders` | Normalize stored raw rows. |
| `GET /api/metrics/snapshots` | Snapshot history. |
| `POST /api/ai/ask` | Chatbot answer endpoint. |
| `GET /api/ai/query-logs` | AI query audit logs. |
| `GET /api/geo/reverse` | Authenticated reverse geocode helper for 3D building tooltips. |
| `GET /api/users` / `POST /api/users` | Administrator user management. |
| `PATCH /api/users/[userId]` | Update users. |
| `PATCH /api/roles/permissions` | Administrator role permission management. |
| `POST /api/setup/administrator` | First administrator setup. |
| `/api/auth/[...all]` | Better Auth handler. |

## Getting Started

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Configure environment

Create `app/.env.local`:

```bash
DATABASE_URL=file:./data/omnichannel.sqlite
DATABASE_AUTH_TOKEN=
DRIZZLE_LOG=false
BETTER_AUTH_SECRET=replace-with-a-secure-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional LLM mode for the chatbot:

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

Without an LLM key, the chatbot automatically uses the local semantic fallback.

### 3. Run migrations

```bash
npm run db:migrate
```

### 4. Start the app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

Run from `app/`.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build production bundle. |
| `npm run start` | Start production server after build. |
| `npm run lint` | Run ESLint. |
| `npm test -- --run` | Run Vitest suite. |
| `npm run db:generate` | Generate Drizzle migrations. |
| `npm run db:migrate` | Apply Drizzle migrations. |
| `npm run db:studio` | Open Drizzle Studio. |

## QA Checklist

- Upload GT/MT raw file and confirm GT/MT classification from `bdcity`.
- Upload each marketplace order source separately.
- Upload each income source separately.
- Confirm channel replacement semantics: a new upload for the same channel replaces previous channel data.
- Validate booked GMV and active GMV by channel.
- Validate Shopee released amount inside Income & Settlement only.
- Check global filters per page and staged apply/reset behavior.
- Drill from dashboard cards/charts into order-level detail and SKU-level detail.
- Validate Geo Sales city boundaries, GT district drilldown, 3D building mode, and map export.
- Validate role scopes for Administrator, Head, GT & MT, and Marketplace.
- Run lint, tests, and production build.

## Validation Status

Current workspace validation:

```bash
npm run lint
npm test -- --run
npm run build
```

All three commands pass.

## Deployment Notes

- Use a strong `BETTER_AUTH_SECRET`.
- Set `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `BETTER_AUTH_TRUSTED_ORIGINS` to the exact deployed origin.
- For Cloudflared tunnels, include the tunnel origin in trusted origins.
- Do not commit raw business files, uploaded source files, SQLite databases, local logs, `.env*`, `.next`, or `node_modules`.
- Use persistent storage for SQLite, or point `DATABASE_URL` to managed libSQL/Turso for production.
- Keep upload, wipe, export, order detail, AI, user, and role APIs behind authenticated role permissions.

## Data Privacy

This repository intentionally ignores raw sample files, income/order exports, local SQLite databases, generated logs, and the original KML source file. The committed codebase should contain application code, migrations, generated lightweight assets, and documentation only.
