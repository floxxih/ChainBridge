"use client";

import { Button, Input, Select, CopyButton } from "@/components/ui";
import { useSettingsStore } from "@/hooks/useSettings";

export default function DashboardPage() {
  const settings = useSettingsStore();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold text-text-primary">User Dashboard</h1>
      
      <div className="rounded-xl border border-border bg-surface-overlay p-6 space-y-6">
        <h2 className="text-xl font-semibold text-text-primary">Profile</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Input label="Wallet Address" disabled value="0x123...abc" rightElement={<CopyButton text={"0x123...abc"} />} />
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
    </div>
  );
}
