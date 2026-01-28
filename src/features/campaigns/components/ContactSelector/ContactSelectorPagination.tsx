/**
 * @fileoverview Contact Selector Pagination Component
 */

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ContactSelectorPaginationProps {
  page: number;
  totalPages: number;
  totalContacts: number;
  pageSize: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export function ContactSelectorPagination({
  page,
  totalPages,
  totalContacts,
  pageSize,
  canGoNext,
  canGoPrev,
  onNextPage,
  onPrevPage,
}: ContactSelectorPaginationProps) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalContacts);

  if (totalContacts === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="text-sm text-muted-foreground">
        Mostrando {from}-{to} de {totalContacts.toLocaleString()} contactos
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm text-muted-foreground min-w-[80px] text-center">
          {page} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
