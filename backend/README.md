# CrowdFunding Campaign Success Prediction System — Backend

> **Status: implemented and verified** on 12 Nov 2026 (submission deadline 13 Nov 2026).
> `.\mvnw.cmd test` → 20 tests green, `.\mvnw.cmd package` → fat jar, H2 and Neon boots verified,
> and the full API was exercised against Neon with the React frontend.
> **Companion docs:** [`PROJECT_LOG.md`](PROJECT_LOG.md) — every milestone, file change, rule and
> verification run, plus the deferred list.

This service is the Java backend for the existing React frontend in `../frontend/`. The frontend
already implements every screen and talks to a typed REST contract; until now that contract was
served by an in-browser mock adapter (`frontend/src/lib/mock/adapter.ts`). **This backend replaces
that mock 1:1** — same routes, same fields, same validation messages.

The UML design (Strategy / Factory / Singleton / Observer, the `Predictor` hierarchy,
`ModelRegistry`) is preserved in Java. The UML names Python/FastAPI/scikit-learn because it was
drawn before the stack requirement; the implementation is Java, as required. See
[Deviations](#11-deviations-from-the-uml).

---

## 1. Decisions (locked)

Chosen for **fastest path to a working, deployable submission**, not for theoretical purity.

| # | Decision | Choice | Why / what was rejected |
|---|---|---|---|
| D1 | Language / framework | **Java 21 + Spring Boot 3.3.5, Maven** | Required stack; a single fat jar is the simplest deploy artifact. |
| D2 | Database | **PostgreSQL** — Neon (hosted) or Docker Compose (offline); **H2 (PostgreSQL mode)** for tests/local | One portable schema, three run modes. No Docker needed to demo. |
| D3 | Schema | **Flyway** migrations, ANSI-portable DDL | Same migrations run on Postgres *and* H2. No `JSONB`, no `SERIAL`, no partial indexes, no FTS. |
| D4 | JSON columns | `hyperparameters`, `top_factors` as **TEXT** | `jsonb` would break H2. The payload is written/read with a small helper. |
| D5 | Auth | **JWT HS256 (jjwt 0.12.6), 24 h**, BCrypt passwords | Stateless, matches `Authorization: Bearer`. The filter re-loads the user per request so deactivation/role changes are instant. |
| D6 | ML library | **Smile 3.0.2** (pure Java, no native deps) | Runs on any OS/JVM, tiny image, no Python. |
| D7 | "XGBoost" | API keeps the algorithm name **`XGBoost`**; implemented with Smile **`GradientTreeBoost`** | Same algorithm family (gradient-boosted trees), same two hyperparameters. Avoids `xgboost4j` native binaries (platform builds, big image, deploy risk) on a 1-day deadline. **Approved 12 Nov ("if it works it's acceptable").** |
| D8 | Training | **Synchronous** inside `POST /admin/models/train` | The frontend awaits one response and allows 300 s; a ~1k-row CSV trains in seconds. No job table, no polling, no contract change. |
| D9 | Model artifacts | Serialized to `./data/models/model-{versionId}.ser` (configurable) | Simple, inspectable, no binary blobs in git. |
| D10 | Seed data | `DemoDataSeeder` (`@Order(1)`) seeds users/campaigns; `DemoBootstrap` (`@Order(2)`) seeds datasets/models/predictions/pledges | Existing Neon rows are never touched; a fresh database still demos immediately. |
| D11 | Seed training CSV | **Generated deterministically** (`Random(11)` / `Random(7)`, 800 + 400 rows) on first boot | Deterministic input, no large committed file. Real CSVs can be uploaded in the admin UI. |
| D12 | Backend location | **`CrowdFunding-Prediction-System/backend/`** | Nothing in `frontend/` changed except `.env`. |
| D13 | API prefix | Backend routes include **`/api`**; set `VITE_PROXY_REWRITE=false` | Dev proxy and prod nginx behave identically. |
| D14 | Deployment & DB hosting | **Neon Postgres + `.\mvnw.cmd spring-boot:run` / jar** is the primary path; **Docker Compose** is the offline fallback; **H2** for tests | Neon removes the Docker dependency completely. Both profiles use the same Flyway migrations. |
| D15 | Tests | JUnit 5 focused unit tests for the feature contract, hyperparameters, CSV reader and trainer | Fast, dependency-free, meaningful `mvn test`; the endpoint sweep was manual (see §10). |
| D16 | UML relabeling | **Not** part of the code work | Your report's job; noted in §11 so it isn't missed. |

### Explicitly out of scope (frontend has no UI for them)

Payments/escrow (pledges are recorded, no money moves), email verification, password reset, refresh
tokens, email notifications, campaign completion/failure lifecycle, image upload (artwork is generated
client-side), scheduled retraining, and the Observer file log. Full list in `PROJECT_LOG.md`.

---

## 2. How to run

### Option A — Neon Postgres (primary, no Docker needed)

1. Neon dashboard → create project → copy the **direct** connection string (not the `-pooler` host).
2. Convert it to a JDBC URL and append the SSL flag:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   →  jdbc:postgresql://ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Put it in `backend/.env` (this file is git-ignored):
   ```env
   SPRING_DATASOURCE_URL=jdbc:postgresql://ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   SPRING_DATASOURCE_USERNAME=neondb_owner
   SPRING_DATASOURCE_PASSWORD=...
   JWT_SECRET=<at least 32 random chars>
   CORS_ORIGINS=http://localhost:5173
   SEED_DEMO_DATA=true
   ```
4. Run:
   ```powershell
   cd CrowdFunding-Prediction-System/backend
   .\mvnw.cmd spring-boot:run
   # API      http://localhost:8080/api
   # Swagger  http://localhost:8080/swagger-ui.html
   # Health   http://localhost:8080/actuator/health
   ```
   The Maven wrapper downloads Maven 3.9.9 on first use, so Maven does not need to be installed.

Notes: use the **direct** endpoint (PgBouncer's transaction pooling can interfere with Flyway's locks);
the pool is capped at 5 connections for Neon's free tier; the first request after idle pays a ~1–2 s
cold start while Neon resumes. Flyway creates and seeds the schema on first boot; the demo bootstrap
adds datasets/models/predictions/pledges on the first run only.

### Option B — everything in Docker (offline fallback)

```powershell
cd CrowdFunding-Prediction-System/backend
copy .env.example .env
docker compose up --build
```

The Dockerfile/compose files are provided and the image build is straightforward, but Docker is not
installed on the submission machine, so this path was not rehearsed end-to-end. Neon and H2 were.

### Option C — no database at all (fastest dev loop, H2 file)

```powershell
cd CrowdFunding-Prediction-System/backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

The local profile uses `./data/crowdpredict.mv.db` and the H2 console at `/h2-console`. It applies the
same Flyway migrations and passes Hibernate `validate`.

### Frontend

```env
# CrowdFunding-Prediction-System/frontend/.env  (already created)
VITE_USE_MOCK=false
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:8080
VITE_PROXY_REWRITE=false
```

```powershell
cd CrowdFunding-Prediction-System/frontend
npm install
npm run dev        # http://localhost:5173
npm run lint
npm run typecheck
npm run build
```

All three frontend commands pass with the live-backend `.env`.

### Tests / build

```powershell
.\mvnw.cmd test       # 20 unit tests: features, hyperparameters, CSV reader, trainer/explainer
.\mvnw.cmd package    # target/crowdpredict-1.0.0.jar (add -DskipTests for speed)
java -jar target/crowdpredict-1.0.0.jar
```

**Demo accounts** (seeded, BCrypt-hashed):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@crowdpredict.app` | `admin123` |
| Admin | `marcus@crowdpredict.app` | `admin123` |
| Creator | `ayesha@ecobottle.io` | `creator123` |
| Creator | `elena@verdehydro.co` | `creator123` |
| Backer | `backer@crowdpredict.app` | `backer123` |

The remaining seeded users are backers/creators used by the mock's pledge/notification demo data.

---

## 3. Architecture

```
HTTP ─▶ SecurityFilterChain (JWT) ─▶ Controller ─▶ Service ─▶ Repository ─▶ DB
                                         │            │
                                         │            └─▶ ml.ModelRegistry (singleton)
                                         │                   ├─▶ ml.TrainedArtifact (serialized model)
                                         │                   ├─▶ ml.Explainer (SHAP / probe)
                                         │                   └─▶ ml.HeuristicPredictor (fallback)
                                         │
                                         └─▶ validation + error contract (web.GlobalExceptionHandler)
```

```
backend/
├── pom.xml · Dockerfile · docker-compose.yml · .env.example · .gitignore
├── mvnw / mvnw.cmd
└── src/
    ├── main/java/com/crowdpredict/
    │   ├── CrowdPredictApplication.java
    │   ├── config/      SecurityConfig, DemoDataSeeder, DemoBootstrap
    │   ├── domain/      User, Role, RoleConverter, Category, Campaign, Reward,
    │   │                Pledge, Prediction, Dataset, ModelVersion
    │   ├── repository/  *Repository (Spring Data JPA)
    │   ├── security/    JwtService, JwtAuthenticationFilter, AuthPrincipal, CurrentUser
    │   ├── service/     AuthService, CampaignService, CategoryService, PledgeService,
    │   │                PredictionService, DatasetService, TrainingService, AdminService,
    │   │                CampaignFilter
    │   ├── ml/          FeatureSpec, FeatureDefaults, Hyperparameters, ModelTrainer,
    │   │                TrainingMetrics, TrainedArtifact, SmileFrames, ModelRegistry,
    │   │                Explainer, HeuristicPredictor, CsvDatasetReader, CsvTrainingData
    │   ├── web/         AuthController, CampaignController, PledgeController,
    │   │                PredictionController, AdminController, GlobalExceptionHandler,
    │   │                dto/*, error/ApiException
    │   └── ...
    ├── main/resources/
    │   ├── application.yml, application-local.yml
    │   └── db/migration/  V1__schema.sql, V2__reference_data.sql
    └── test/java/com/crowdpredict/ml/  FeatureSpecTest, HyperparametersTest,
                                        CsvDatasetReaderTest, ModelTrainerTest
```

**Pattern mapping**

| UML | Java |
|---|---|
| Strategy `Predictor` | `TrainedArtifact` + Smile `Classifier` chosen by `TrainingService` |
| `LogisticRegressionModel` / `RandomForestModel` / `XGBoostModel` | Smile `LogisticRegression`, `RandomForest`, `GradientTreeBoost` (exposed as `XGBoost`) |
| Factory `ModelFactory` | `ModelTrainer.train(algorithm, hyperparameters, data)` |
| Singleton `ModelRegistry` | `@Component` caching the active `ModelVersion` + artifact; invalidated on activate |
| Observer `PredictionObserver` / `HistoryLogger` | **Deferred** — predictions are persisted in `predictions`; the `data/logs` path is configured but unused |
| `DataPreprocessor` / `FeatureEngineer` | `FeatureSpec` (fixed feature order, country index) and the means/stds inside `TrainedArtifact` |
| `PredictionService` | campaign → `FeatureSpec.fromCampaign` → `ModelRegistry.active()` → persist → respond |
| `Explainer.explain` | `ml.Explainer` → signed `topFactors` + explanation sentence |

---

## 4. Data model

Portable DDL rules: `BIGINT GENERATED BY DEFAULT AS IDENTITY`, `TIMESTAMP WITH TIME ZONE`,
`NUMERIC(14,2)`, `DOUBLE PRECISION`, `BOOLEAN`, `VARCHAR`, `TEXT`. No Postgres-only types.

| Table | Columns (essentials) | Notes |
|---|---|---|
| `users` | `user_id`, `name`, `email` (unique), `password_hash`, `role`, `organization`, `is_active`, `admin_level`, `created_at` | role ∈ `backer \| creator \| admin` |
| `categories` | `category_id`, `name` (unique) | 7 seeded categories |
| `campaigns` | `campaign_id`, `title`, `description`, `goal_amount`, `duration_days`, `country`, `category_id`, `creator_id`, `status`, `pledged_amount`, `backer_count`, `created_at`, `updated_at`, `ends_at` | status ∈ `DRAFT \| SUBMITTED`; country is a 2-letter ISO code |
| `rewards` | `reward_id`, `campaign_id`, `title`, `description`, `min_pledge`, `quantity` | cascade delete with the campaign |
| `pledges` | `pledge_id`, `user_id`, `campaign_id`, `reward_id` (nullable), `amount`, `created_at` | append-only |
| `predictions` | `prediction_id`, `campaign_id`, `model_version_id`, `probability`, `label`, `top_factors` (TEXT JSON), `explanation`, `created_at` | label ∈ `Likely Success \| Likely Fail` (DB CHECK) |
| `datasets` | `dataset_id`, `file_name`, `storage_path`, `row_count`, `feature_count`, `status`, `uploaded_by_id`, `uploaded_at` | CSV lives on disk |
| `model_versions` | `version_id`, `algorithm`, `name`, `version`, `accuracy`, `f1_score`, `precision_score`, `recall`, `roc_auc`, `dataset_id`, `hyperparameters` (TEXT JSON), `artifact_path`, `is_active`, `training_status`, `created_at` | only one active (enforced in service, transactional) |

**Derived, never stored:** `goalPerDay`, `category`/`categoryName`, `creator`/`creatorName`,
`campaign.prediction` (latest) — assembled by DTO mappers.

**Counters:** `pledged_amount` / `backer_count` are updated in the same transaction as the pledge
insert. Demo seeds set them directly; new pledges increment them.

**Roles:** a single `users` table + `role` enum, *not* JPA inheritance for `Creator`/`Backer`/`Admin`,
because the admin API changes a user's role at runtime and Hibernate cannot change a discriminator.
See §11.

---

## 5. API contract

Base path `/api`. Auth header `Authorization: Bearer <jwt>`. Pagination envelope is always
`{ items, total, page, pageSize, totalPages }` (`totalPages` ≥ 1).

| Method & path | Access | Returns |
|---|---|---|
| `POST /api/auth/login` | public | `{token, user}` 200 |
| `POST /api/auth/register` | public | `{token, user}` 201 |
| `GET /api/auth/me` | authenticated | `User` |
| `POST /api/auth/logout` | public | `{success:true}` |
| `GET /api/categories` | public | `Category[]` |
| `GET /api/campaigns` | optional auth | `Paginated<Campaign>` |
| `GET /api/campaigns/{id}` | optional auth | `Campaign` |
| `POST /api/campaigns` | creator, admin | `Campaign` 201 |
| `PUT /api/campaigns/{id}` | owner, admin | `Campaign` |
| `PATCH /api/campaigns/{id}` | owner, admin | `Campaign` (used for status changes) |
| `DELETE /api/campaigns/{id}` | owner, admin | `{success:true}` |
| `POST /api/campaigns/{id}/pledges` | authenticated | `Pledge` 201 |
| `GET /api/pledges/mine` | authenticated | `Pledge[]` (plain array) |
| `POST /api/predictions` | owner, admin | `Prediction` 201 |
| `GET /api/predictions` | creator, admin | `Paginated<Prediction>` |
| `GET /api/predictions/{id}` | owner, admin | `Prediction` |
| `GET /api/admin/stats` | admin | `AdminStats` |
| `GET /api/admin/datasets` | admin | `Dataset[]` |
| `POST /api/admin/datasets` | admin | multipart field `file` → `Dataset` 201 |
| `DELETE /api/admin/datasets/{id}` | admin | `{success:true}` |
| `GET /api/admin/models` | admin | `ModelVersion[]` |
| `POST /api/admin/models/train` | admin | `ModelVersion` 201 (≤ 300 s) |
| `GET /api/admin/models/{id}/metrics` | admin | `ModelMetrics` |
| `PATCH /api/admin/models/{id}/activate` | admin | `ModelVersion` |
| `GET /api/admin/users?search=` | admin | `User[]` (incl. `totalPledged`) |
| `PATCH /api/admin/users/{id}/role` | admin | `User` |
| `PATCH /api/admin/users/{id}/status` | admin | `User` |

Query params for `GET /campaigns`: `search`, `category`, `country`, `minGoal`, `maxGoal`, `mine`,
`creatorId`, `page` (default 1), `pageSize` (default 9). `GET /predictions`: `page`, `pageSize`
(default 10), `campaignId`.

**Error body** (the frontend parses this shape):

```json
{ "message": "Please check the highlighted fields.",
  "errors": { "rewards[0].description": "Describe this reward." } }
```

Statuses: 400 validation, 401 bad/absent credentials, 403 deactivated or not permitted, 404 missing or
hidden, 409 conflict, 413 file too large, 415 upload is not multipart. Never leak stack traces or
Spring's default `ProblemDetail`.

---

## 6. Business rules checklist

These are extracted from the mock adapter and are the actual acceptance criteria. All are implemented
and were exercised manually against Neon.

- [x] **Draft visibility** — `DRAFT` campaigns are listed only for their owner or an admin; direct `GET` by anyone else is **404** (not 403).
- [x] **Creator routes allow admin** — creators and admins may manage campaigns, with ownership still checked for mutations.
- [x] **Prediction publishes** — `POST /predictions` on a `DRAFT` sets it to `SUBMITTED`.
- [x] **Prediction snapshot** — stores `modelVersion`, `modelAlgorithm`, `modelVersionId` at scoring time; probability clamped to `[0.05, 0.97]`.
- [x] **Reward reconciliation** — existing `rewardId` updated; unknown/foreign id rejected; omitted existing reward deleted; no `rewardId` created.
- [x] **Campaign validation** — title non-blank; description ≥ 80 chars; goal ≥ 100; duration 1–60; country ∈ supported list; category must exist; ≥ 1 reward; each `minPledge > 0`; field keys `title`, `description`, `goalAmount`, `durationDays`, `country`, `categoryId`, `rewards`, `rewards.{i}.description`, `rewards.{i}.minPledge`.
- [x] **Country whitelist** — `US, GB, CA, DE, FR, PK, IN, AU, SG, AE`; input is trimmed, upper-cased and stored as the ISO code the feature extractor expects. Deliberately stricter than the mock.
- [x] **Pledge validation** — campaign `SUBMITTED`; amount > 0; reward belongs to campaign; amount ≥ `minPledge`; keys `amount` / `rewardId`.
- [x] **Register** — role only `backer`/`creator`; case-insensitive unique email; password ≥ 6; creator requires `organization`; returns 201 + token.
- [x] **Deactivated** — login → 403 "deactivated"; valid token → 403; wrong password → 401.
- [x] **Dataset delete** — 400 if referenced by any model.
- [x] **Dataset upload** — CSV only, ≤ 50 MB, header parsed, real `rowCount`/`features`.
- [x] **Training validation** — exact algorithm strings; dataset exists; hyperparameter ranges (below), key `hyperparameters.<name>`.
- [x] **One active model** — activation deactivates all others transactionally.
- [x] **Admin user rules** — cannot deactivate self; cannot demote the last active admin.
- [x] **User search** — name/email/organization/role; sorted `createdAt DESC`.
- [x] **Cascade delete** — campaign removal deletes rewards, pledges, predictions.

**Hyperparameter ranges** (from `frontend/src/lib/constants.ts`):

| Algorithm | Param | Min | Max | Default |
|---|---|---|---|---|
| LogisticRegression | `C` | 0.01 | 10 | 1 |
| LogisticRegression | `max_iter` | 100 | 5000 | 1000 |
| RandomForest | `n_estimators` | 10 | 1000 | 200 |
| RandomForest | `max_depth` | 2 | 40 | 12 |
| XGBoost | `learning_rate` | 0.01 | 0.5 | 0.1 |
| XGBoost | `n_estimators` | 50 | 1000 | 300 |

---

## 7. ML design

### Features (fixed order, shared by training and inference)

```
goalAmount, durationDays, goalPerDay, rewardCount, descriptionLength,
titleLength, backerCount, categoryId, countryIndex
```

`countryIndex` is the position in `FeatureSpec.COUNTRIES`; an unknown code maps to the trailing
"other" bucket. `FeatureSpec.fromCampaign` derives everything from the stored campaign, so there is no
train/serve skew. Means and standard deviations are computed on the training split and serialized with
the artifact; inference standardises with those exact values.

### Algorithms (Smile 3.0.2)

| API name | Smile class | Hyperparameters |
|---|---|---|
| `LogisticRegression` | `LogisticRegression.binomial` (L2) | `C`, `max_iter` |
| `RandomForest` | `RandomForest` | `n_estimators`, `max_depth` |
| `XGBoost` | `GradientTreeBoost` | `learning_rate`, `n_estimators` |

### Training pipeline

1. Validate request (algorithm, dataset, hyperparameter ranges) → field-specific 400s.
2. Parse the CSV (`CsvDatasetReader`), skipping unusable rows; require ≥ 10 usable rows and both classes.
3. Shuffle with `Random(42)` and split 80/20 (smoke-tested deterministic for LR/RF).
4. Compute feature means/stds on the train split, standardise both splits.
5. Fit the classifier, evaluate on the holdout.
6. Compute accuracy, precision, recall, F1, ROC-AUC (Mann-Whitney with tie ranks) and normalised
   feature importances (absolute values, sum to 1).
7. Persist `model_versions` (`is_active=false`, `training_status=ready`) and the serialized artifact
   `model-{versionId}.ser`. The response is returned with metrics populated.

### Inference and explainability

`ModelRegistry.active()` → active artifact (or `HeuristicPredictor` when nothing is trained) →
`FeatureSpec.fromCampaign` → standardise → probability → `Likely Success` at `>= 0.5`.

`topFactors` are **signed** fractions (for example `0.18`, `-0.09`), capped at 6 and scaled to a
combined absolute budget of 0.85, because the UI's factor chart expects direction, not raw importance.

- **Tree models:** Smile `TreeSHAP` gives additive signed contributions. Smile returns feature-major
  values `[f0c0, f0c1, f1c0, ...]`; the class-1 index from `TrainedArtifact.successClassIndex()` is
  selected.
- **Logistic regression / no SHAP:** a one-at-a-time probe resets one feature to the training mean and
  measures the probability delta. Sign is preserved.
- **Friendly keys:** `backerCount`→`backerVelocity`, `countryIndex`→`country`, `categoryId`→`category`.
- If no artifact can be loaded, the heuristic fallback keeps predictions working during a cold demo.

The explanation sentence is generated server-side and also stored (`predictions.explanation`). The UI
currently renders its own copy from `topFactors`; the stored field is there for completeness.

### Metrics response

The schema stores accuracy/F1/precision/recall/ROC-AUC but no confusion-matrix counts. `GET
/admin/models/{id}/metrics` therefore synthesises a 10,000-row confusion matrix from the stored
accuracy. Importances come from the artifact; if it cannot be read, `FeatureDefaults` supplies the
fallback chart.

### Demo bootstrap

If datasets are missing, two deterministic CSVs are generated (800 + 400 rows). If the registry is
empty, all three algorithms are trained on the newest dataset (Random Forest activated). On an existing
database that already has users/campaigns, the same bootstrap adds datasets/models/predictions/pledges
without touching real rows. Six predictions and eight pledges mirror the mock's demo data, with
staggered timestamps for a realistic history.

### Training CSV contract

Required columns (extra columns ignored, order-independent, names normalised):

```
goalAmount, durationDays, success
```

Aliases accepted: `goal`, `days`/`duration`, `rewards`/`rewardTiers`/`numRewards`,
`backers`/`backerVelocity`, `label`/`outcome`/`funded`. Optional:
`rewardCount, descriptionLength, titleLength, backerCount, categoryId, country` (default `0` / unknown).
`success` ∈ `{0,1}`. Reject if the label column is missing, fewer than 10 rows are usable, or only one
class is present.

---

## 8. Configuration

| Env var | Default | Purpose |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:${DB_URI:postgresql://localhost:5432/crowdpredict}` | JDBC URL. Neon: `jdbc:postgresql://ep-xxx.../neondb?sslmode=require`; Compose: `jdbc:postgresql://db:5432/crowdpredict` |
| `SPRING_DATASOURCE_USERNAME` / `PASSWORD` | `crowdpredict` | DB credentials |
| `DB_POOL_SIZE` | `5` | Hikari maximum pool size (kept low for Neon) |
| `JWT_SECRET` | dev value | HS256 secret; **startup fails if under 32 characters** |
| `JWT_TTL_MINUTES` | `1440` | Token lifetime |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated |
| `DATASET_STORAGE_PATH` | `./data/datasets` | Uploaded/generated CSVs |
| `MODEL_STORAGE_PATH` | `./data/models` | Serialized artifacts |
| `LOG_STORAGE_PATH` | `./data/logs` | Reserved for the deferred observer log |
| `SEED_DEMO_DATA` | `true` | `DemoDataSeeder` + `DemoBootstrap` |
| `PORT` | `8080` | Server port |
| `SPRING_PROFILES_ACTIVE` | *(none)* | Set to `local` for the H2 file database |

`.env` is imported automatically (`spring.config.import=optional:file:.env[.properties]`); OS
environment variables win. Multipart limits: `max-file-size=50MB`, `max-request-size=52MB`.

---

## 9. Deployment

- **Hosted DB (primary):** Neon Postgres, direct endpoint, `sslmode=require`. Flyway migrates on boot;
  Hikari capped at 5 connections. Verified: cold start ~50 s, health `UP`.
- **Dockerfile:** multi-stage `maven:3.9-eclipse-temurin-21` → `eclipse-temurin:21-jre-alpine`; non-root
  user; `HEALTHCHECK` on `/actuator/health`; `JAVA_OPTS` honoured.
- **compose services (offline fallback):** `db` (postgres:16-alpine + volume + healthcheck), `api`
  (waits for the DB, named volume for `data/`). Not rehearsed on this machine (no Docker).
- **Jar option:** `java -jar target/crowdpredict-1.0.0.jar` serves the API. The React app is served by
  Vite (dev) or any static host; it needs the `.env` values above so `/api` reaches the backend.
- **Prod notes:** override `JWT_SECRET`; set `SPRING_DATASOURCE_*` in the host's environment; on
  ephemeral filesystems the demo bootstrap retrains models on boot (see §7).

---

## 10. Definition of done — verification record

- [x] `.\mvnw.cmd test` green — **20 tests**, 0 failures.
- [x] `.\mvnw.cmd -B -DskipTests package` → **BUILD SUCCESS**.
- [x] Boots against Neon; `/actuator/health` = `UP`; demo bootstrap seeds 2 datasets, 3 models
  (Logistic 0.688 / RF 0.738 / XGB 0.725 accuracy), 6 predictions, 8 pledges.
- [x] Boots on H2 (`--spring.profiles.active=local`); Flyway v1+v2 applies; Hibernate `validate` passes.
- [x] Frontend with `VITE_USE_MOCK=false`: `npm run lint`, `typecheck`, `build` all pass.
- [x] All three demo logins work from the real frontend.
- [x] Browse/filter/search with pagination; draft hidden from other users (404).
- [x] Creator creates a campaign, edits rewards, runs a prediction, draft becomes public, history shows it.
- [x] Backer pledges (reward minimum enforced), sees it in My Pledges.
- [x] Admin uploads a CSV, trains all three algorithms, views metrics, activates a model, stats update.
- [x] Admin cannot deactivate self or demote the last active admin.
- [x] Validation sweep covers empty/invalid payloads, unknown country, zero pledge, unknown reward,
  missing models/datasets, bad roles, non-multipart uploads (415), oversized uploads (413).
- [x] Neon restored to the pristine demo state after testing (10 users, 12 campaigns, 8 pledges,
  6 predictions, 2 datasets, 3 models; Random Forest v1 active).

**Demo script (rehearse this)**

1. Login as creator → create campaign → save draft → run prediction → view probability and factors → history.
2. Logout → login as backer → find the now-public campaign → pledge above the reward minimum → My Pledges.
3. Login as admin → dashboard stats → upload a CSV → train `RandomForest` → open metrics → activate → back to dashboard.
4. Admin → users → change a role / deactivate an account (show the blocked self-deactivation).

---

## 11. Deviations from the UML

1. **Stack** — Python/FastAPI/scikit-learn → Java 21/Spring Boot/Smile, per the course requirement. Design patterns unchanged.
2. **User hierarchy** — the class diagram shows `User` ◁ `Creator`/`Backer`/`Admin`; implemented as one table + `role` enum because roles are mutable at runtime.
3. **XGBoost** — implemented with Smile `GradientTreeBoost` (gradient-boosted trees), exposed under the API name `XGBoost`.
4. **No `PredictionJob`/queue** — training is synchronous; the UML has no async requirement.
5. **Observer / `HistoryLogger`** — deferred; the prediction is persisted, but no separate observer file is written. `LOG_STORAGE_PATH` is reserved for it.
6. **Metrics confusion matrix** — synthesised from stored accuracy because the schema has no count columns; the four core metrics are real holdout values.
7. **UML diagrams still show the Python deployment**; re-labelling them for the report is a separate, non-code task.

---

## 12. UML coverage matrix

### 12.1 Use cases — all 15 already have a screen

| UML use case | Screen | Endpoint |
|---|---|---|
| Register / Login | `/login`, `/register` | `POST /auth/*`, `GET /auth/me` |
| Browse Campaigns | `/campaigns` | `GET /campaigns` |
| Back / Pledge to Campaign | `/campaigns/:id` + pledge modal | `POST /campaigns/{id}/pledges` |
| Create / Edit Campaign | `/creator/campaigns/new`, `.../:id/edit` | `POST`/`PUT`/`PATCH /campaigns` |
| Request Success Prediction | `/creator/predictions/new` | `POST /predictions` |
| View Prediction History | `/creator/predictions` | `GET /predictions` |
| View Success Probability | `/creator/predictions/:id` (gauge) | `GET /predictions/{id}` |
| View Prediction Explanation | `/creator/predictions/:id` (factor cards) | same |
| Validate Campaign Data | editor + server validation | `errors{}` in the 400 body |
| Upload Training Dataset | `/admin/datasets` | `POST /admin/datasets` |
| Train Logistic Regression / Random Forest / XGBoost | `/admin/models/train` | `POST /admin/models/train` |
| Train / Retrain Model | same | same |
| Evaluate Model Metrics | `/admin/models` (metrics modal) | `GET /admin/models/{id}/metrics` |
| Activate Model Version | `/admin/models` | `PATCH /admin/models/{id}/activate` |
| Manage Users | `/admin/users` | `GET/PATCH /admin/users/*` |

**Nothing user-facing is missing.** Every use case in the diagram is reachable in the existing UI.

### 12.2 Class & component items that map to backend code

| UML item | Lands in | Note |
|---|---|---|
| `Explainer.explain(fv)` | `ml/Explainer` → `prediction.explanation` / `topFactors` | TreeSHAP or probe; signed factors. |
| `HistoryLogger.logFile` / `update(p)` | `LOG_STORAGE_PATH` (`data/logs`) | Deferred, see §11. |
| `PredictionService.attach/notifyObservers` | **deferred** | Predictions are persisted synchronously. |
| `ModelRegistry.getInstance/getActive/register` | `ml/ModelRegistry` | Cached artifact, invalidated on activation. |
| `ModelFactory.create(type)` | `ml/ModelTrainer.train(...)` | Resolves the three algorithms. |
| `DataPreprocessor.clean/encode/scale` | `FeatureSpec` + means/stds in `TrainedArtifact` | Serialized with the model. |
| `FeatureEngineer.transform(c)` | `FeatureSpec.fromCampaign` | Pure function over a campaign. |
| `Reward.isAffordable(a)` | pledge validation | Enforces the reward minimum. |
| `Campaign.validate()` / `getGoalPerDay()` | service validation / DTO mapper | Not stored. |
| `Dataset.load()` | `DatasetService` + `CsvDatasetReader` | Real row/feature counts. |
| `Prediction.isLikelySuccess()` | label rule at `0.5` | `Likely Success` / `Likely Fail`. |
| `Backer.totalPledged` | computed in `GET /admin/users` | Rendered in Admin → Users. |
| `Admin.adminLevel` | `users.admin_level` → `User.adminLevel` | Stored and returned; no screen displays it. |
| Component `Dataset Store` / `Model Store` | `data/datasets/`, `data/models/` | File stores, volume-mounted in Compose. |

### 12.3 Replaced by design (not skipped)

| UML says | We build | Why |
|---|---|---|
| Uvicorn + FastAPI, `api-service.py` | Spring Boot embedded Tomcat | Java requirement |
| Python ML Engine, scikit-learn/XGBoost | In-process Smile models | Java requirement, one deployable |
| `active_model.pkl`, `pipeline.pkl` | `model-*.ser` + preprocessing inside the artifact | Same artifact role, JVM serialization |
| SFTP `model.pkl` transfer | No transfer; same process writes/reads the store | Single deployable removes the need |
| `train.py` on a Training Workstation | `POST /api/admin/models/train` | Admin UI already drives training |
| `crowdfunding.db` on a Database Server | Neon / Postgres | Managed, survives redeploys |

### 12.4 Frontend changes

Only the **`.env` values** were added (`VITE_USE_MOCK=false`, `VITE_API_URL=/api`,
`VITE_PROXY_TARGET=http://localhost:8080`, `VITE_PROXY_REWRITE=false`). No screen was modified.
Optional-but-not-default: surfacing `prediction.explanation` and `adminLevel` — both are cosmetic and
risk touching working screens the night before submission.

---

## 13. Milestone status

| Milestone | Scope | Status |
|---|---|---|
| M0 | Skeleton: pom, app, profiles, Flyway `V1`, Dockerfile, health endpoint | ✅ |
| M0b | Neon connection, Maven wrapper, `.env` | ✅ |
| M1 | Auth: JWT filter, BCrypt, register/login/me, error handler, CORS | ✅ |
| M2 | Categories + campaigns: CRUD, filters, pagination, draft rules, DTO mapping | ✅ |
| M3 | Pledges: create, validation, counters, my-pledges | ✅ |
| M4 | Datasets: upload/parse/delete | ✅ |
| M5 | ML core: features, trainer, artifact, registry, three algorithms, metrics, activation | ✅ |
| M6 | Predictions: scoring, signed factors, auto-publish, list/get, history | ✅ |
| M7 | Admin: stats, users, role/status rules, 415 polish | ✅ |
| M8 | Demo bootstrap, Neon sweep, tests, docs, frontend checks | ✅ |

**P1 not done:** Swagger annotations on every endpoint (springdoc is wired and serves the generated
docs), full MockMvc suite, real Kaggle sample, single-jar frontend bundling. See `PROJECT_LOG.md`.
