/**
 * @fileoverview Conversation Validation Schemas
 * @description Zod schemas for runtime validation of conversation and message operations
 */

import { z } from 'zod';

/**
 * Valid message content types
 */
export const messageContentTypes = [
  'text',
  'image',
  'video',
  'audio',
  'file',
  'location',
  'template'
] as const;

/**
 * Valid conversation channels
 */
export const conversationChannels = [
  'whatsapp',
  'instagram',
  'webchat',
  'email',
  'voice'
] as const;

/**
 * Valid conversation statuses
 */
export const conversationStatuses = [
  'active',
  'pending',
  'resolved',
  'archived'
] as const;

/**
 * Schema for sending a message
 */
export const sendMessageSchema = z.object({
  conversation_id: z
    .string()
    .uuid('Invalid conversation ID'),
  sender_type: z
    .enum(['agent', 'customer', 'system']),
  sender_id: z
    .string()
    .uuid('Invalid sender ID')
    .nullable()
    .optional(),
  content_type: z
    .enum(messageContentTypes),
  content: z
    .string()
    .max(10000, 'Message content too long')
    .nullable()
    .optional(),
  file_url: z
    .string()
    .url('Invalid file URL')
    .nullable()
    .optional(),
  file_name: z
    .string()
    .max(255, 'File name too long')
    .nullable()
    .optional(),
  file_type: z
    .string()
    .max(100, 'File type too long')
    .nullable()
    .optional(),
  file_size: z
    .number()
    .int()
    .positive('File size must be positive')
    .max(100 * 1024 * 1024, 'File too large (max 100MB)')
    .nullable()
    .optional(),
  replied_to_message_id: z
    .string()
    .uuid('Invalid message ID')
    .nullable()
    .optional(),
  metadata: z
    .record(z.unknown())
    .optional()
    .default({}),
}).refine(
  (data) => {
    // Ensure either content or file_url is provided
    if (data.content_type === 'text' || data.content_type === 'template') {
      return !!data.content;
    }
    return !!data.file_url;
  },
  {
    message: 'Either content or file_url must be provided based on content_type',
    path: ['content']
  }
);

/**
 * Schema for creating a conversation
 */
export const createConversationSchema = z.object({
  tenant_id: z
    .string()
    .uuid('Invalid tenant ID'),
  contact_id: z
    .string()
    .uuid('Invalid contact ID'),
  channel: z
    .enum(conversationChannels),
});

/**
 * Schema for updating conversation status
 */
export const updateConversationStatusSchema = z.object({
  status: z.enum(conversationStatuses),
});

/**
 * Schema for updating conversation tags
 */
export const updateConversationTagsSchema = z.object({
  tags: z
    .array(z.string().max(50, 'Tag too long'))
    .max(10, 'Maximum 10 tags allowed'),
});

/**
 * Schema for assigning conversation
 */
export const assignConversationSchema = z.object({
  userId: z
    .string()
    .uuid('Invalid user ID')
    .nullable(),
});

/**
 * Schema for creating a tag
 */
export const createTagSchema = z.object({
  tenant_id: z
    .string()
    .uuid('Invalid tenant ID'),
  name: z
    .string()
    .min(1, 'Tag name required')
    .max(50, 'Tag name too long')
    .trim(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color hex code')
    .optional()
    .default('#3B82F6'),
  icon: z
    .string()
    .max(50, 'Icon name too long')
    .nullable()
    .optional(),
});

// Type exports
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationStatusInput = z.infer<typeof updateConversationStatusSchema>;
export type UpdateConversationTagsInput = z.infer<typeof updateConversationTagsSchema>;
export type AssignConversationInput = z.infer<typeof assignConversationSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
