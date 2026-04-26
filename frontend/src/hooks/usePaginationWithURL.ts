"use client";

import { useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { usePagination } from "./usePagination";

const DEFAULT_PAGE_PARAM = "page";

export function usePaginationWithURL(
  totalItems: number,
  pageSize: number,
  options: {
    paramName?: string;
    initialPage?: number;
    onPageChange?: (page: number) => void;
  } = {}
) {
  const { paramName = DEFAULT_PAGE_PARAM, initialPage = 1, onPageChange } = options;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const pageParam = searchParams.get(paramName);
  const pageFromUrl = pageParam ? parseInt(pageParam, 10) : initialPage;
  const safePageFromUrl = Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : initialPage;

  const pagination = usePagination(totalItems, pageSize, safePageFromUrl);

  useEffect(() => {
    if (pagination.page !== safePageFromUrl) {
      pagination.setPage(safePageFromUrl);
    }
  }, [pagination, safePageFromUrl]);

  const setPage = useCallback(
    (page: number) => {
      pagination.setPage(page);
      onPageChange?.(page);
    },
    [pagination, onPageChange]
  );

  const pushPageToUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page === initialPage) {
        params.delete(paramName);
      } else {
        params.set(paramName, String(page));
      }
      const queryString = params.toString();
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
    },
    [initialPage, paramName, pathname, router, searchParams]
  );

  const setPageAndSync = useCallback(
    (page: number) => {
      setPage(page);
      pushPageToUrl(page);
    },
    [setPage, pushPageToUrl]
  );

  const reset = useCallback(() => {
    pagination.reset();
    pushPageToUrl(initialPage);
  }, [pagination, pushPageToUrl, initialPage]);

  const controls = useMemo(
    () => ({
      ...pagination,
      setPage,
      setPageAndSync,
      reset,
      pushPageToUrl,
    }),
    [pagination, setPage, setPageAndSync, reset, pushPageToUrl]
  );

  return controls;
}