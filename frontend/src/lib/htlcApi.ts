import axios from "axios";

import config from "@/lib/config";

export interface HTLCTimelineEvent {
  label: string;
  timestamp: string | null;
  completed: boolean;
}

export interface HTLCRecord {
  id: string;
  onchain_id: string | null;
  sender: string;
  receiver: string;
  amount: number;
  hash_lock: string;
  time_lock: number;
  status: string;
  secret: string | null;
  hash_algorithm: string;
  created_at: string | null;
  seconds_remaining: number;
  can_claim: boolean;
  can_refund: boolean;
  phase: string;
  timeline: HTLCTimelineEvent[];
}

interface HTLCQuery {
  participant?: string;
  status?: string;
  hash_lock?: string;
}

function apiKeyHeader() {
  const apiKey = process.env.NEXT_PUBLIC_CHAINBRIDGE_API_KEY;
  return apiKey ? { "X-API-Key": apiKey } : {};
}

export async function fetchHTLCs(query: HTLCQuery = {}): Promise<HTLCRecord[]> {
  const { data } = await axios.get<HTLCRecord[]>(`${config.api.url}/api/v1/htlcs`, {
    params: query,
  });
  return data;
}

export async function claimHTLC(id: string, secret: string): Promise<HTLCRecord> {
  const { data } = await axios.post<HTLCRecord>(
    `${config.api.url}/api/v1/htlcs/${id}/claim`,
    { secret },
    { headers: apiKeyHeader() }
  );
  return data;
}

export async function refundHTLC(id: string): Promise<HTLCRecord> {
  const { data } = await axios.post<HTLCRecord>(
    `${config.api.url}/api/v1/htlcs/${id}/refund`,
    {},
    { headers: apiKeyHeader() }
  );
  return data;
}
