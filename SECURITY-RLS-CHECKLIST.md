# Security RLS Policies Checklist

## Overview
This document lists the Row Level Security (RLS) policies that should be verified in Supabase dashboard to ensure proper tenant isolation.

## Critical Tables Requiring RLS Policies

### 1. `custom_fields`
**Required Policies:**
- SELECT: Users can only see custom fields from their own tenant
  ```sql
  CREATE POLICY "Users can view own tenant custom fields"
  ON custom_fields FOR SELECT
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
  ```
- INSERT: Users can only create custom fields for their own tenant
- UPDATE: Users can only update custom fields from their own tenant
- DELETE: Users can only delete custom fields from their own tenant

### 2. `campaigns`
**Required Policies:**
- SELECT: Users can only see campaigns from their own tenant
  ```sql
  CREATE POLICY "Users can view own tenant campaigns"
  ON campaigns FOR SELECT
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
  ```
- INSERT: Users can only create campaigns for their own tenant
- UPDATE: Users can only update campaigns from their own tenant
- DELETE: Users can only delete campaigns from their own tenant

### 3. `campaign_queue` (Campaign Batches)
**Required Policies:**
- SELECT: Users can only see batches from campaigns in their tenant
  ```sql
  CREATE POLICY "Users can view own tenant campaign batches"
  ON campaign_queue FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE tenant_id = auth.jwt() ->> 'tenant_id'
    )
  );
  ```
- INSERT: Protected via campaign_id foreign key
- UPDATE: Users can only update batches from their tenant's campaigns
- DELETE: Users can only delete batches from their tenant's campaigns

### 4. `conversations`
**Required Policies:**
- SELECT: Users can only see conversations from their own tenant
  ```sql
  CREATE POLICY "Users can view own tenant conversations"
  ON conversations FOR SELECT
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
  ```
- INSERT: Users can only create conversations for their own tenant
- UPDATE: Users can only update conversations from their own tenant
- DELETE: Users can only delete conversations from their own tenant

### 5. `conversation_messages`
**Required Policies:**
- SELECT: Users can only see messages from conversations in their tenant
  ```sql
  CREATE POLICY "Users can view own tenant messages"
  ON conversation_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE tenant_id = auth.jwt() ->> 'tenant_id'
    )
  );
  ```
- INSERT: Protected via conversation_id foreign key validation
- UPDATE: Users can only update messages from their tenant's conversations
- DELETE: Users can only delete messages from their tenant's conversations

### 6. `crm_contacts`
**Required Policies:**
- SELECT: Users can only see contacts from their own tenant
  ```sql
  CREATE POLICY "Users can view own tenant contacts"
  ON crm_contacts FOR SELECT
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
  ```
- INSERT: Users can only create contacts for their own tenant
- UPDATE: Users can only update contacts from their own tenant
- DELETE: Users can only delete contacts from their own tenant

## How to Verify RLS Policies in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Policies**
3. For each table listed above, verify:
   - RLS is **enabled** (toggle should be ON)
   - Policies exist for SELECT, INSERT, UPDATE, DELETE operations
   - Each policy filters by `tenant_id` or validates through foreign key relationships

## Testing RLS Policies

To test RLS policies:

1. Create two test users in different tenants
2. Try to access data from the other tenant using direct SQL queries
3. Verify that queries return empty results or errors

Example test query:
```sql
-- As User A (tenant_id = 'xxx')
SELECT * FROM crm_contacts WHERE tenant_id = 'yyy'; -- Should return 0 rows

-- As User A
UPDATE crm_contacts SET nombre = 'Hacked' WHERE tenant_id = 'yyy'; -- Should fail
```

## Application-Level Security (Already Implemented)

The following security measures have been implemented at the application level:

✅ `getCustomFields()` - Always requires and validates tenant_id
✅ `getCampaignBatches()` - Validates campaign ownership before fetching batches
✅ `listMessages()` - Validates conversation ownership before fetching messages
✅ `sendMessage()` - Validates conversation ownership before sending
✅ Query keys include `tenantId` to prevent cache cross-contamination

## Notes

- RLS policies are the **first line of defense** at the database level
- Application-level validation provides **defense-in-depth** security
- Both layers should be present for maximum security
- RLS policies protect against:
  - Direct database access
  - Edge Function vulnerabilities
  - Client-side bypasses
