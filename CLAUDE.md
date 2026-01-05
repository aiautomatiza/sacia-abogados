# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **multi-tenant CRM and communication management dashboard** built with React, TypeScript, and Supabase. It enables management of customer conversations across multiple channels (WhatsApp, Instagram, webchat, email, voice calls), contacts, campaigns, and call analytics.

## Essential Commands

```bash
# Development
npm run dev              # Start Vite dev server on port 8080

# Build
npm run build            # Production build
npm run build:dev        # Development build

# Code Quality
npm run lint             # Run ESLint on all files
npm run preview          # Preview production build locally
```

## Environment Setup

The project requires environment variables in `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous/public key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

Copy `.env.example` to `.env` and fill in your Supabase credentials from the project dashboard.

## Deployment

### Railway Deployment

The project is configured for Railway deployment with:
- `railway.toml` - Railway configuration file
- `serve` package - Static file server for production
- `npm start` - Production start command

**Deploy to Railway:**
1. Push code to GitHub repository
2. Create new project in Railway
3. Connect GitHub repository
4. Configure environment variables in Railway dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
5. Railway will automatically:
   - Run `npm install`
   - Run `npm run build`
   - Start server with `npm start`

**Local production test:**
```bash
npm run build
npm start
```

### Alternative Deployment Options

- **Vercel/Netlify**: Better suited for Vite/React SPAs (automatic SPA routing)
- **Cloudflare Pages**: Fast global CDN for static sites

## Architecture Overview

### Multi-Tenant Architecture

**Critical**: Every database query MUST filter by `tenant_id` for data isolation. The `tenant_id` comes from the user's profile and is accessed via the `useProfile()` hook.

```typescript
// Always include tenant filtering
const { scope } = useProfile();
query = query.eq('tenant_id', scope.tenantId);
```

### Feature-Based Organization

The codebase uses a feature-based module structure where each feature is self-contained:

```
src/features/{feature-name}/
├── components/        # UI components specific to this feature
├── hooks/            # Data fetching and logic hooks
├── services/         # API calls and business logic
├── types/            # TypeScript type definitions
├── utils/            # Helper functions
└── lib/repos/        # Data access layer (for complex features)
```

**Key Features:**
- `conversations/` - Multi-channel messaging with realtime updates
- `contacts/` - CRM contact management with custom fields
- `campaigns/` - Broadcast campaigns for WhatsApp/calls
- `calls/` - Voice call tracking and analytics
- `admin/` - Tenant management (super admin only)

### Data Flow Pattern

The application follows a consistent data flow architecture:

```
Component → Custom Hook → Service Layer → Supabase Client → Database
                ↓
        React Query Cache
                ↓
        Realtime Updates (via useRealtime)
                ↓
        Automatic Cache Invalidation
```

**Query Key Structure:**
Query keys follow a hierarchical pattern for cache management:
```typescript
['feature-name', tenantId, filters, page, sort]
```

**Example:**
```typescript
// Contacts query key
['contacts', filters, page]

// Conversations infinite query key
['conversations', 'infinite', tenantId, filters]

// Calls with stats
['calls', tenantId, filters, page, sort]
['calls-stats', tenantId, filters]
```

### State Management

**Global Auth State:** Managed via `AuthContext` (`src/contexts/auth-context.tsx`)
- Provides: `user`, `session`, `scope` (userId, tenantId, isSuperAdmin), `isAuthenticated`, `loading`, `signOut()`
- Access via: `useAuth()` hook
- Use `useProfile()` hook for tenant-specific data: `profile`, `tenantId`, `isLoading`, `error`

**Server State:** Managed via `@tanstack/react-query`
- Queries for data fetching with caching (5-60s stale time)
- Mutations for create/update/delete operations
- Automatic cache invalidation on mutations
- All hooks are located in `features/{feature}/hooks/`

**Realtime Updates:** Via `useRealtime` hook
- Listens to Postgres changes (INSERT, UPDATE, DELETE)
- Debounced invalidation (default 1000ms) to prevent excessive re-renders
- Tenant-filtered subscriptions via Postgres filters
- Connection status tracking

### Role-Based Access Control

Two user roles with route protection:
- `super_admin` - Full access to tenant management (use `<SuperAdminRoute>`)
- `user_client` - Standard user access (use `<UserClientRoute>`)

Access role via `useRole()` hook which returns: `role`, `isLoading`, `isSuperAdmin`, `isUserClient`

### Service Layer Pattern

All database operations go through service files (`*.service.ts`):

```typescript
// Example: contact.service.ts
export async function getContacts(
  filters: ContactFilters,
  page: number,
  pageSize: number
) {
  let query = supabase
    .from('crm_contacts')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.search) {
    query = query.or(`numero.ilike.%${filters.search}%,nombre.ilike.%${filters.search}%`);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  return { data, total: count };
}
```

Services handle:
- Query construction with filters
- Tenant isolation
- Error handling
- Data transformation

### Infinite Scroll Pattern

For paginated lists (like conversations), use the infinite query pattern:

```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteConversations(filters);

// In component
{data?.pages.flatMap(page => page.data).map(item => ...)}

// Load more
<button onClick={() => fetchNextPage()}>Load More</button>
```

## Important Patterns and Conventions

### Custom Fields System

Contacts support dynamic custom fields per tenant:
- Defined in `crm_custom_fields` table
- Contact attributes stored as JSON in `crm_contacts.attributes` column
- Core fields: `numero` (phone number), `nombre` (name)
- Use `useCustomFields()` hook to fetch field definitions
- Dynamic form validation based on field configuration
- All additional fields beyond `numero` and `nombre` go into the `attributes` JSON object

### Conversation 24-Hour Window

WhatsApp has a 24-hour messaging window:
- Track via `conversations.last_customer_message_at`
- Display warning when outside window
- Use message templates for outside-window messages
- Service: `whatsapp-templates.service.ts`

### File Uploads

Use `useFileUpload` hook for conversation attachments:
- Supports audio conversion via FFmpeg (`useAudioConverter`)
- Audio recording via `useAudioRecorder`
- Files stored in Supabase Storage
- Returns signed URLs for secure access

### Path Aliases

The project uses `@/` as an alias for `src/`:
```typescript
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
```

### UI Components

Built with **shadcn-ui** (Radix UI + Tailwind CSS):
- All UI components in `src/components/ui/`
- Auto-generated via shadcn-cli
- Styled with Tailwind utility classes
- Use `cn()` utility for conditional classes: `cn("base-class", condition && "conditional-class")`

### Type Safety

The codebase is fully typed:
- **Database types**: Auto-generated in `src/integrations/supabase/types.ts` from Supabase schema
- **Feature types**: In each feature's `types/` folder
- **Form validation**: Zod schemas in `src/lib/validations/`
- Always use TypeScript's type inference and explicit types for function parameters

## Key Business Flows

### Conversations Flow
1. List conversations with infinite scroll + filters (channel, status, tags)
2. Select conversation → Updates URL with `conversationId`
3. Load messages with sender info
4. Send messages (text/files/audio/templates)
5. Realtime updates on new messages
6. Actions: assign, tag, archive
7. View customer details with custom fields

### Contact Management
1. Browse contacts with pagination (50 per page)
2. Dynamic custom fields per tenant
3. Create/edit with form validation
4. Bulk operations (delete multiple)
5. Attributes stored as flexible JSON

### Campaign Flow
1. Create campaign (WhatsApp or calls)
2. Upload contacts (CSV or select from CRM)
3. Campaign queued in batches
4. Real-time progress tracking
5. Monitor completion/failures

Status: `pending` → `in_progress` → `completed`/`failed`

### Call Management
1. Track inbound/outbound calls (Twilio integration)
2. Store metadata (duration, state, agent, transcript, audio)
3. Analytics dashboard with stats
4. Audio playback and transcript viewing

Call states: `pending`, `completed`, `failed`, `missed`, `voicemail`, `user_hangup`, `scheduled`

## Development Notes

### Adding New Features

1. Create feature folder: `src/features/{feature-name}/`
2. Add service layer: `services/{feature}.service.ts`
3. Create data hooks: `hooks/use{Feature}.ts`, `hooks/use{Feature}Mutations.ts`
4. Build UI components: `components/`
5. Define types: `types/`
6. Create page component: `src/pages/{Feature}.tsx`
7. Add route in `src/App.tsx`

### Adding New Database Tables

When Supabase schema changes:
1. Run type generation (if available)
2. Update `src/integrations/supabase/types.ts`
3. Ensure Row Level Security (RLS) policies include `tenant_id` filtering

### Realtime Subscriptions

To add realtime updates to a feature:

```typescript
import { useRealtime } from '@/hooks/use-realtime';

useRealtime({
  subscriptions: [
    {
      table: 'table_name',
      schema: 'public', // optional, defaults to 'public'
      event: '*', // or 'INSERT', 'UPDATE', 'DELETE'
      filter: `tenant_id=eq.${tenantId}`,
      queryKeysToInvalidate: [['feature-name']],
      onPayload: (payload) => {
        // Optional: Handle specific changes
        console.log('Change detected:', payload.eventType);
      },
    },
  ],
  debounceMs: 1000, // optional, defaults to 1000
  enabled: true, // optional, defaults to true
});
```

### Mutation Pattern

Standard mutation hook structure:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useFeatureMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => featureService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature'] });
      toast.success('Created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error creating item');
    },
  });

  return { createMutation };
}
```

Note: The codebase uses `sonner` for toast notifications, not shadcn's toast component.

## Common Gotchas

1. **Always filter by tenant_id** - Multi-tenancy requires tenant filtering on every query
2. **Use React Query query keys correctly** - Include all filter dependencies in query key
3. **Debounce realtime updates** - Prevents excessive re-renders from rapid DB changes
4. **WhatsApp 24-hour window** - Check window status before sending messages
5. **Custom fields are dynamic** - Don't hardcode field names, fetch from `crm_custom_fields`
6. **Infinite queries need proper page concatenation** - Use `flatMap` to flatten pages
7. **Supabase RLS policies** - Ensure policies filter by `tenant_id` for security
8. **Type safety** - Import types from `types.ts` and feature-specific type files

## Project Stack Reference

**Core:** React 18, TypeScript 5, Vite 5
**Routing:** React Router 6
**Styling:** Tailwind CSS 3, shadcn-ui
**State:** @tanstack/react-query 5, React Context
**Forms:** React Hook Form 7, Zod 3
**Backend:** Supabase 2 (PostgreSQL, Auth, Realtime, Storage)
**UI Libraries:** Radix UI, Lucide React, Recharts, Sonner
**Utilities:** date-fns, PapaParse, xlsx, FFmpeg
