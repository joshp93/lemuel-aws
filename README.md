# Lemuel Backend

This is the backend for the [Lemuel](https://github.com/your-org/lemuel) daily proverb app. It's built with AWS CDK (TypeScript) and runs entirely on AWS serverless infrastructure.

## What it does

The backend handles everything the mobile app needs:

- **Proverbs** — Fetches proverbs from [API.Bible](https://api.bible/), stores them, and serves the daily proverb
- **User accounts** — Manages sign-up, sign-in, and user profiles via AWS Cognito
- **Notes** — Stores rich-text notes that users write about each proverb, and serves community notes
- **Meditations** — Tracks when users complete a meditation session
- **Push notifications** — Sends a silent push to everyone's phone when a new daily proverb is chosen (the app then schedules a local notification at the user's preferred time)
- **Multiple Bible versions** — Supports KJV, NIV, ESV, and more

## Architecture

```mermaid
graph TB
    subgraph "Client"
        App[Mobile App]
    end

    subgraph "AWS"
        subgraph "API Gateway"
            GW[REST API<br/>13 endpoints]
        end

        subgraph "Lambda Functions"
            PV[Proverbs<br/>get-proverb<br/>get-proverbs<br/>get-available-versions]
            AC[Accounts<br/>account-handler<br/>check-user-exists]
            NT[Notes<br/>note-handler]
            PS[Push<br/>register-device-token<br/>push-daily-proverb]
            LG[Logs<br/>log-handler]
            AD[Admin<br/>fetch-proverbs-for-version<br/>load-proverbs<br/>choose-proverb]
        end

        subgraph "Data"
            DB[(DynamoDB<br/>proverbs-store<br/>3 GSIs)]
        end

        subgraph "Auth"
            COG[Cognito User Pool]
        end

        subgraph "Triggers"
            CRON[EventBridge<br/>6 AM daily]
            STREAM[DynamoDB Stream]
        end
    end

    subgraph "External"
        API_BIBLE[API.Bible]
        FCM[Firebase Cloud Messaging]
    end

    App --> GW
    GW --> PV
    GW --> AC
    GW --> NT
    GW --> PS
    GW --> LG
    PV --> DB
    AC --> DB
    AC --> COG
    NT --> DB
    PS --> DB
    PS --> FCM
    FCM --> App
    AD --> API_BIBLE
    AD --> DB
    CRON --> AD
    DB --> STREAM
    STREAM --> PS
    COG --> App
```

### How the daily proverb gets served

```mermaid
sequenceDiagram
    participant Admin as Developer
    participant Fetch as fetch-proverbs-for-version
    participant Bible as API.Bible
    participant Load as load-proverbs
    participant DB as DynamoDB
    participant Cron as EventBridge
    participant Choose as choose-proverb
    participant Stream as DynamoDB Stream
    participant Push as push-daily-proverb
    participant FCM as Firebase FCM
    participant App

    Note over Admin,App: One-time setup
    Admin->>Fetch: Invoke with version list
    Fetch->>Bible: Fetch 31 chapters per version
    Bible-->>Fetch: Chapter content
    Fetch-->>Admin: Structured proverb data
    Admin->>Load: Invoke with proverb data
    Load->>DB: Batch-write proverbs + refs + versions

    Note over Admin,App: Daily cycle (6 AM)
    Cron->>Choose: Daily trigger
    Choose->>DB: Pick random unused ref for tomorrow
    Choose->>DB: Write daily-proverb item
    DB->>Stream: INSERT detected
    Stream->>Push: New daily-proverb event
    Push->>DB: Query all device tokens
    Push->>FCM: Silent push to all devices
    FCM-->>App: data: { type: "daily-proverb" }

    Note over Admin,App: On demand
    App->>API: GET /kjv?date=today
    API->>DB: Read daily-proverb
    DB-->>API: Proverb + citation
    API-->>App: Display to user
```

### Notes flow

```mermaid
sequenceDiagram
    participant App
    participant GW as API Gateway
    participant Notes as note-handler Lambda
    participant DB as DynamoDB

    Note over App,DB: Fetch community notes
    App->>GW: GET /notes/proverbs/{ref}
    GW->>Notes: Auth check (Cognito)
    Notes->>DB: Query proverb-notes-index GSI
    DB-->>Notes: All notes for this proverb
    Notes-->>App: Paginated note list

    Note over App,DB: Fetch user's own notes
    App->>GW: GET /notes/users/{uuid}
    GW->>Notes: Auth check
    Notes->>DB: Query user-notes-index GSI
    DB-->>Notes: All notes by this user
    Notes-->>App: Paginated note list

    Note over App,DB: Save a note
    App->>GW: POST /notes/users/{uuid}/{ref}
    GW->>Notes: Auth check
    Notes->>DB: Upsert note
    Notes->>DB: Recount totalNotes
    Notes-->>App: { success: true }
```

- **3 CDK stacks**: Secrets, User Management (Cognito), and Main (DynamoDB + Lambdas + API)
- **12 Lambda functions** — Each focused on a single responsibility
- **DynamoDB** with 3 global secondary indexes (version-index, proverb-notes-index, user-notes-index)
- **EventBridge** cron runs daily at 6 AM to pick the next proverb

## Development

```bash
# Install
pnpm install

# Type-check
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test

# Build
pnpm build

# Deploy (requires AWS credentials)
pnpm dep   # runs: cdk deploy --all --profile AdministratorAccess-640223110844
```

### Invoking Lambdas directly

```bash
# Load proverbs into DynamoDB (after fetching)
pnpm invoke:load

# Trigger proverb selection
pnpm invoke:choose

# Fetch proverbs from API.Bible
pnpm invoke:fetch-proverbs-for-version
```

## Tech stack

- **AWS CDK v2** — Infrastructure as code
- **TypeScript** + **tsup** — Lambda bundling
- **DynamoDB** — Primary database
- **API Gateway** — REST API
- **Cognito** — Authentication
- **Firebase Cloud Messaging** — Push notifications
- **EventBridge** — Cron scheduling
- **Secrets Manager** — API key storage
- **Zod** — Runtime validation
- **Jest** + **aws-sdk-client-mock** — Testing
