"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useInfiniteList(totalItems: number, pageSize: number) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = visibleCount < totalItems;

  useEffect(() => {
    setVisibleCount((current) =>
      Math.min(Math.max(pageSize, current), Math.max(pageSize, totalItems))
    );
  }, [pageSize, totalItems]);

  const showMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + pageSize, totalItems));
  }, [pageSize, totalItems]);

  const reset = useCallback(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          showMore();
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, showMore]);

  return {
    visibleCount,
    hasMore,
    showMore,
    reset,
    sentinelRef,
  };
}
