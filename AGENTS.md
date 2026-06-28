# lemuel — Backend (AWS CDK / TypeScript)

Infrastructure-as-code (CDK v2) + Lambda backend powering the Lemuel daily proverb app.

## Stacks (3)

### LemuelSecretStack (`lib/lemuel-secret-stack.ts`)
- `api-bible-creds` — API key for API.Bible
- `fcm-server-creds` — Firebase Cloud Messaging server credentials

### LemuelUserManagementStack (`lib/lemuel-user-management-stack.ts`)
- Cognito User Pool (email sign-in, self-sign-up)
- Web Client with Cognito auth
- User Pool Domain (`lemuel`)

### LemuelStack (`lib/lemuel-stack.ts`)
- DynamoDB table `proverbs-store` with 3 GSIs: `version-index`, `proverb-notes-index`, `user-notes-index`
- 12 Lambda functions (via `tsup` bundling)
- REST API Gateway (12 endpoints, Cognito auth on protected routes)
- EventBridge cron rule (`lemuel-schedule`, 6 AM daily)
- DynamoDB Stream → `push-daily-proverb` (INSERT on `daily-proverb`)

## Lambda functions

| Function | Trigger | Description |
|---|---|---|
| `fetch-proverbs-for-version` | Direct invoke | Fetches all 31 Proverbs chapters from API.Bible for N versions. Retry logic, chapter parsing, structured output. |
| `load-proverbs` | Direct invoke | Batch-writes fetched proverbs into DynamoDB. Creates proverb items, refs metadata (allRefs/usedRefs), versions list, citations. |
| `choose-proverb` | EventBridge cron (6 AM) | Picks random unused proverb ref for today + tomorrow. Updates refs tracker to prevent repeats. |
| `get-proverb` | `GET /{version}` | Returns daily proverb by version + optional `?date=`. Includes citation. |
| `get-proverbs` | `GET /get-proverbs` | Paginated listing of daily-proverb entries (`?month=`, `?limit=`, `?lastKey=`). Base64 cursor. |
| `get-available-versions` | `GET /available-versions` | Sorted list of Bible version abbreviations in the database. |
| `check-user-exists` | `POST /auth/check-user-exists` | Rate-limited (10/s, 20 burst, 10K/day). Checks Cognito for email. |
| `account-handler` | `GET/POST /accounts/{uuid}/...` | Multi-route: GET account details, POST create, POST meditations |
| `note-handler` | `GET/POST /notes/...` | Multi-route: CRUD for per-proverb notes (user + community) |
| `log-handler` | `POST /logs` | Accepts client-side logs via AWS Powertools Logger. Returns 202. |
| `register-device-token` | `POST /push/register-token` | Stores FCM device token (sha256 hash key). |
| `push-daily-proverb` | DynamoDB Stream | On daily-proverb INSERT, sends silent FCM data push to all registered tokens (batched). |

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/available-versions` | None | List available Bible versions |
| `GET` | `/{version}` | None | Get daily proverb (optional `?date=`) |
| `GET` | `/get-proverbs` | None | Paginated proverb calendar |
| `POST` | `/auth/check-user-exists` | Rate-limited | Check if email is registered |
| `GET` | `/accounts/{uuid}` | Cognito | Get user account details |
| `POST` | `/accounts/{uuid}/create` | Cognito | Create user account record |
| `POST` | `/accounts/{uuid}/meditations/{date}` | Cognito | Record a meditation completion |
| `GET` | `/notes/users/{uuid}` | Cognito | List user's notes (paginated) |
| `GET` | `/notes/users/{uuid}/{ref}` | Cognito | Get single note by user+ref |
| `POST` | `/notes/users/{uuid}/{ref}` | Cognito | Create/update a note (upsert) |
| `GET` | `/notes/proverbs/{ref}` | Cognito | Community notes for a proverb (paginated) |
| `POST` | `/logs` | None | Submit client-side logs |
| `POST` | `/push/register-token` | None | Register FCM device token |

## Lambda code structure

```
src/<function-name>/
  index.ts              # Handler orchestrator
  schemas.ts            # Zod schemas for env, events, responses
  factories/            # Domain logic builders
  transforms/           # Pure data transformations
  utils/                # I/O helpers (AWS SDK, HTTP)
  constants/            # Static data
  models/               # Type definitions (when not shared)
```

**Conventions** (functional style):
- One function per file, `export const` named exports (no `export default`)
- Handlers: validate with Zod → call factories/utils → return response
- Shared DynamoDB schemas: `src/models/proverbStoreSchemas.ts`
- Zod at boundaries only (env, events, DynamoDB reads)
- Simple Lambdas (single DynamoDB op) = `schemas.ts` + `index.ts` only
- Complex Lambdas = extract into `factories/`, `transforms/`, `utils/`, `constants/`

## Testing

- Jest + `aws-sdk-client-mock`
- CDK stack tests with snapshot assertions
- Test files mirror source at `test/src/<function-name>/`
- Missing tests: `updateMeditations`, `postUserNote`, `register-device-token`

## Known issues

- `BatchWriteCommand` type error with `aws-sdk-client-mock`: delete `node_modules` + `pnpm-lock.yaml`, run `pnpm i`. If that doesn't fix it, notify the developer.
