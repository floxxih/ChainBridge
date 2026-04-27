"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";

export const RISK_DISCLOSURE_VERSION = "1";
export const RISK_ACCEPTANCE_KEY = `chainbridge_risk_accepted_v${RISK_DISCLOSURE_VERSION}`;

const RISK_ITEMS = [
  {
    title: "Price Volatility",
    body: "Asset prices can shift significantly between initiation and settlement. You may receive less value than the quoted estimate.",
  },
  {
    title: "HTLC Timelock Expiry",
    body: "If the counterparty does not complete the swap before the timelock expires, the swap fails and your funds are automatically refunded.",
  },
  {
    title: "Smart Contract Risk",
    body: "HTLC contracts are audited, but all software carries inherent risk. Only swap amounts you can afford to lose.",
  },
  {
    title: "Counterparty Risk",
    body: "Live swaps require an active counterparty. An unresponsive counterparty causes expiry and a full refund, not loss of funds.",
  },
  {
    title: "No Custodial Protection",
    body: "ChainBridge is non-custodial. You are solely responsible for your wallet keys and all transaction actions you take.",
  },
];

interface RiskDisclosureModalProps {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
}

export function RiskDisclosureModal({ open, onAccept, onClose }: RiskDisclosureModalProps) {
  const [checked, setChecked] = useState(false);

  const handleAccept = () => {
    if (!checked) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(
        RISK_ACCEPTANCE_KEY,
        JSON.stringify({ accepted: true, at: new Date().toISOString() })
      );
    }
    onAccept();
  };

  const handleClose = () => {
    setChecked(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <div className="flex flex-col gap-5">
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-text-primary">Swap Risk Disclosure</h3>
          <p className="text-sm text-text-secondary">
            Version {RISK_DISCLOSURE_VERSION} — Required before your first swap
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Cross-chain atomic swaps involve financial and technical risks. Please read carefully
            before proceeding.
          </p>
        </div>

        <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
          {RISK_ITEMS.map((item) => (
            <li key={item.title} className="rounded-xl border border-border bg-surface-raised p-4">
              <p className="text-sm font-semibold text-text-primary">{item.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{item.body}</p>
            </li>
          ))}
        </ul>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-overlay/30 p-4">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-brand-500"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span className="text-sm text-text-primary">
            I have read and understood these risks and accept full responsibility for my swap
            actions.
          </span>
        </label>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleAccept} disabled={!checked}>
            Accept &amp; Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
