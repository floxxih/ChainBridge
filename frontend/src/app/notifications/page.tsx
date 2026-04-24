"use client";

import { useMemo, useState } from "react";
import { Bell, CheckCheck, Filter } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";

type NotificationType = "swap" | "security" | "system";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  unread: boolean;
};

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    title: "Swap Completed",
    message: "Your BTC -> XLM swap was finalized successfully.",
    type: "swap",
    createdAt: "2026-04-24T06:10:00.000Z",
    unread: true,
  },
  {
    id: "n2",
    title: "Security Reminder",
    message: "Review connected devices and wallet permissions.",
    type: "security",
    createdAt: "2026-04-24T05:00:00.000Z",
    unread: true,
  },
  {
    id: "n3",
    title: "Indexer Delay Resolved",
    message: "Transaction indexing latency is back to normal.",
    type: "system",
    createdAt: "2026-04-23T22:40:00.000Z",
    unread: false,
  },
];

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | NotificationType>("all");

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.type === filter)),
    [filter, items],
  );

  const unreadCount = items.filter((item) => item.unread).length;

  const markAllRead = () =>
    setItems((current) => current.map((item) => ({ ...item, unread: false })));

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Notifications Center</h1>
          <p className="text-sm text-text-secondary mt-1">
            Track swap updates, security warnings, and system notices.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<CheckCheck className="h-4 w-4" />}
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          Mark all read
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          {(["all", "swap", "security", "system"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                filter === type
                  ? "border-brand-500 bg-brand-500/10 text-brand-500"
                  : "border-border bg-surface-overlay text-text-secondary"
              }`}
            >
              {type}
            </button>
          ))}
          <Badge variant={unreadCount > 0 ? "warning" : "success"} className="ml-auto">
            {unreadCount} unread
          </Badge>
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-10 text-center text-text-muted">
            <Bell className="h-6 w-6 mx-auto mb-2" />
            No notifications for this filter.
          </Card>
        ) : (
          filtered.map((item) => (
            <Card
              key={item.id}
              className={`p-4 border ${item.unread ? "border-brand-500/40" : "border-border"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-text-primary">{item.title}</h2>
                  <p className="text-sm text-text-secondary mt-1">{item.message}</p>
                  <p className="text-xs text-text-muted mt-2">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                {item.unread && <Badge variant="info">new</Badge>}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
