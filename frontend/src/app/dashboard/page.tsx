"use client";

import { Button, Input, Select, CopyButton } from "@/components/ui";
import { useSettingsStore } from "@/hooks/useSettings";
import Link from "next/link";

export default function DashboardPage() {
  const settings = useSettingsStore();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold text-text-primary">User Dashboard</h1>
      
      <div className="rounded-xl border border-border bg-surface-overlay p-6 space-y-6">
        <h2 className="text-xl font-semibold text-text-primary">Profile</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Input label="Wallet Address" disabled value="0x123...abc" rightElement={<CopyButton value={"0x123...abc"} />} />
           <Input label="Display Name" placeholder="e.g. Satoshi" />
           <Input label="Email" placeholder="your@email.com" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-overlay p-6 space-y-6">
        <h2 className="text-xl font-semibold text-text-primary">Preferences</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Select 
             label="Preferred Chain"
             options={[
               { label: "Stellar", value: "stellar" },
               { label: "Bitcoin", value: "bitcoin" },
               { label: "Ethereum", value: "ethereum" },
             ]}
           />
           <Select 
             label="Theme"
             options={[
               { label: "Dark", value: "dark" },
               { label: "Light", value: "light" },
             ]}
           />
        </div>
      </div>
      
      <Button variant="primary">Save Changes</Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/notifications" className="rounded-xl border border-border bg-surface-overlay p-5 block">
          <h3 className="text-lg font-semibold text-text-primary">Notifications Center</h3>
          <p className="text-sm text-text-secondary mt-1">
            View alert history, filter by type, and mark updates as read.
          </p>
        </Link>
        <Link href="/analytics" className="rounded-xl border border-border bg-surface-overlay p-5 block">
          <h3 className="text-lg font-semibold text-text-primary">Analytics</h3>
          <p className="text-sm text-text-secondary mt-1">
            Track swap volume across 24h, 7d, and 30d chart windows.
          </p>
        </Link>
      </div>
    </div>
  );
}
