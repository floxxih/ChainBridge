import { createApiClient, getUserApiHeaders } from "@/lib/api/client";
import { ApiOrderRecordSchema, ApiOrderListSchema } from "@/lib/api/schemas";
import type {
  ApiOrderRecord,
  CreateOrderPayload,
  ListOrdersParams,
  MatchOrderPayload,
} from "@/types/api";

const ordersClient = createApiClient({
  basePath: "/orders",
  getHeaders: getUserApiHeaders,
});

export function listOrders(params: ListOrdersParams = {}) {
  return ordersClient.get<ApiOrderRecord[]>("/", { params }, ApiOrderListSchema);
}

export function getOrder(orderId: string) {
  return ordersClient.get<ApiOrderRecord>(`/${orderId}`, undefined, ApiOrderRecordSchema);
}

export function createOrder(payload: CreateOrderPayload) {
  return ordersClient.post<ApiOrderRecord>("/", payload, undefined, ApiOrderRecordSchema);
}

export function matchOrder(orderId: string, payload: MatchOrderPayload) {
  return ordersClient.post<ApiOrderRecord>(
    `/${orderId}/match`,
    payload,
    undefined,
    ApiOrderRecordSchema
  );
}

export function cancelOrder(orderId: string) {
  return ordersClient.post<ApiOrderRecord>(
    `/${orderId}/cancel`,
    undefined,
    undefined,
    ApiOrderRecordSchema
  );
}
