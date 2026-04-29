import { createApiClient, getUserApiHeaders } from "@/lib/api/client";
import {
  ApiHTLCBaseRecordSchema,
  ApiHTLCRecordSchema,
  ApiHTLCListSchema,
} from "@/lib/api/schemas";
import type {
  ApiHTLCBaseRecord,
  ApiHTLCRecord,
  ClaimHTLCPayload,
  CreateHTLCPayload,
  ListHTLCsParams,
} from "@/types/api";

const htlcsClient = createApiClient({
  basePath: "/htlcs",
  getHeaders: getUserApiHeaders,
});

export function listHTLCs(params: ListHTLCsParams = {}) {
  return htlcsClient.get<ApiHTLCRecord[]>("/", { params }, ApiHTLCListSchema);
}

export function getHTLC(htlcId: string) {
  return htlcsClient.get<ApiHTLCRecord>(`/${htlcId}`, undefined, ApiHTLCRecordSchema);
}

export function getHTLCStatus(htlcId: string) {
  return htlcsClient.get<ApiHTLCRecord>(`/${htlcId}/status`, undefined, ApiHTLCRecordSchema);
}

export function createHTLC(payload: CreateHTLCPayload) {
  return htlcsClient.post<ApiHTLCBaseRecord>("/", payload, undefined, ApiHTLCBaseRecordSchema);
}

export function claimHTLC(htlcId: string, payload: ClaimHTLCPayload) {
  return htlcsClient.post<ApiHTLCBaseRecord>(
    `/${htlcId}/claim`,
    payload,
    undefined,
    ApiHTLCBaseRecordSchema
  );
}

export function refundHTLC(htlcId: string) {
  return htlcsClient.post<ApiHTLCBaseRecord>(
    `/${htlcId}/refund`,
    {},
    undefined,
    ApiHTLCBaseRecordSchema
  );
}
