import { createApiClient, getUserApiHeaders } from "@/lib/api/client";
import {
  ApiSwapRecordSchema,
  ApiSwapListSchema,
  VerifySwapProofResponseSchema,
} from "@/lib/api/schemas";
import type {
  ApiSwapRecord,
  ListSwapsParams,
  VerifySwapProofPayload,
  VerifySwapProofResponse,
} from "@/types/api";

const swapsClient = createApiClient({
  basePath: "/swaps",
  getHeaders: getUserApiHeaders,
});

export function listSwaps(params: ListSwapsParams = {}) {
  return swapsClient.get<ApiSwapRecord[]>("/", { params }, ApiSwapListSchema);
}

export function getSwap(swapId: string) {
  return swapsClient.get<ApiSwapRecord>(`/${swapId}`, undefined, ApiSwapRecordSchema);
}

export function verifySwapProof(swapId: string, payload: VerifySwapProofPayload) {
  return swapsClient.post<VerifySwapProofResponse>(
    `/${swapId}/verify-proof`,
    payload,
    undefined,
    VerifySwapProofResponseSchema
  );
}
