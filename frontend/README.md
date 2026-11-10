# CrowdPredict Web

Production-quality React frontend for **CrowdPredict**, a crowdfunding platform where creators can forecast campaign success with a machine-learning model, backers can pledge with transparent reward tiers, and administrators can manage the dataset and model registry.

The app is fully usable without a backend: an in-browser mock API ships with seeded demo data. Point it at a real API by changing one environment variable.

## Features

### Guest / backer
- Browse and filter campaigns by search, category, country, goal range, and sort order.
- Campaign detail pages with funding progress, reward tiers, and model prediction badges.
- Pledge flow with reward selection, validation, and a confirmation state.
- Personal pledge history with totals and campaign links.

### Creator
- Creator studio with campaign cards, status, funding progress, and prediction summaries.
- Create and edit campaigns with validated reward tiers.
- Save as draft or submit for a model prediction in one flow.
- Multi-step prediction experience with progress feedback.
- Prediction result page with probability gauge, plain-language explanation, top-factor chart, and actionable recommendations.
- Prediction history with filtering and links to results.

### Admin
- Dashboard with platform statistics, recent predictions, dataset/model health, and quick actions.
- Dataset upload (CSV drag/drop), validation feedback, progress, listing, and removal.
- Model registry with version comparison chart, metric drill-down, confusion matrix, feature importance, and activation confirmation.
- Training workflow with algorithm cards, dataset selection, hyperparameter validation, simulated asynchronous progress, and challenger activation.
- User directory with search, role changes, and account activation/deactivation.
- Role-aware navigation, protected routes, access-denied and 404 states.

### Cross-cutting
- Warm Heritage Intelligence design system from `stitch_crowdpredict_web_app`.
- Responsive layouts, keyboard-accessible dialogs/forms, visible focus states, and reduced-motion support.
- Toast notifications, skeleton loading states, empty states, and inline API error handling.
- Typed API layer, TanStack Query caching, React Hook Form + Zod validation, and strict TypeScript.

## Tech stack

- React 18 + TypeScript 5 (strict)
- Vite 6
- React Router 6
- TanStack Query 5
- Axios + custom mock adapter
- React Hook Form + Zod
- Tailwind CSS 3
- Recharts
- Material Symbols (CDN)
- Inter and JetBrains Mono (Google Fonts)

## Quick start

```bash
cd frontend
npm install
copy .env.example .env      # Windows PowerShell
# cp .env.example .env      # macOS/Linux
npm run dev
```

Open `http://localhost:5173`.

### Demo accounts

Mock mode is enabled by default. Use any of these accounts on the sign-in screen:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@crowdpredict.app` | `admin123` |
| Creator | `ayesha@ecobottle.io` | `creator123` |
| Backer | `backer@crowdpredict.app` | `backer123` |

Additional seeded accounts exist for creators and backers; the login screen exposes the three primary demo accounts for convenience.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Preview the production build on port 4173 |
| `npm run lint` | Run ESLint over `.ts`/`.tsx` files |
| `npm run typecheck` | Run `tsc --noEmit` |

## Environment variables

Copy `.env.example` to `.env` and adjust as needed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base URL for API requests. Keep `/api` to use the Vite proxy. |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Origin the dev server proxies `/api` to. |
| `VITE_PROXY_REWRITE` | `true` | Strip `/api` before forwarding. Set to `false` if backend routes include `/api`. |
| `VITE_USE_MOCK` | `true` | Use the seeded in-browser mock adapter. Set to `false` for a real backend. |

To use a real backend:

```env
VITE_USE_MOCK=false
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:5000
VITE_PROXY_REWRITE=true
```

With the defaults above, a frontend request to `/api/auth/login` is proxied to `http://localhost:5000/auth/login`. If the backend mounts its routes under `/api` (for example `/api/auth/login`), set `VITE_PROXY_REWRITE=false`.

For production, set `VITE_API_URL` to the deployed backend base URL, including any path prefix the backend uses. The proxy is dev-only.

The Axios client attaches `Authorization: Bearer <token>` from `localStorage`. A `401` response clears the token and broadcasts `cp:unauthorized`, which resets auth state and clears the query cache. Other requests time out after 20 seconds; dataset uploads get 120 seconds and model training gets 300 seconds.

## Project structure

```
frontend/
├─ src/
│  ├─ api/                 # Typed API clients (auth, campaigns, pledges, predictions, admin)
│  ├─ components/
│  │  ├─ campaign/         # Campaign card, artwork, prediction badge, pledge modal
│  │  ├─ layout/           # Navbar, footer, app/auth layouts, admin tabs
│  │  └─ ui/               # Buttons, fields, cards, table, modal, charts, skeletons
│  ├─ contexts/            # Auth and toast providers
│  ├─ lib/
│  │  ├─ mock/             # Seed database, localStorage DB, Axios mock adapter
│  │  ├─ api.ts            # Axios instance, interceptors, error helpers
│  │  ├─ auth.ts           # Role home and safe redirect helpers
│  │  ├─ constants.ts      # Countries, roles, algorithms, hyperparameters, demo accounts
│  │  ├─ format.ts         # Currency, date, number, factor formatting
│  │  └─ token.ts          # Token and user cache
│  ├─ pages/               # Auth, campaigns, backer, creator, admin, misc
│  ├─ types/               # Shared domain types
│  ├─ App.tsx              # Route map and role guards
│  ├─ main.tsx             # Providers and app bootstrap
│  └─ index.css            # Tailwind layers, Material Symbols, reduced motion
├─ tailwind.config.ts      # Design tokens (colors, type scale, radii, shadows)
└─ vite.config.ts          # React plugin, `@` alias, dev proxy
```

## Mock API

The mock adapter lives in `src/lib/mock/adapter.ts`. It implements the same routes the real API is expected to expose and persists mutations to `localStorage`.

- Database key: `cp_mock_db_v1`
- Schema version: `DB_VERSION = 3` (bumping it reseeds the database)
- Reset demo data: open DevTools → Application → Local Storage, delete `cp_mock_db_v1`, then reload.
- Normal requests resolve after ~140–320 ms; dataset upload takes ~900 ms; model training takes ~1.4 s.
- Uploading a dataset records the file name and a generated row count; file contents are not parsed.
- Training returns deterministic metrics derived from the dataset size and hyperparameters.
- Running a prediction on a draft campaign moves it to `SUBMITTED`.
- The active model is seeded as `Random Forest v3`.

### Seeded data

- 10 users across admin, creator, and backer roles (one inactive backer)
- 7 categories
- 12 campaigns (10 live/evaluated, 2 drafts)
- 10 predictions
- 8 pledges
- 4 datasets
- 4 model versions

## Assumed backend contract

No backend or OpenAPI/Swagger specification was available in the repository. The frontend is implemented against the following assumed contract, reflected in `src/types/index.ts` and `src/api/index.ts`:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/login` | Sign in, returns `{ token, user }` |
| `POST` | `/auth/register` | Register backer/creator, returns `{ token, user }` |
| `GET` | `/auth/me` | Hydrate current user |
| `POST` | `/auth/logout` | Invalidate session |
| `GET` | `/categories` | Category list |
| `GET` | `/campaigns` | Paginated campaign list with filters |
| `GET` | `/campaigns/:id` | Campaign detail |
| `POST` | `/campaigns` | Create campaign |
| `PUT` | `/campaigns/:id` | Update campaign |
| `DELETE` | `/campaigns/:id` | Delete campaign |
| `POST` | `/campaigns/:id/pledges` | Create pledge |
| `GET` | `/pledges/mine` | Current user's pledges |
| `POST` | `/predictions` | Run prediction for `{ campaignId }` |
| `GET` | `/predictions` | Paginated prediction history |
| `GET` | `/predictions/:id` | Prediction detail |
| `GET` | `/admin/stats` | Dashboard statistics |
| `GET` | `/admin/datasets` | Dataset list |
| `POST` | `/admin/datasets` | Multipart CSV upload |
| `DELETE` | `/admin/datasets/:id` | Remove dataset |
| `GET` | `/admin/models` | Model version list |
| `POST` | `/admin/models/train` | Train model |
| `GET` | `/admin/models/:id/metrics` | Evaluation metrics |
| `PATCH` | `/admin/models/:id/activate` | Promote model |
| `GET` | `/admin/users` | User list, optional `search` |
| `PATCH` | `/admin/users/:id/role` | Change role |
| `PATCH` | `/admin/users/:id/status` | Activate/deactivate account |

All paths above are relative to `VITE_API_URL`. In development the proxy strips `/api` by default, so the backend should expose `/auth/login`, `/campaigns`, and so on. Set `VITE_PROXY_REWRITE=false` if the backend exposes `/api/auth/login`, `/api/campaigns`, and so on.

List endpoints are expected to return `{ items, total, page, pageSize, totalPages }` except `/pledges/mine`, `/admin/datasets`, `/admin/models`, and `/admin/users`, which return arrays.

**Contract extension:** `campaignApi.mine()` calls `GET /campaigns?mine=true&pageSize=100`. The assumed contract only documented a generic campaign list, so the real backend must support the `mine` filter (or the frontend should be adapted to a creator-specific endpoint if one exists).

### Integration contract details

- **Auth response:** `POST /auth/login` and `POST /auth/register` return `{ token, user }`. `user.role` must be `admin`, `creator`, or `backer`.
- **Campaign updates:** `PUT /campaigns/:id` should preserve existing reward IDs supplied in `rewards[].rewardId`; new rewards omit `rewardId`. Omitting an existing reward removes it.
- **Campaign status:** creating or saving a new campaign sends `status: "DRAFT"`; editing an existing campaign preserves its current status unless the prediction flow changes it. Running a prediction on a draft moves it to `SUBMITTED`.
- **Prediction response:** `POST /predictions` receives `{ campaignId }` and returns the created prediction with `predictionId`, `probability`, `label`, `topFactors`, `createdAt`, and `modelVersion`. It must also move a draft campaign to `SUBMITTED`.
- **Dataset upload:** `POST /admin/datasets` is `multipart/form-data` with a single field named `file`. The client lets the browser set the multipart boundary.
- **Admin stats:** `GET /admin/stats` returns the nested `AdminStats` shape defined in `src/types/index.ts` (`users`, `campaigns`, `predictions`, `models`).
- **Pagination:** campaign and prediction lists are paginated; the client sends `page` and `pageSize`. `campaignApi.mine()` also sends `mine=true`.
- **Authorization scope:** `GET /predictions` and `GET /predictions/:id` must be scoped to the authenticated creator (admins may see all). `GET /pledges/mine` must be scoped to the authenticated backer. `GET /campaigns?mine=true` must be scoped to the authenticated creator.
- **Campaign filters:** `GET /campaigns` accepts `search`, `category` (category ID or name), `country`, `minGoal`, `maxGoal`, `page`, `pageSize`, and `mine`. Public listings should exclude drafts; `mine=true` should include the caller's drafts.
- **Numbers:** probabilities, model metrics, and factor contributions may be returned as 0–1 ratios or 0–100 percentages. The UI normalizes both, but 0–1 ratios are preferred.
- **Errors:** return a JSON body with `message` and optional `errors` (field name to message). The client also accepts `detail`, `error`, `title`, `validationErrors`, `violations`, FastAPI-style `detail` arrays (`loc`/`msg`), and arrays of `{ field, message }` objects. Field keys such as `body.title` or `rewards[0].description` are normalized for form binding.
- **Status codes:** `401` clears the session unless it came from login/register. `403`, `404`, `409`, `413`, `422`, `429`, and `5xx` are surfaced as readable messages.
- **Enum values:** campaign status is `DRAFT` or `SUBMITTED`; prediction label is `Likely Success` or `Likely Fail`; model algorithm is `LogisticRegression`, `RandomForest`, or `XGBoost`; role is `admin`, `creator`, or `backer`; dataset status is `validated`, `archived`, or `processing`; model training status is `training`, `ready`, or `failed`.

## Known gaps and limitations

- **No backend documentation was available.** All endpoint paths, payloads, status codes, and error shapes are assumptions and should be verified against the real API.
- **Payments are simulated.** Pledges update mock state only; no payment provider is integrated.
- **Dataset parsing is simulated.** The mock does not validate CSV columns or content.
- **Training is simulated.** There is no job queue, polling endpoint, or persisted model artifact in mock mode.
- **No admin user creation endpoint.** Admins can change roles and status but cannot invite users from this UI.
- **No password reset, email verification, or profile editing** flows were part of the provided design/requirements.
- **Role changes apply on next session.** The mock updates the user record; the current JWT/session is not re-issued.
- **Self-protection rules** prevent an admin from changing their own role or deactivating their own account in the mock adapter.
- **Bundle size** is dominated by Recharts; route-level code splitting and manual chunks are already configured.
- **ESLint** has targeted overrides for context and UI files that intentionally export non-components alongside components.

## Design notes

Design tokens are centralized in `tailwind.config.ts`; avoid hard-coded hex values in components. Core tokens include:

- Canvas `#f2f0eb`, surface `#fbf9f4`, card `#ffffff`
- Brand `#006241`, action `#00754a`, house `#1e3932`, mint `#d4e9e2`
- Gold `#cba258`, danger `#c82014`, warning `#fbbc05`
- 12px card radius, pill buttons, floating-label fields, paper/modal shadows

Material Symbols are loaded from the Google Fonts CDN in `index.html`; the app expects network access for icons and fonts. Provide self-hosted font files if the deployment must run fully offline.
