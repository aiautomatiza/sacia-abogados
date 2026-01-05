/**
 * @fileoverview Calls Pagination Component
 * @description Smart windowed pagination with ellipsis
 */

import { useMemo } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CallsPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  from: number;
  to: number;
  totalCount: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onPrefetchNext?: () => void;
}

/**
 * Generate page numbers to display with ellipsis logic
 * Shows: first page, last page, and pages around current with ellipsis
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];
  const windowSize = 1; // Pages to show around current

  // Always show first page
  pages.push(1);

  // Calculate window around current page
  const windowStart = Math.max(2, currentPage - windowSize);
  const windowEnd = Math.min(totalPages - 1, currentPage + windowSize);

  // Add ellipsis after first page if needed
  if (windowStart > 2) {
    pages.push("ellipsis");
  }

  // Add pages in window
  for (let i = windowStart; i <= windowEnd; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (windowEnd < totalPages - 1) {
    pages.push("ellipsis");
  }

  // Always show last page (if more than 1 page)
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export function CallsPagination({
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions,
  from,
  to,
  totalCount,
  canGoPrevious,
  canGoNext,
  onPageChange,
  onPageSizeChange,
  onPrevious,
  onNext,
  onPrefetchNext,
}: CallsPaginationProps) {
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );

  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Mostrando {from} - {to} de {totalCount}
        </span>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(parseInt(value))}
        >
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={onPrevious}
              className={!canGoPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {pageNumbers.map((pageNum, index) => (
            <PaginationItem key={pageNum === "ellipsis" ? `ellipsis-${index}` : pageNum}>
              {pageNum === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => onPageChange(pageNum)}
                  isActive={currentPage === pageNum}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={onNext}
              onMouseEnter={onPrefetchNext}
              className={!canGoNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
