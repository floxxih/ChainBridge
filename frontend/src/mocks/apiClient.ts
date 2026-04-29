const isMock = process.env.NEXT_PUBLIC_MOCK === "true";

export const mockResponses: Record<string, any> = {
  "/swaps": [{ id: 1, amount: "100 XLM", status: "pending" }],
};

export async function apiClient(endpoint: string): Promise<any> {
  if (isMock) {
    return mockResponses[endpoint];
  }
  const res = await fetch(endpoint);
  return res.json();
}
