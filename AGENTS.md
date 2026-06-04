# Proverb for the day backend

This is an AWS CDK project using TypeScript and pnpm. It includes two stacks:

## Stacks

### LemuelSecretStack (`lib/lemuel-secret-stack.ts`)
- Secrets Manager secret for API.Bible credentials (`api-bible-creds`)

### LemuelUserManagementStack (`lib/lemuel-user-management-stack.ts`)
- Cognito User Pool for user authentication
- User Pool Client with SRP authentication
- User Pool Domain for hosted UI

### LemuelStack (`lib/lemuel-stack.ts`)
- DynamoDB table for storing proverbs with global secondary index on version
- Secrets Manager secret for API.Bible credentials
- Lambda functions:
  - `fetch-proverbs-for-version` - fetches Proverbs from API.Bible for a specific Bible version
    - Event: `{ "version": "kjv", "citation": "King James Version" }`
    - Output: `{ "version": "kjv", "proverbs": [{ "ref": "Proverbs 1:1", "proverb": "The proverbs of Solomon..." }], "citation": "..." }`
    - Uses API_BIBLE_SECRET_NAME env var (Secrets Manager)
  - `get-available-versions` - retrieves list of available Bible versions from DynamoDB
  - `load-proverbs` - loads proverbs into DynamoDB from JSON
  - `choose-proverb` - selects random daily proverb
  - `get-proverb` - retrieves the daily proverb
  - `check-user-exists` - checks if a user exists in Cognito
  - `account-handler` - handles account operations (GET /accounts/{uuid}, POST /accounts/{uuid}/create)
- REST API Gateway endpoints:
  - `GET /{version}` - returns daily proverb (no auth required)
  - `GET /accounts/{uuid}` - returns user account details (Cognito auth)
  - `POST /accounts/{uuid}/create` - creates user account record (Cognito auth)
- `POST /auth/check-user-exists` - checks user existence (rate limited)
- EventBridge cron rule (minute: 0, hour: 0) triggers choose-proverb daily

## API Endpoints

- `GET /available-versions` - Returns list of available Bible versions (no auth required)
- `GET /{version}` - Returns daily proverb (no auth required)
- `POST /auth/check-user-exists` - Checks if user exists in Cognito
  - Request: `{"email": "user@example.com"}`
  - Response: `{"exists": true}` or `{"exists": false}`
  - Rate limited: 10 req/s, 20 burst, 10,000/day
- `GET /accounts/{uuid}` - Returns user account details from DynamoDB (Cognito auth required)
  - Response: Account record JSON with `accountCreatedDate`, `totalMeditations`, `totalNotes`
- `POST /accounts/{uuid}/create` - Creates user account record in DynamoDB (Cognito auth required)
  - Response: `{"success": true}`

## Lambda Function Structure

Each Lambda lives in its own directory under `src/<function-name>/`:

```
src/<function-name>/
  index.ts              # Handler orchestrator
  schemas.ts            # Zod schemas + types for env, events, responses
  factories/            # Domain logic that builds/transforms objects
    buildRecord.ts
  transforms/           # Pure data transformations
  utils/                # I/O helpers (AWS SDK, HTTP calls)
  constants/            # Static data
```

### Conventions (Functional Programming Style)

- **One function per code file** with `export const` named exports (no `export default`)
- **Handlers orchestrate only**: validate input with Zod, call factories/utils, return response
- **Factories** build/transform domain objects (e.g., `buildAccountRecord(uuid)`)
- **Shared entity schemas** (DynamoDB row shapes) live in `src/models/proverbStoreSchemas.ts`
- **Per-Lambda schemas** (env, events, responses) go in a local `schemas.ts`
- **Zod at boundaries** — validate env vars, events, and DynamoDB reads; don't validate internal operations
- **Simple Lambdas** (single DynamoDB op) use only `schemas.ts` + `index.ts`
- **Complex Lambdas** (multi-step, I/O, transformations) extract into `factories/`, `transforms/`, `utils/`, `constants/`

## Environment Variables

Lambda functions use Zod schemas to validate environment variables at runtime.

## Testing

This project uses jest with aws-sdk-client-mock. Please don't run user tests unless the developer asks as this slows down the feedback loop.

```
Argument of type 'typeof BatchWriteCommand' is not assignable to parameter of type 'new (input: BatchWriteCommandInput) => AwsCommand<any, any, any, any>'.
...
```
The fix for this type error is to permanently delete node_modules, delete pnpm-lock file, then run `pnpm i`. If that doesn't work, stop and tell the developer.

**Please keep this file up to date.**