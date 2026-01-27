-- ============================================================================
-- TIER S CONVERSATIONS OPTIMIZATION - Database Indexes
-- ============================================================================
-- This migration adds optimized indexes for the conversations module to improve
-- query performance for common operations like filtering, sorting, and searching.
--
-- These indexes are designed to work with the multi-tenant architecture and
-- support the most common query patterns identified in the conversations service.
-- ============================================================================

-- Index 1: Tenant + Status + Last Message (for filtered list with default sort)
-- Supports: listConversations with status filter and last_message_at sort
-- Query: WHERE tenant_id = ? AND status = ? ORDER BY last_message_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_status_last_msg
ON conversations(tenant_id, status, last_message_at DESC);

-- Index 2: Tenant + Assigned To + Last Message (for "my conversations" filter)
-- Supports: listConversations with assigned_to filter
-- Query: WHERE tenant_id = ? AND assigned_to = ? ORDER BY last_message_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_assigned_last_msg
ON conversations(tenant_id, assigned_to, last_message_at DESC);

-- Index 3: GIN index for tags array containment queries
-- Supports: listConversations with tags filter using @> operator
-- Query: WHERE tenant_id = ? AND tags @> ARRAY['tag1', 'tag2']
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tags_gin
ON conversations USING gin(tags);

-- Index 4: Tenant + Channel + Last Message (for channel filter)
-- Supports: listConversations with channel filter
-- Query: WHERE tenant_id = ? AND channel = ? ORDER BY last_message_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_channel_last_msg
ON conversations(tenant_id, channel, last_message_at DESC);

-- Index 5: Contacts search optimization (tenant + nombre + numero)
-- Supports: Contact search in listConversations
-- Query: WHERE tenant_id = ? AND (nombre ILIKE ? OR numero ILIKE ?)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_contacts_tenant_nombre
ON crm_contacts(tenant_id, nombre);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_contacts_tenant_numero
ON crm_contacts(tenant_id, numero);

-- Index 6: Tenant + Unread Count (for unread filter)
-- Supports: listConversations with unread_only filter
-- Query: WHERE tenant_id = ? AND unread_count > 0 ORDER BY last_message_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_unread
ON conversations(tenant_id, unread_count, last_message_at DESC)
WHERE unread_count > 0;

-- Index 7: Tenant + WhatsApp Number (for WhatsApp number filter)
-- Supports: listConversations with whatsapp_number_id filter
-- Query: WHERE tenant_id = ? AND whatsapp_number_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_whatsapp_number
ON conversations(tenant_id, whatsapp_number_id, last_message_at DESC);

-- Index 8: Messages - Conversation + Created At (for message fetching)
-- Supports: listMessages with conversation_id and created_at sort
-- Query: WHERE conversation_id = ? ORDER BY created_at ASC
-- Note: This should already exist, but we ensure it with covering columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_conv_created
ON conversation_messages(conversation_id, created_at ASC)
INCLUDE (id, sender_type, content_type, content, delivery_status);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON INDEX idx_conversations_tenant_status_last_msg IS 'TIER S: Optimizes filtered list queries with status and default sort';
COMMENT ON INDEX idx_conversations_tenant_assigned_last_msg IS 'TIER S: Optimizes "my conversations" queries';
COMMENT ON INDEX idx_conversations_tags_gin IS 'TIER S: Optimizes tag containment queries using GIN';
COMMENT ON INDEX idx_conversations_tenant_channel_last_msg IS 'TIER S: Optimizes channel filter queries';
COMMENT ON INDEX idx_crm_contacts_tenant_nombre IS 'TIER S: Optimizes contact search by name';
COMMENT ON INDEX idx_crm_contacts_tenant_numero IS 'TIER S: Optimizes contact search by phone';
COMMENT ON INDEX idx_conversations_tenant_unread IS 'TIER S: Partial index for unread conversations only';
COMMENT ON INDEX idx_conversations_tenant_whatsapp_number IS 'TIER S: Optimizes WhatsApp number filter queries';
COMMENT ON INDEX idx_conversation_messages_conv_created IS 'TIER S: Covering index for message fetching';
