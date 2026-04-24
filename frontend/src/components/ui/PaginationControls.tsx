"use client";

import { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  page,
  totalPages,
  hasPrevious,
  hasNext,
  onPageChange,
}: PaginationControlsProps) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" && hasPrevious) onPageChange(page - 1);
    if (event.key === "ArrowRight" && hasNext) onPageChange(page + 1);
    if (event.key === "Home") onPageChange(1);
    if (event.key === "End") onPageChange(totalPages);
  }

  return (
    <div
      role="navigation"
      aria-label="Pagination"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex items-center justify-between rounded-2xl border border-border bg-surface-overlay/30 p-4"
    >
      <p className="text-sm text-text-secondary">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={!hasPrevious} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
