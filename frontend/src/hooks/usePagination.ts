"use client";

import { useEffect, useMemo, useState } from "react";

export function usePagination(totalItems: number, pageSize: number, initialPage = 1) {
  const [page, setPage] = useState(initialPage);
  const safeTotalItems = Math.max(0, totalItems);
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalPages));
  }, [totalPages]);

  const offset = (page - 1) * pageSize;
  const limit = offset + pageSize;

  const controls = useMemo(
    () => ({
      page,
      pageSize,
      totalItems: safeTotalItems,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
      setPage: (nextPage: number) => setPage(Math.min(Math.max(1, nextPage), totalPages)),
      goToNext: () => setPage((current) => Math.min(current + 1, totalPages)),
      goToPrevious: () => setPage((current) => Math.max(current - 1, 1)),
      reset: () => setPage(1),
      offset,
      limit,
    }),
    [limit, offset, page, pageSize, safeTotalItems, totalPages]
  );

  return controls;
}
