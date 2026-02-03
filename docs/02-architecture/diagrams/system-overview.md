# System Overview Diagram

## Arquitectura General

```mermaid
graph TB
    subgraph "Frontend (Railway)"
        FE[React SPA]
        FE --> RQ[React Query]
        FE --> RR[React Router]
        FE --> RC[React Context]
    end

    subgraph "Supabase"
        subgraph "Auth"
            AUTH[GoTrue]
        end

        subgraph "Database"
            PG[(PostgreSQL)]
            RLS[Row Level Security]
        end

        subgraph "Realtime"
            RT[WebSocket Server]
        end

        subgraph "Edge Functions"
            EF1[api-gateway]
            EF2[send-campaign]
            EF3[external-appointments-api]
            EF4[initiate-oauth]
        end

        subgraph "Storage"
            ST[File Storage]
        end
    end

    subgraph "External Services"
        WA[WhatsApp Business API]
        TW[Twilio]
        PD[Pipedrive / Zoho]
    end

    FE --> AUTH
    FE --> PG
    FE --> RT
    FE --> EF1
    FE --> ST

    EF1 --> PG
    EF2 --> WA
    EF3 --> TW
    EF4 --> PD

    PG --> RLS
    PG --> RT
```

## Flujo de Datos

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant RQ as React Query
    participant SB as Supabase
    participant DB as PostgreSQL
    participant RT as Realtime

    U->>FE: Interaction
    FE->>RQ: Query/Mutation
    RQ->>SB: API Request
    SB->>DB: SQL Query
    DB-->>SB: Results
    SB-->>RQ: Response
    RQ-->>FE: Cached Data
    FE-->>U: UI Update

    Note over DB,RT: On data change
    DB->>RT: Trigger Event
    RT->>FE: WebSocket Push
    FE->>RQ: Invalidate Cache
    RQ->>SB: Refetch
```

## Multi-Tenant Architecture

```mermaid
graph TB
    subgraph "Tenant A"
        UA[Users A]
        DA[Data A]
    end

    subgraph "Tenant B"
        UB[Users B]
        DB_B[Data B]
    end

    subgraph "Supabase"
        AUTH[Auth Service]
        DB[(PostgreSQL)]
        RLS[RLS Policies]
    end

    UA --> AUTH
    UB --> AUTH
    AUTH --> DB
    DB --> RLS

    RLS --> |tenant_id = A| DA
    RLS --> |tenant_id = B| DB_B
```

## Feature Module Structure

```mermaid
graph LR
    subgraph "Feature Module"
        C[Components]
        H[Hooks]
        S[Services]
        T[Types]
    end

    subgraph "Global"
        UI[UI Components]
        CTX[Contexts]
        INT[Supabase Client]
    end

    C --> H
    H --> S
    S --> INT
    C --> UI
    H --> CTX
    T --> H
    T --> S
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "User"
        BR[Browser]
    end

    subgraph "Railway"
        FE[Frontend<br>serve dist]
    end

    subgraph "Supabase Cloud"
        API[PostgREST API]
        AUTH[GoTrue Auth]
        RT[Realtime]
        EF[Edge Functions]
        DB[(PostgreSQL)]
        ST[Storage]
    end

    subgraph "External"
        CDN[Supabase CDN]
        WA[WhatsApp]
        TW[Twilio]
    end

    BR --> FE
    FE --> API
    FE --> AUTH
    FE --> RT
    FE --> EF
    FE --> ST

    API --> DB
    EF --> DB
    EF --> WA
    EF --> TW
    ST --> CDN
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant AUTH as Supabase Auth
    participant DB as Database
    participant RLS as RLS

    U->>FE: Enter credentials
    FE->>AUTH: signInWithPassword()
    AUTH-->>FE: JWT Token
    FE->>FE: Store session
    FE->>DB: Query with JWT
    DB->>RLS: Check policies
    RLS->>RLS: Extract user from JWT
    RLS->>RLS: Get tenant_id
    RLS-->>DB: Filter by tenant
    DB-->>FE: Tenant data only
```

## Campaign Processing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant EF as send-campaign
    participant Q as campaign_queue
    participant CRON as process-campaign-queue
    participant WA as WhatsApp API

    U->>FE: Create campaign
    FE->>EF: POST /send-campaign
    EF->>Q: Insert batches
    EF-->>FE: Campaign created

    loop Every minute
        CRON->>Q: Get pending batches
        Q-->>CRON: Batch data
        CRON->>WA: Send messages
        WA-->>CRON: Response
        CRON->>Q: Update status
    end

    Q-->>FE: Realtime update
    FE-->>U: Progress shown
```
