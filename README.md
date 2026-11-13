# CrowdFunding Campaign Success Prediction System

A full-stack crowdfunding platform where creators can forecast whether a campaign will succeed, backers can pledge against transparent reward tiers, and administrators can upload datasets, train models, and control which model version is live.

The prediction engine is explainable: every score comes with a probability, a plain-language explanation, and the factors that pushed the result up or down.

**Stack at a glance:** React 18 + TypeScript (strict) · Spring Boot 3.3.5 (Java 21) · PostgreSQL / H2 · Flyway · JWT · Smile 3 (in-process ML)

![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.5-6DB33F?logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Backend tests](https://img.shields.io/badge/backend%20tests-20%20passing-brightgreen)

> **Status:** complete and verified — backend unit tests pass, the frontend passes lint/typecheck/build, and the full role-based flow (creator → backer → admin) was exercised end to end against a live Postgres database.

---

## Table of contents

- [What it does](#what-it-does)
- [Feature highlights](#feature-highlights)
- [Architecture](#architecture)
- [How the prediction engine works](#how-the-prediction-engine-works)
- [Technical stack](#technical-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
  - [Option 1 — Frontend only, no backend](#option-1--frontend-only-no-backend)
  - [Option 2 — Backend + frontend, no database server](#option-2--backend--frontend-no-database-server)
  - [Option 3 — PostgreSQL (Neon or Docker)](#option-3--postgresql-neon-or-docker)
- [Demo accounts](#demo-accounts)
- [API overview](#api-overview)
- [Configuration](#configuration)
- [Verification and scripts](#verification-and-scripts)
- [Design system](#design-system)
- [Documentation](#documentation)
- [Known limitations](#known-limitations)

---

## What it does

| Role | What they can do |
| --- | --- |
| **Guest / backer** | Browse, search, and filter campaigns; open campaign details; pledge with reward selection; review personal pledge history. |
| **Creator** | Create and edit campaigns with validated reward tiers; save drafts; request a success prediction; view the score, gauge, explanation, and top factors; browse prediction history. |
| **Admin** | Monitor platform statistics; upload and remove training datasets; train Logistic Regression, Random Forest, or XGBoost; compare metrics; activate a model version; manage users, roles, and account status. |

<p align="center">
  <img src="stitch_crowdpredict_web_app/browse_campaigns/screen.png" width="360" alt="Browse campaigns — UI design reference" />
</p>

<p align="center"><em>Design reference from the Stitch workspace — the shipped React app implements this warm, editorial visual language.</em></p>

---

## Feature highlights

### Prediction experience

- Multi-step scoring flow with a probability gauge, success/fail label, and model version shown on the result.
- **Signed** factor contributions (for example `+18% backer velocity`, `−7% goal size`) rendered as a chart and explanatory copy.
- Predictions are snapshotted: the model version, algorithm, probability, factors, and explanation are stored at scoring time.
- Running a prediction on a draft campaign publishes it, so backers can discover it immediately.

### Campaign management

- Full CRUD for campaigns with reward tiers, including reward reconciliation on edit (update, add, remove).
- Server-side validation with field-level errors bound back into the form.
- Draft privacy: a draft is visible only to its owner and admins; anyone else gets a `404`, not a `403`.
- Country whitelist and normalized ISO codes to keep feature extraction deterministic.

### Admin and ML operations

- CSV dataset upload with header parsing, real row/feature counts, and a 50 MB limit.
- Synchronous training with dataset selection, algorithm cards, and range-validated hyperparameters.
- Holdout metrics: accuracy, precision, recall, F1, and ROC-AUC, plus normalized feature importances.
- One active model at a time, activated transactionally; the registry invalidates its cached artifact immediately.
- User directory with role changes and activation/deactivation, including self-protection rules.

### Engineering

- Typed API layer, TanStack Query caching, React Hook Form + Zod validation, strict TypeScript.
- Role-aware routing, protected routes, skeleton states, empty states, toasts, and keyboard-accessible dialogs.
- Seeded demo data so both the mock frontend and a fresh backend are demo-ready on first boot.
- Portable Flyway migrations that run unchanged on PostgreSQL and H2.

---

## Architecture

```mermaid
flowchart LR
  UI["React 18 SPA<br/>Vite · TanStack Query"] -->|"HTTP /api · Bearer JWT"| API["Spring Boot 3.3<br/>REST controllers"]
  API --> SEC["Spring Security<br/>JWT filter"]
  API --> SVC["Services<br/>validation · rules"]
  SVC --> REPO["Spring Data JPA"]
  REPO --> DB[("PostgreSQL 16<br/>or H2")]
  SVC --> REG["Model registry<br/>active model cache"]
  REG --> ART[("Serialized artifacts<br/>data/models/*.ser")]
  SVC --> DS[("CSV datasets<br/>data/datasets")]
  REG --> SMILE["Smile 3<br/>LR · RF · gradient boosting"]
```

### Request path

```
HTTP ─▶ JWT filter ─▶ controller ─▶ service ─▶ repository ─▶ database
                                      │
                                      ├─▶ model registry ─▶ trained artifact ─▶ Smile classifier
                                      └─▶ exception handler ─▶ { message, errors }
```

The frontend can run in two modes without code changes:

1. **Mock mode (default for a fresh clone)** — an Axios adapter backed by `localStorage` serves the same routes with seeded data. No server required.
2. **Live mode** — the same typed clients hit the Spring Boot API through the Vite dev proxy.

The mock and the real backend are deliberately contract-compatible, so switching modes is an environment-variable change.

---

## How the prediction engine works

### Features (fixed order, shared by training and inference)

```
goalAmount, durationDays, goalPerDay, rewardCount, descriptionLength,
titleLength, backerCount, categoryId, countryIndex
```

Features are derived from the stored campaign by one function (`FeatureSpec.fromCampaign`), so there is no train/serve skew. Means and standard deviations are computed on the training split, serialized with the artifact, and reused at inference.

### Algorithms

| API name | Implementation | Hyperparameters |
| --- | --- | --- |
| `LogisticRegression` | Smile L2 binomial logistic regression | `C`, `max_iter` |
| `RandomForest` | Smile random forest | `n_estimators`, `max_depth` |
| `XGBoost` | Smile `GradientTreeBoost` (gradient-boosted trees) | `learning_rate`, `n_estimators` |

> `XGBoost` is kept as the API-facing algorithm name because the UI, docs, and UML agree on it. The implementation uses Smile's pure-Java gradient-boosted trees, which avoids native binaries while staying in the same algorithm family. This deviation is documented in the backend guide.

### Training pipeline

1. Validate the request: algorithm, dataset, and hyperparameter ranges.
2. Parse the CSV, skipping unusable rows; require at least 10 usable rows and both classes.
3. Shuffle with a fixed seed and split 80/20.
4. Compute feature means/std on the train split and standardize both splits.
5. Fit the classifier and evaluate on the holdout.
6. Compute accuracy, precision, recall, F1, ROC-AUC, and feature importances.
7. Persist the version and the serialized artifact; activation is a separate admin action.

### Explainability

- **Tree models** use TreeSHAP for additive signed contributions.
- **Logistic regression / no SHAP** uses a one-at-a-time probe that resets a feature to the training mean and measures the probability delta.
- Factors are capped at six, signed, and scaled to a combined absolute budget so the chart communicates direction rather than raw importance.
- Friendly feature names (`backerCount` → `backerVelocity`, `countryIndex` → `country`, `categoryId` → `category`) are used in the API and UI.
- If no artifact can be loaded, a heuristic predictor keeps the demo working instead of returning an error.

---

## Technical stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript 5.7 (strict), Vite 6, React Router 6 |
| Data fetching / forms | TanStack Query 5, Axios, React Hook Form, Zod |
| Styling / charts | Tailwind CSS 3, Recharts, Material Symbols (CDN) |
| Backend | Java 21, Spring Boot 3.3.5, Spring Web, Spring Data JPA, Spring Security |
| Auth | JWT HS256 (jjwt 0.12.6), BCrypt |
| Database | PostgreSQL 16 (Neon or Docker Compose) · H2 in PostgreSQL mode for tests/local |
| Migrations | Flyway (ANSI-portable DDL) |
| Machine learning | Smile 3.0.2 (pure Java) |
| API docs | springdoc-openapi / Swagger UI |
| Build | Maven wrapper (backend), npm + Vite (frontend) |

---

## Repository layout

```
CrowdFunding-Prediction-System/
├── backend/                       Spring Boot API
│   ├── src/main/java/com/crowdpredict/
│   │   ├── config/                Security, demo seeder, demo bootstrap
│   │   ├── domain/                JPA entities (User, Campaign, Pledge, …)
│   │   ├── repository/            Spring Data repositories
│   │   ├── security/              JWT service, filter, current-user plumbing
│   │   ├── service/               Auth, campaigns, pledges, predictions, admin, training
│   │   ├── ml/                    Feature spec, trainer, registry, explainer, CSV reader
│   │   └── web/                   Controllers, DTOs, global error handler
│   ├── src/main/resources/
│   │   ├── application.yml        Default configuration
│   │   ├── application-local.yml  H2 file database profile
│   │   └── db/migration/          Flyway V1 schema, V2 reference data
│   ├── src/test/java/             Unit tests for features, hyperparameters, CSV, trainer
│   ├── Dockerfile · docker-compose.yml · .env.example
│   └── README.md                  Backend guide and full contract
├── frontend/                      React single-page app
│   ├── src/
│   │   ├── api/                   Typed API clients
│   │   ├── components/            Campaign, layout, and UI components
│   │   ├── contexts/              Auth and toast providers
│   │   ├── lib/                   Axios client, mock adapter, constants, formatting
│   │   ├── pages/                 Auth, campaigns, backer, creator, admin
│   │   ├── types/                 Shared domain types
│   │   └── App.tsx                Route map and role guards
│   ├── tailwind.config.ts         Design tokens
│   └── README.md                  Frontend guide, mock data, contract notes
├── stitch_crowdpredict_web_app/   Stitch design references and DESIGN.md
├── CrowdFunding Prediction System – UML Diagrams (CT-263).html
└── README.md
```

---

## Getting started

### Prerequisites

| Tool | Version | Needed for |
| --- | --- | --- |
| Node.js | 20 LTS or newer | Frontend (Vite 6) |
| Java | 21 | Backend |
| Maven | Not required | The Maven wrapper downloads it |
| PostgreSQL | 16+ | Only if you use Docker or a hosted database |

All commands below are PowerShell. On macOS/Linux use `cp` instead of `copy`, and `./mvnw` instead of `.\mvnw.cmd`.

---

### Option 1 — Frontend only, no backend

This is the fastest way to see the product. The in-browser mock API ships with seeded users, campaigns, predictions, datasets, and models.

```powershell
cd frontend
npm install
copy .env.example .env    # optional — defaults already enable mock mode
npm run dev
```

Open **http://localhost:5173** and sign in with a demo account.

To reset the demo data, delete the `cp_mock_db_v1` key from browser local storage and reload.

---

### Option 2 — Backend + frontend, no database server

The `local` Spring profile uses an H2 file database and applies the same Flyway migrations as PostgreSQL. Nothing needs to be installed beyond Java 21.

**Terminal 1 — API**

```powershell
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

| URL | Purpose |
| --- | --- |
| `http://localhost:8080/api` | REST API base path |
| `http://localhost:8080/swagger-ui.html` | Swagger UI |
| `http://localhost:8080/actuator/health` | Health check |
| `http://localhost:8080/h2-console` | H2 console (local profile) |

The H2 database lives at `backend/data/crowdpredict.mv.db`.

**Terminal 2 — web app**

```powershell
cd frontend
npm install
copy .env.example .env
```

Set the following values in `frontend/.env`:

```env
VITE_USE_MOCK=false
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:8080
VITE_PROXY_REWRITE=false
```

Then:

```powershell
npm run dev
```

Open **http://localhost:5173**.

> `VITE_PROXY_REWRITE=false` is required because the backend routes already include `/api`. The dev server proxies `/api/*` to `http://localhost:8080/api/*`.

---

### Option 3 — PostgreSQL (Neon or Docker)

#### Neon (hosted Postgres)

1. Create a Neon project and copy the **direct** connection string — not the `-pooler` host.
2. Convert it to a JDBC URL and keep `sslmode=require`:

   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   → jdbc:postgresql://ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

3. Create `backend/.env` from `backend/.env.example` and fill it in:

   ```env
   SPRING_DATASOURCE_URL=jdbc:postgresql://ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   SPRING_DATASOURCE_USERNAME=neondb_owner
   SPRING_DATASOURCE_PASSWORD=your-password
   JWT_SECRET=at-least-32-random-characters
   CORS_ORIGINS=http://localhost:5173
   SEED_DEMO_DATA=true
   ```

4. Start the API:

   ```powershell
   cd backend
   .\mvnw.cmd spring-boot:run
   ```

Flyway creates the schema and reference data on first boot. The demo bootstrap then adds datasets, models, predictions, and pledges without touching existing rows.

#### Docker Compose (offline fallback)

```powershell
cd backend
copy .env.example .env
docker compose up --build
```

This starts PostgreSQL 16 and the API on `http://localhost:8080`. The frontend still runs separately with the Option 2 settings.

#### Production jar

```powershell
cd backend
.\mvnw.cmd package
java -jar target/crowdpredict-1.0.0.jar
```

Override `JWT_SECRET` and the datasource variables in the host environment. The frontend is a static build (`npm run build` → `frontend/dist/`) and can be served by any static host; set `VITE_API_URL` to the deployed API base URL at build time.

---

## Demo accounts

These accounts are available in both demo modes — the in-browser mock and the seeded backend.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@crowdpredict.app` | `admin123` |
| Admin | `marcus@crowdpredict.app` | `admin123` |
| Creator | `ayesha@ecobottle.io` | `creator123` |
| Creator | `elena@verdehydro.co` | `creator123` |
| Backer | `backer@crowdpredict.app` | `backer123` |

Additional seeded users exist so pledge and campaign demo data looks realistic.

**Suggested demo path**

1. Sign in as a **creator** → create a campaign → save the draft → request a prediction → inspect the gauge and factors → check prediction history.
2. Sign in as a **backer** → open the now-published campaign → pledge above a reward minimum → view My Pledges.
3. Sign in as an **admin** → review dashboard stats → upload a CSV → train a model → inspect metrics → activate it.
4. Still as admin → change a user's role or deactivate an account (self-deactivation is blocked).

---

## API overview

Base path: `/api`. Authenticated requests use `Authorization: Bearer <jwt>`. List endpoints return `{ items, total, page, pageSize, totalPages }`; a few collections return plain arrays (noted below).

| Area | Endpoints |
| --- | --- |
| **Auth** | `POST /auth/login` · `POST /auth/register` · `GET /auth/me` · `POST /auth/logout` |
| **Categories** | `GET /categories` |
| **Campaigns** | `GET /campaigns` · `GET /campaigns/{id}` · `POST /campaigns` · `PUT /campaigns/{id}` · `PATCH /campaigns/{id}` · `DELETE /campaigns/{id}` |
| **Pledges** | `POST /campaigns/{id}/pledges` · `GET /pledges/mine` *(array)* |
| **Predictions** | `POST /predictions` · `GET /predictions` · `GET /predictions/{id}` |
| **Admin — stats** | `GET /admin/stats` |
| **Admin — datasets** | `GET /admin/datasets` *(array)* · `POST /admin/datasets` *(multipart `file`)* · `DELETE /admin/datasets/{id}` |
| **Admin — models** | `GET /admin/models` *(array)* · `POST /admin/models/train` · `GET /admin/models/{id}/metrics` · `PATCH /admin/models/{id}/activate` |
| **Admin — users** | `GET /admin/users?search=` *(array)* · `PATCH /admin/users/{id}/role` · `PATCH /admin/users/{id}/status` |

**Campaign filters:** `search`, `category`, `country`, `minGoal`, `maxGoal`, `mine`, `creatorId`, `page`, `pageSize`.
**Prediction filters:** `page`, `pageSize`, `campaignId`.

**Error shape**

```json
{
  "message": "Please check the highlighted fields.",
  "errors": {
    "rewards[0].description": "Describe this reward."
  }
}
```

Status codes: `400` validation · `401` missing/bad credentials · `403` deactivated or not permitted · `404` missing or hidden · `409` conflict · `413` file too large · `415` non-multipart upload.

The full contract, business rules, and validation matrix are in [`backend/README.md`](backend/README.md).

---

## Configuration

### Backend (`backend/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `SPRING_DATASOURCE_URL` | local PostgreSQL URL | JDBC connection string |
| `SPRING_DATASOURCE_USERNAME` / `PASSWORD` | `crowdpredict` | Database credentials |
| `DB_POOL_SIZE` | `5` | Hikari pool size (kept low for Neon) |
| `JWT_SECRET` | dev value | HS256 secret; startup fails under 32 characters |
| `JWT_TTL_MINUTES` | `1440` | Token lifetime |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `SEED_DEMO_DATA` | `true` | Seed users, campaigns, datasets, models |
| `DATASET_STORAGE_PATH` | `./data/datasets` | Uploaded and generated CSVs |
| `MODEL_STORAGE_PATH` | `./data/models` | Serialized model artifacts |
| `PORT` | `8080` | Server port |
| `SPRING_PROFILES_ACTIVE` | *(none)* | `local` for the H2 file database |

`backend/.env` is imported automatically; OS environment variables take precedence. The file is git-ignored.

### Frontend (`frontend/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | API base URL used by the client |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Dev proxy target |
| `VITE_PROXY_REWRITE` | `true` | Strip `/api` before forwarding |
| `VITE_USE_MOCK` | `true` when unset | Use the in-browser mock API |

For the bundled backend, set `VITE_USE_MOCK=false`, `VITE_PROXY_TARGET=http://localhost:8080`, and `VITE_PROXY_REWRITE=false`.

---

## Verification and scripts

### Backend

```powershell
cd backend
.\mvnw.cmd test        # 20 unit tests
.\mvnw.cmd package     # produces target/crowdpredict-1.0.0.jar
```

Covered by tests: feature extraction, hyperparameter validation, CSV parsing, and model training. The endpoint sweep — auth, draft visibility, CRUD, pledges, uploads, training, activation, admin rules — was executed manually against PostgreSQL.

### Frontend

```powershell
cd frontend
npm run lint
npm run typecheck
npm run build
```

There is no frontend test suite by design; the project is verified through lint, strict type-checking, a production build, and manual flows.

### Health checks

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health
```

Expected: `{"status":"UP"}`.

---

## Design system

The UI follows the **Warm Heritage Intelligence** design language: warm paper surfaces, deep green brand tones, gold accents, editorial typography, pill buttons, and soft paper shadows.

- Tokens live in [`frontend/tailwind.config.ts`](frontend/tailwind.config.ts) — no hard-coded hex values in components.
- Fonts: **Inter** for UI, **JetBrains Mono** for numeric and code contexts.
- Icons: **Material Symbols** loaded from the Google Fonts CDN.
- Reduced-motion preferences, visible focus states, and keyboard-accessible dialogs are supported throughout.

The source of truth is [`stitch_crowdpredict_web_app/warm_heritage_intelligence/DESIGN.md`](stitch_crowdpredict_web_app/warm_heritage_intelligence/DESIGN.md). The `stitch_crowdpredict_web_app/` folder also contains the original screen references used to build the app.

---

## Documentation

| Document | What it covers |
| --- | --- |
| [`backend/README.md`](backend/README.md) | Full API contract, data model, business rules, ML design, configuration, deployment, UML mapping |
| [`backend/PROJECT_LOG.md`](backend/PROJECT_LOG.md) | Milestone-by-milestone engineering log and deferred items |
| [`frontend/README.md`](frontend/README.md) | Frontend features, scripts, mock data, and contract details |
| [`stitch_crowdpredict_web_app/warm_heritage_intelligence/DESIGN.md`](stitch_crowdpredict_web_app/warm_heritage_intelligence/DESIGN.md) | Design tokens and visual language |
| `CrowdFunding Prediction System – UML Diagrams (CT-263).html` | Use-case, class, sequence, and component diagrams (open in a browser) |

---

## Known limitations

- **Payments are simulated.** Pledges are recorded and campaign counters update, but no money moves and no escrow is integrated.
- **Training is synchronous.** `POST /admin/models/train` blocks for the duration of training; there is no job queue or polling endpoint. Datasets in the demo scope train in seconds.
- **The "XGBoost" algorithm is Smile `GradientTreeBoost`.** It is gradient-boosted trees under the same API name, chosen to avoid native binaries; see the backend guide for the rationale.
- **The confusion matrix is synthesized** from stored accuracy because the schema does not store per-class counts. Accuracy, precision, recall, F1, and ROC-AUC are real holdout values.
- **The Observer file log is deferred.** Predictions are persisted in the database and returned with their explanation, but no separate audit file is written. `LOG_STORAGE_PATH` is reserved for it.
- **No email verification, password reset, profile editing, or refresh tokens.**
- **Admins cannot create users from the UI**; they can change roles and activate/deactivate existing accounts.
- **Icons and fonts come from CDNs**, so a fully offline deployment needs self-hosted assets.
- **No frontend automated tests**; backend unit tests cover the ML and feature contract.

---

## Academic context

This project was built for **CT-263**. The original UML design assumed a Python/FastAPI/scikit-learn stack; the implementation targets Java 21 / Spring Boot while preserving the designed patterns — Strategy, Factory, Singleton registry, and the predictor hierarchy. The Observer pattern is the one intentional deferral.

See §11 of [`backend/README.md`](backend/README.md) for the full deviation list and the UML coverage matrix.
