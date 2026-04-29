/**
 * Admin API client (#60).
 * All requests use an admin API key in the X-API-Key header.
 */
import axios from "axios";
import config from "@/lib/config";
import {
  AdminStatsSchema,
  VolumeDataSchema,
  ActiveHTLCsResponseSchema,
  ChainHealthResponseSchema,
  UserMetricsSchema,
  AlertListSchema,
  AlertSchema,
  DisputeListSchema,
  DisputeStatsSchema,
  DisputeSchema,
} from "@/lib/api/schemas";
import { validateApiResponse } from "@/lib/api/validation";

const ADMIN_KEY_STORAGE = "cb_admin_api_key";

export function getAdminApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_KEY_STORAGE);
}

export function setAdminApiKey(key: string): void {
  localStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export function clearAdminApiKey(): void {
  localStorage.removeItem(ADMIN_KEY_STORAGE);
}

function adminClient() {
  const key = getAdminApiKey();
  return axios.create({
    baseURL: `${config.api.url}/api/v1/admin`,
    headers: key ? { "X-API-Key": key } : {},
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  htlcs: { total: number; active: number; claimed: number; refunded: number };
  orders: { total: number; open: number; matched: number; cancelled: number };
  swaps: { total: number; executed: number };
  disputes: { total: number; open: number; resolved: number };
  volume: { total: number; last_24h: number };
  users: { unique_creators: number; active_api_keys: number };
}

export interface VolumeBucket {
  timestamp: string;
  volume: number;
  order_count: number;
}

export interface VolumeData {
  period: string;
  buckets: VolumeBucket[];
}

export interface ActiveHTLC {
  id: string;
  onchain_id: string | null;
  sender: string;
  receiver: string;
  amount: number;
  hash_lock: string;
  time_lock: number;
  seconds_remaining: number;
  urgency: "normal" | "warning" | "critical";
  hash_algorithm: string;
  created_at: string | null;
}

export interface ChainHealth {
  chain: string;
  health: "healthy" | "degraded" | "unhealthy" | "unknown";
  is_running: boolean;
  last_synced_block: number | null;
  latest_block: number | null;
  blocks_behind: number | null;
  last_updated: string | null;
}

export interface TopTrader {
  creator: string;
  order_count: number;
  total_volume: number;
}

export interface ChainPairActivity {
  from_chain: string;
  to_chain: string;
  count: number;
  volume: number;
}

export interface DailyActivity {
  day: string;
  new_orders: number;
  unique_users: number;
}

export interface UserMetrics {
  top_traders: TopTrader[];
  chain_pairs: ChainPairActivity[];
  daily_activity: DailyActivity[];
}

export interface Alert {
  id: string;
  name: string;
  metric: string;
  condition: "gt" | "lt" | "eq";
  threshold: number;
  severity: "info" | "warning" | "critical";
  enabled: boolean;
  created_at: string;
}

export type AlertCreate = Omit<Alert, "id" | "created_at">;

export interface Dispute {
  id: string;
  swap_id: string;
  submitted_by: string;
  category: string;
  reason: string;
  status: "submitted" | "in_review" | "resolved" | "rejected" | "refunded";
  priority: "low" | "normal" | "high" | "critical";
  evidence: Array<{ type: string; value: string; description?: string }>;
  admin_notes?: string;
  resolution?: string;
  resolution_action?: "approve" | "reject" | "refund_override" | "manual_settlement";
  refund_override: boolean;
  refund_amount?: number;
  reviewed_by?: string;
  reviewed_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  action_log: Array<{
    timestamp: string;
    action: string;
    actor: string;
    details: Record<string, unknown>;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface DisputeStats {
  total: number;
  submitted: number;
  in_review: number;
  resolved: number;
  rejected: number;
  refunded: number;
}

export interface DisputeResolveRequest {
  status: "resolved" | "rejected" | "refunded";
  resolution_action: "approve" | "reject" | "refund_override" | "manual_settlement";
  resolution: string;
  admin_notes?: string;
  resolved_by: string;
  refund_override: boolean;
  refund_amount?: number;
}

// ── API functions ──────────────────────────────────────────────────────────────

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await adminClient().get<AdminStats>("/stats");
  return validateApiResponse(data, AdminStatsSchema, "/admin/stats");
}

export async function fetchAdminVolume(
  period: "1h" | "24h" | "7d" | "30d" = "24h"
): Promise<VolumeData> {
  const { data } = await adminClient().get<VolumeData>("/volume", { params: { period } });
  return validateApiResponse(data, VolumeDataSchema, "/admin/volume");
}

export async function fetchActiveHTLCs(): Promise<{ active_count: number; htlcs: ActiveHTLC[] }> {
  const { data } = await adminClient().get("/htlcs/active");
  return validateApiResponse(data, ActiveHTLCsResponseSchema, "/admin/htlcs/active");
}

export async function fetchChainHealth(): Promise<{ chains: ChainHealth[] }> {
  const { data } = await adminClient().get("/chains");
  return validateApiResponse(data, ChainHealthResponseSchema, "/admin/chains");
}

export async function fetchUserMetrics(): Promise<UserMetrics> {
  const { data } = await adminClient().get<UserMetrics>("/users");
  return validateApiResponse(data, UserMetricsSchema, "/admin/users");
}

export async function fetchAlerts(): Promise<Alert[]> {
  const { data } = await adminClient().get<Alert[]>("/alerts");
  return validateApiResponse(data, AlertListSchema, "/admin/alerts");
}

export async function createAlert(alert: AlertCreate): Promise<Alert> {
  const { data } = await adminClient().post<Alert>("/alerts", alert);
  return validateApiResponse(data, AlertSchema, "/admin/alerts");
}

export async function updateAlert(id: string, alert: AlertCreate): Promise<Alert> {
  const { data } = await adminClient().patch<Alert>(`/alerts/${id}`, alert);
  return validateApiResponse(data, AlertSchema, `/admin/alerts/${id}`);
}

export async function deleteAlert(id: string): Promise<void> {
  await adminClient().delete(`/alerts/${id}`);
}

export async function fetchDisputes(status?: string): Promise<Dispute[]> {
  const { data } = await adminClient().get<Dispute[]>("/disputes", {
    params: status ? { status } : {},
  });
  return validateApiResponse(data, DisputeListSchema, "/admin/disputes");
}

export async function fetchDisputeStats(): Promise<DisputeStats> {
  const { data } = await adminClient().get<DisputeStats>("/disputes/stats");
  return validateApiResponse(data, DisputeStatsSchema, "/admin/disputes/stats");
}

export async function reviewDispute(
  id: string,
  reviewed_by: string,
  admin_notes: string
): Promise<Dispute> {
  const { data } = await adminClient().post<Dispute>(`/disputes/${id}/review`, {
    status: "in_review",
    reviewed_by,
    admin_notes,
  });
  return validateApiResponse(data, DisputeSchema, `/admin/disputes/${id}/review`);
}

export async function resolveDispute(id: string, payload: DisputeResolveRequest): Promise<Dispute> {
  const { data } = await adminClient().post<Dispute>(`/disputes/${id}/resolve`, payload);
  return validateApiResponse(data, DisputeSchema, `/admin/disputes/${id}/resolve`);
}

/** Verify an admin key by hitting the stats endpoint. Returns true if valid + admin. */
export async function verifyAdminKey(key: string): Promise<boolean> {
  try {
    await axios.get(`${config.api.url}/api/v1/admin/stats`, {
      headers: { "X-API-Key": key },
    });
    return true;
  } catch {
    return false;
  }
}
