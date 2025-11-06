# Packhouse API Maintenance Checklist

This project now pulls packhouse metrics directly from TeamDesk. The legacy Python scripts, schema-map exports, and CSV snapshots that were used during the migration have been removed. Keep the following assets in place when working on the API:

## Required data files

- `public/data/<client>/master-config.csv`
  - Authoritative mapping for variety → PUC → block.
  - Consumed by `lib/master-config.ts` and the `useMasterConfig*` hooks.
- `public/data/<client>/api/teamdesk_block_power_bi.csv`
  - Supplemental lookup that resolves free-form block identifiers to canonical block codes and PUCs.
  - Loaded by `app/api/packhouse/temporal/route.ts` via `loadBlockLookup`.

> Tip: keep the CSV structure stable (at minimum `Block No`, `Id`, `@row.id`, and `Production Unit Name`). Additional columns are ignored.

## Environment variables

Set these in `.env.local` (or the appropriate deployment environment) so the API route can reach TeamDesk:

| Variable | Purpose |
| --- | --- |
| `TEAMDESK_DOMAIN` | Domain of the TeamDesk instance (default `appnostic.dbflex.net`). |
| `TEAMDESK_APP_ID` | TeamDesk application ID (default `75820`). |
| `TEAMDESK_TABLE` | Table name to query (default `Palletizing`). |
| `TEAMDESK_VIEW` | View name that scopes the query (default `BI_Palletizing`). |
| `TEAMDESK_FILTER` | Optional filter expression appended to every request. |
| `TEAMDESK_PAGE_SIZE` | Optional page size for pagination (default `500`). |
| `PACKHOUSE_CACHE_TTL_MS` | Optional API cache TTL (default 5 minutes). |
| `TEAMDESK_TOKEN` **or** `TEAMDESK_USER` / `TEAMDESK_PASSWORD` | Credentials used to authenticate requests. |

Only one authentication strategy is required: either provide an API token or a user/password pair.

## TeamDesk `BI_Palletizing` field reference

The TeamDesk view that feeds the API provides the columns below. Data types reflect the values returned by the JSON API and the historic CSV snapshot (`teamdesk_palletizing_bi.csv`). Use this table when auditing payloads or expanding the integration.

| Column | Type | Purpose / examples | Used in code |
| --- | --- | --- | --- |
| `Timestamp` | DateTime | Preferred event timestamp when present. | Primary date in `resolveIsoDate` |
| `Date Modified` | DateTime | Fallback timestamp if `Timestamp` missing. | `resolveIsoDate` |
| `Date Completed` | DateTime | Fallback timestamp if others missing. | `resolveIsoDate` |
| `Date Created` | DateTime | Last-resort timestamp. | `resolveIsoDate` |
| `Seasons` | Text/Number | Season value; numeric years are normalized. | `resolveSeason` |
| `Cultivar` | Text | Primary variety label. | `resolveVariety` |
| `Variety` | Text | Secondary variety label if cultivar empty. | `resolveVariety` |
| `Client` | Text | Distributor/brand heuristics; also part of weight key. | `getHeuristicKeyParts`, `resolveDistributor`, `resolveMarket` |
| `Brand` | Text | Distributor/market alias source. | `resolveDistributor`, `resolveMarket` |
| `Client Order` | Text | Distributor alias source. | `resolveDistributor` |
| `Pack Type` | Text | Weight heuristic key and distributor alias source. | `getHeuristicKeyParts`, `resolveDistributor` |
| `Target Market` | Text | Distributor/market alias source. | `resolveDistributor`, `resolveMarket` |
| `Target Country` | Text | Market alias source. | `resolveDistributor`, `resolveMarket` |
| `Count/Size` | Number | Fruit count per pack; drives spread mapping. | `getHeuristicKeyParts`, `resolveSpread` |
| `Pack QTY` | Number | Number of packs on the pallet. | Weight maths, class/spread/distributor tallies |
| `Packaging Weight` | Number (kg) | Packaging mass; included in gross estimation. | Weight heuristics |
| `Pallet Weight` | Number (kg) | Reported pallet gross weight. | Weight heuristics |
| `Weight` | Number (kg) | Reported net weight. | Weight heuristics |
| `Grade` | Text | Primary grade indicator. | `resolveGradeClass` |
| `Class` | Text | Secondary grade field. | `resolveGradeClass` |
| `Block` | Text | Human-entered block identifier. | `resolveBlock`, PUC fallback |
| `Block No` | Text/Number | Structured block identifier. | `resolveBlock`, PUC fallback |
| `Production Unit Name` | Text | Primary PUC value. | `resolvePuc` |
| `Production Unit` | Text | Alternate PUC field. | `resolvePuc` |
| `PUC` | Text | Alternate PUC field. | `resolvePuc` |
| `PUC Name` | Text | Alternate PUC field. | `resolvePuc` |
| `Pallet ID` | Text | Pallet/bin identifier. | Record bin count |
| `Id` | Number/Text | TeamDesk record ID; also aids PUC mapping. | `resolvePuc`, bin ID fallback |
| `@row.id` | Number/Text | View row ID; aids PUC mapping. | `resolvePuc` |

> Note: TeamDesk may expose additional columns. The API currently ignores them, but you can verify all fields by requesting `https://<domain>/secure/api/v2/<app>/<table>/<view>/select.json?top=1` with your credentials.

## Runtime behavior

- API endpoint: `app/api/packhouse/temporal/route.ts`.
- Force a cache refresh by adding `?refresh=1` to the request URL.
- Front-end consumers (`usePackhouseData`, Packhouse pages) expect records to include the resolved PUC; the API automatically falls back to the block lookup when TeamDesk rows omit it.

## Verification steps after changes

1. `npm run lint`
2. `npm run dev` and hit `/api/packhouse/temporal?client=<slug>&refresh=1`
3. Confirm Packhouse dashboards render and filters cascade Variety → PUC → Block correctly.

With the Python tooling removed, the Node/Next.js toolchain is the only dependency required to maintain the packhouse integration.
