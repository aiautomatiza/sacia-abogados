/**
 * @fileoverview ConversationItem - Componente memoizado para items de lista
 * @description Componente optimizado con React.memo y custom comparison
 * @performance Solo re-renderiza cuando cambian datos relevantes del item
 * @optimization TIER S: Comparación de arrays O(n) en lugar de JSON.stringify
 */

import { memo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChannelBadge } from './ChannelBadge';
import { WhatsAppNumberBadge } from './WhatsAppNumberBadge';
import { ContactStatusBadge } from './ContactStatusBadge';
import { usePrefetchConversation } from '../hooks/usePrefetchConversation';
import { getInitials, formatLastMessageTime } from '../utils/formatting';
import type { ConversationWithContact } from '../types';

/**
 * TIER S: Comparación de arrays optimizada O(n)
 * Evita JSON.stringify que es más lento y crea strings temporales
 */
function arraysEqual(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

interface ConversationItemProps {
  conversation: ConversationWithContact;
  isSelected: boolean;
  hasUnread: boolean;
  onSelect: (id: string) => void;
  onRemoveTeamState?: (conversationId: string) => void;
}

export const ConversationItem = memo(
  function ConversationItem({
    conversation,
    isSelected,
    hasUnread,
    onSelect,
    onRemoveTeamState,
  }: ConversationItemProps) {
    const { prefetchConversation } = usePrefetchConversation();

    return (
      <button
        onMouseEnter={() => prefetchConversation(conversation.id)}
        onClick={() => onSelect(conversation.id)}
        className={cn(
          'w-full p-3 border-b hover:bg-accent transition-colors text-left',
          isSelected && 'bg-accent'
        )}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback
              className={cn(
                'text-sm',
                hasUnread
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted'
              )}
            >
              {conversation.contact?.nombre
                ? getInitials(conversation.contact.nombre)
                : '?'}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* First Row: Name + Time */}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-0.5">
              <span
                className={cn(
                  'font-medium text-sm truncate uppercase tracking-wide',
                  hasUnread && 'font-semibold'
                )}
              >
                {conversation.contact?.nombre || 'Sin nombre'}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatLastMessageTime(conversation.last_message_at)}
              </span>
            </div>

            {/* Second Row: Last Message Preview + Unread count */}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-1.5">
              <p
                className={cn(
                  'text-xs text-muted-foreground truncate',
                  hasUnread && 'font-medium text-foreground'
                )}
              >
                {conversation.last_message_preview || 'Sin mensajes'}
              </p>
              {hasUnread && (
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium min-w-[1.25rem] text-center whitespace-nowrap">
                  {conversation.unread_count}
                </span>
              )}
            </div>

            {/* Third Row: Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <ChannelBadge channel={conversation.channel} size="sm" />

              {conversation.contact?.status && (
                <ContactStatusBadge status={conversation.contact.status} size="sm" />
              )}

              {conversation.channel === 'whatsapp' && conversation.whatsapp_number && (
                <WhatsAppNumberBadge
                  whatsappNumber={conversation.whatsapp_number}
                  size="sm"
                />
              )}

              {conversation.state === 'ia' && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  IA
                </Badge>
              )}

              {conversation.state === 'equipo' && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 inline-flex items-center gap-0.5"
                >
                  Equipo
                  {onRemoveTeamState && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTeamState(conversation.id);
                      }}
                      className="ml-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                      title="Quitar estado de equipo"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </Badge>
              )}

              {conversation.assigned_user && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                  {conversation.assigned_user.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()}
                </Badge>
              )}

              {conversation.tags &&
                conversation.tags.slice(0, 2).map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5"
                  >
                    {tag}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      </button>
    );
  },
  // TIER S: Custom comparison function optimizada - sin JSON.stringify
  (prevProps, nextProps) => {
    return (
      prevProps.conversation.id === nextProps.conversation.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.hasUnread === nextProps.hasUnread &&
      prevProps.conversation.last_message_at === nextProps.conversation.last_message_at &&
      prevProps.conversation.unread_count === nextProps.conversation.unread_count &&
      prevProps.conversation.last_message_preview === nextProps.conversation.last_message_preview &&
      prevProps.conversation.state === nextProps.conversation.state &&
      prevProps.conversation.assigned_to === nextProps.conversation.assigned_to &&
      prevProps.conversation.contact?.status_id === nextProps.conversation.contact?.status_id &&
      arraysEqual(prevProps.conversation.tags, nextProps.conversation.tags)
    );
  }
);
