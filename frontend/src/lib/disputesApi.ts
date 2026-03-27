import axios from "axios";
import config from "@/lib/config";

export type DisputeCategory =
  | "timeout"
  | "incorrect_amount"
  | "counterparty_unresponsive"
  | "proof_failure"
  | "chain_reorg"
  | "other";

export type DisputePriority = "low" | "normal" | "high" | "critical";

export interface DisputeEvidenceItem {
  type: string;
  value: string;
  description?: string;
}

export interface CreateDisputeRequest {
  swap_id: string;
  submitted_by: string;
  category: DisputeCategory;
  reason: string;
  priority?: DisputePriority;
  evidence?: DisputeEvidenceItem[];
}

function userClient() {
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("cb_api_key") : null;
  return axios.create({
    baseURL: `${config.api.url}/api/v1/disputes`,
    headers: apiKey ? { "X-API-Key": apiKey } : {},
  });
}

export async function createDispute(payload: CreateDisputeRequest) {
  const { data } = await userClient().post("/", payload);
  return data;
}

export async function listMyDisputes(submittedBy?: string) {
  const { data } = await userClient().get("/", {
    params: submittedBy ? { submitted_by: submittedBy } : {},
  });
  return data;
}

export async function addDisputeEvidence(
  disputeId: string,
  actor: string,
  evidence: DisputeEvidenceItem[]
) {
  const { data } = await userClient().post(
    `/${disputeId}/evidence`,
    { evidence },
    {
      params: { actor },
    }
  );
  return data;
}
