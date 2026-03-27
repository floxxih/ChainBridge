/**
 * React hooks for the admin dashboard (#60).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminStats,
  fetchAdminVolume,
  fetchActiveHTLCs,
  fetchChainHealth,
  fetchUserMetrics,
  fetchAlerts,
  fetchDisputes,
  fetchDisputeStats,
  createAlert,
  reviewDispute,
  resolveDispute,
  updateAlert,
  deleteAlert,
  type AdminStats,
  type VolumeData,
  type ActiveHTLC,
  type ChainHealth,
  type UserMetrics,
  type Alert,
  type AlertCreate,
  type Dispute,
  type DisputeStats,
  type DisputeResolveRequest,
} from "@/lib/adminApi";

type AsyncState<T> = { data: T | null; loading: boolean; error: string | null };

function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  const run = useCallback(() => {
    setState((s: AsyncState<T>) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => setState({ data: null, loading: false, error: err?.message ?? "Error" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}

export function useAdminStats(refreshMs = 30_000) {
  const state = useAsync(fetchAdminStats, []);
  useEffect(() => {
    const id = setInterval(state.refetch, refreshMs);
    return () => clearInterval(id);
  }, [state.refetch, refreshMs]);
  return state;
}

export function useAdminVolume(period: "1h" | "24h" | "7d" | "30d" = "24h") {
  return useAsync(() => fetchAdminVolume(period), [period]);
}

export function useActiveHTLCs(refreshMs = 15_000) {
  const state = useAsync(fetchActiveHTLCs, []);
  useEffect(() => {
    const id = setInterval(state.refetch, refreshMs);
    return () => clearInterval(id);
  }, [state.refetch, refreshMs]);
  return state;
}

export function useChainHealth(refreshMs = 20_000) {
  const state = useAsync(fetchChainHealth, []);
  useEffect(() => {
    const id = setInterval(state.refetch, refreshMs);
    return () => clearInterval(id);
  }, [state.refetch, refreshMs]);
  return state;
}

export function useUserMetrics() {
  return useAsync(fetchUserMetrics, []);
}

export function useAlerts() {
  const state = useAsync(fetchAlerts, []);

  const add = useCallback(
    async (alert: AlertCreate) => {
      await createAlert(alert);
      state.refetch();
    },
    [state.refetch]
  );

  const edit = useCallback(
    async (id: string, alert: AlertCreate) => {
      await updateAlert(id, alert);
      state.refetch();
    },
    [state.refetch]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteAlert(id);
      state.refetch();
    },
    [state.refetch]
  );

  return { ...state, add, edit, remove };
}

export function useDisputes(refreshMs = 20_000) {
  const disputes = useAsync(() => fetchDisputes(), []);
  const stats = useAsync(fetchDisputeStats, []);

  useEffect(() => {
    const id = setInterval(() => {
      disputes.refetch();
      stats.refetch();
    }, refreshMs);
    return () => clearInterval(id);
  }, [disputes.refetch, stats.refetch, refreshMs]);

  const startReview = useCallback(
    async (id: string, reviewedBy: string, adminNotes: string) => {
      await reviewDispute(id, reviewedBy, adminNotes);
      disputes.refetch();
      stats.refetch();
    },
    [disputes, stats]
  );

  const resolve = useCallback(
    async (id: string, payload: DisputeResolveRequest) => {
      await resolveDispute(id, payload);
      disputes.refetch();
      stats.refetch();
    },
    [disputes, stats]
  );

  return {
    disputes: disputes as AsyncState<Dispute[]> & { refetch: () => void },
    stats: stats as AsyncState<DisputeStats> & { refetch: () => void },
    startReview,
    resolve,
  };
}
