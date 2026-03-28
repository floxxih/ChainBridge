"use client";

import { useState } from "react";
import { Button, Input, Card } from "@/components/ui";
import { ShieldCheck } from "lucide-react";
import { verifyAdminKey, setAdminApiKey } from "@/lib/adminApi";

interface AdminLoginGateProps {
  onAuthenticated: () => void;
}

export function AdminLoginGate({ onAuthenticated }: AdminLoginGateProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError(null);

    const valid = await verifyAdminKey(key.trim());
    if (valid) {
      setAdminApiKey(key.trim());
      onAuthenticated();
    } else {
      setError("Invalid admin key or insufficient privileges");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card variant="glow" className="w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10">
            <ShieldCheck className="h-6 w-6 text-brand-500" />
          </span>
          <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
          <p className="text-sm text-text-secondary">
            Enter your admin API key to access protocol monitoring.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Admin API Key"
            type="password"
            placeholder="cb_…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            error={error ?? undefined}
            autoFocus
          />
          <Button type="submit" disabled={loading || !key.trim()} className="w-full">
            {loading ? "Verifying…" : "Authenticate"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
