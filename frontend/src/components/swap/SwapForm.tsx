import { useState } from "react";

type Chain = "stellar" | "bitcoin" | "ethereum";
type SwapStep = "form" | "confirm" | "submitting" | "success" | "error";

interface SwapFormData {
  sourceChain: Chain;
  destChain: Chain;
  token: string;
  amount: string;
  recipientAddress: string;
  timelockHours: number;
}

const CHAINS: { id: Chain; name: string; tokens: string[] }[] = [
  { id: "stellar", name: "Stellar", tokens: ["XLM", "USDC"] },
  { id: "bitcoin", name: "Bitcoin", tokens: ["BTC"] },
  { id: "ethereum", name: "Ethereum", tokens: ["ETH", "USDC"] },
];

const ESTIMATED_FEES: Record<Chain, string> = {
  stellar: "0.00001 XLM",
  bitcoin: "~0.0001 BTC",
  ethereum: "~0.002 ETH",
};

export default function SwapForm() {
  const [step, setStep] = useState<SwapStep>("form");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [form, setForm] = useState<SwapFormData>({
    sourceChain: "stellar",
    destChain: "bitcoin",
    token: "XLM",
    amount: "",
    recipientAddress: "",
    timelockHours: 24,
  });

  const sourceChainInfo = CHAINS.find((c) => c.id === form.sourceChain);
  const destChainInfo = CHAINS.find((c) => c.id === form.destChain);

  const isValid =
    form.amount &&
    parseFloat(form.amount) > 0 &&
    form.recipientAddress.length > 10 &&
    form.sourceChain !== form.destChain;

  const handleSubmit = async () => {
    if (!isValid) return;
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setStep("submitting");
    setError("");

    try {
      // TODO: Call backend API to create swap
      await new Promise((r) => setTimeout(r, 2000));
      setTxHash("mock_tx_" + Date.now().toString(36));
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Swap creation failed");
      setStep("error");
    }
  };

  const handleReset = () => {
    setStep("form");
    setError("");
    setTxHash("");
    setForm({
      sourceChain: "stellar",
      destChain: "bitcoin",
      token: "XLM",
      amount: "",
      recipientAddress: "",
      timelockHours: 24,
    });
  };

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 text-center">
        <div className="text-4xl mb-4">&#10003;</div>
        <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
          Swap Created
        </h3>
        <p className="text-sm text-green-600 dark:text-green-400 mb-4">
          Your cross-chain swap has been initiated.
        </p>
        <p className="text-xs font-mono bg-green-100 dark:bg-green-900 p-2 rounded mb-4 break-all">
          TX: {txHash}
        </p>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Create Another Swap
        </button>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="max-w-lg mx-auto p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 text-center">
        <div className="text-4xl mb-4">&#10007;</div>
        <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
          Swap Failed
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => setStep("form")}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold mb-4">Confirm Swap</h3>

        <div className="space-y-3 mb-6 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">From</span>
            <span className="font-medium">
              {form.amount} {form.token} ({sourceChainInfo?.name})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">To</span>
            <span className="font-medium">{destChainInfo?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Recipient</span>
            <span className="font-mono text-xs">
              {form.recipientAddress.slice(0, 12)}...
              {form.recipientAddress.slice(-8)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Timelock</span>
            <span>{form.timelockHours} hours</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Est. Fee</span>
            <span>{ESTIMATED_FEES[form.sourceChain]}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("form")}
            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Confirm & Sign
          </button>
        </div>
      </div>
    );
  }

  if (step === "submitting") {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">Creating Swap</h3>
        <p className="text-sm text-gray-500">
          Submitting transaction to {sourceChainInfo?.name}...
        </p>
      </div>
    );
  }

  // Form step
  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold mb-6">Create Cross-Chain Swap</h2>

      {/* Source Chain */}
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        Source Chain
      </label>
      <select
        value={form.sourceChain}
        onChange={(e) => {
          const chain = e.target.value as Chain;
          const tokens = CHAINS.find((c) => c.id === chain)?.tokens || [];
          setForm({ ...form, sourceChain: chain, token: tokens[0] || "" });
        }}
        className="w-full p-2 mb-4 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
      >
        {CHAINS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Token */}
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        Token
      </label>
      <select
        value={form.token}
        onChange={(e) => setForm({ ...form, token: e.target.value })}
        className="w-full p-2 mb-4 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
      >
        {sourceChainInfo?.tokens.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Amount */}
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        Amount
      </label>
      <input
        type="number"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        placeholder="0.00"
        min="0"
        step="0.000001"
        className="w-full p-2 mb-4 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
      />

      {/* Destination Chain */}
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        Destination Chain
      </label>
      <select
        value={form.destChain}
        onChange={(e) =>
          setForm({ ...form, destChain: e.target.value as Chain })
        }
        className="w-full p-2 mb-4 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
      >
        {CHAINS.filter((c) => c.id !== form.sourceChain).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Recipient Address */}
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        Recipient Address
      </label>
      <input
        type="text"
        value={form.recipientAddress}
        onChange={(e) =>
          setForm({ ...form, recipientAddress: e.target.value })
        }
        placeholder={
          form.destChain === "bitcoin"
            ? "bc1q..."
            : form.destChain === "ethereum"
              ? "0x..."
              : "G..."
        }
        className="w-full p-2 mb-4 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
      />

      {/* Timelock */}
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        Timelock (hours)
      </label>
      <select
        value={form.timelockHours}
        onChange={(e) =>
          setForm({ ...form, timelockHours: parseInt(e.target.value) })
        }
        className="w-full p-2 mb-4 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
      >
        {[6, 12, 24, 48].map((h) => (
          <option key={h} value={h}>
            {h} hours
          </option>
        ))}
      </select>

      {/* Fee Estimate */}
      <div className="flex justify-between text-sm text-gray-500 mb-6">
        <span>Estimated Fee</span>
        <span>{ESTIMATED_FEES[form.sourceChain]}</span>
      </div>

      {/* Validation error */}
      {form.sourceChain === form.destChain && (
        <p className="text-red-500 text-sm mb-4">
          Source and destination chains must be different.
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isValid}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Review Swap
      </button>
    </div>
  );
}
