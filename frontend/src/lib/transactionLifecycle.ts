import { TransactionLifecycle, TransactionStep, TransactionStepKey } from "@/types";

const STEP_ORDER: TransactionStepKey[] = ["approval", "sign", "broadcast", "confirm"];

function stepLabel(step: TransactionStepKey): string {
  switch (step) {
    case "approval":
      return "Approve";
    case "sign":
      return "Sign";
    case "broadcast":
      return "Broadcast";
    case "confirm":
      return "Confirm";
  }
}

function stepDescription(step: TransactionStepKey, chain: string): string {
  switch (step) {
    case "approval":
      return "Review the wallet request and approve the action.";
    case "sign":
      return "Sign the transaction payload locally in your wallet.";
    case "broadcast":
      return `Submit the signed transaction to the ${chain} network.`;
    case "confirm":
      return `Wait for ${chain} to accept and confirm the transaction.`;
  }
}

export function buildTransactionLifecycle(
  chain: string,
  currentStep: TransactionStepKey,
  options?: {
    failedStep?: TransactionStepKey;
    errorMessage?: string;
    retryable?: boolean;
  }
): TransactionLifecycle {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  const steps: TransactionStep[] = STEP_ORDER.map((step, index) => {
    let status: TransactionStep["status"] = "idle";

    if (options?.failedStep === step) {
      status = "error";
    } else if (index < currentIndex) {
      status = "completed";
    } else if (index === currentIndex) {
      status = "active";
    }

    return {
      key: step,
      label: stepLabel(step),
      status,
      description: stepDescription(step, chain),
      chain,
      errorMessage: options?.failedStep === step ? options.errorMessage : undefined,
    };
  });

  return {
    currentStep,
    steps,
    retryable: options?.retryable,
    errorMessage: options?.errorMessage,
  };
}

export function buildCompletedLifecycle(chain: string): TransactionLifecycle {
  return {
    currentStep: "confirm",
    steps: STEP_ORDER.map((step) => ({
      key: step,
      label: stepLabel(step),
      status: "completed",
      description: stepDescription(step, chain),
      chain,
    })),
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
