"use client";

import { Breadcrumb, Card } from "@/components/ui";
import { useBreadcrumbs, useCustomBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Code } from "lucide-react";

export default function BreadcrumbExamplePage() {
  // Automatic breadcrumbs from route
  const autoBreadcrumbs = useBreadcrumbs();

  // Custom breadcrumbs with manual control
  const customBreadcrumbs = useCustomBreadcrumbs([
    { label: "Home", href: "/" },
    { label: "Examples", href: "/examples" },
    { label: "UI Components", href: "/examples/components" },
    { label: "Breadcrumb Demo", isCurrent: true },
  ]);

  // Breadcrumbs with custom labels
  const customLabelBreadcrumbs = useBreadcrumbs({
    examples: "Component Examples",
    breadcrumbs: "Breadcrumb Navigation",
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 md:py-20">
      <div className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
          <Code className="h-3.5 w-3.5" />
          Examples
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
          Breadcrumb Navigation
        </h1>
        <p className="mt-3 max-w-2xl text-base text-text-secondary">
          Breadcrumb component examples demonstrating automatic route-based generation, custom
          labels, and manual control.
        </p>
      </div>

      <div className="space-y-8">
        {/* Automatic Breadcrumbs */}
        <Card variant="raised" className="p-6">
          <h2 className="mb-4 text-xl font-bold text-text-primary">Automatic Breadcrumbs</h2>
          <p className="mb-4 text-sm text-text-secondary">
            Generated automatically from the current route using <code>useBreadcrumbs()</code>
          </p>
          <div className="rounded-xl border border-border bg-surface-overlay p-4">
            <Breadcrumb items={autoBreadcrumbs} />
          </div>
          <div className="mt-4 rounded-lg bg-surface-raised p-4">
            <pre className="overflow-x-auto text-xs text-text-secondary">
              <code>{`const breadcrumbs = useBreadcrumbs();
<Breadcrumb items={breadcrumbs} />`}</code>
            </pre>
          </div>
        </Card>

        {/* Custom Breadcrumbs */}
        <Card variant="raised" className="p-6">
          <h2 className="mb-4 text-xl font-bold text-text-primary">Custom Breadcrumbs</h2>
          <p className="mb-4 text-sm text-text-secondary">
            Manually defined breadcrumbs using <code>useCustomBreadcrumbs()</code>
          </p>
          <div className="rounded-xl border border-border bg-surface-overlay p-4">
            <Breadcrumb items={customBreadcrumbs} />
          </div>
          <div className="mt-4 rounded-lg bg-surface-raised p-4">
            <pre className="overflow-x-auto text-xs text-text-secondary">
              <code>{`const breadcrumbs = useCustomBreadcrumbs([
  { label: "Home", href: "/" },
  { label: "Examples", href: "/examples" },
  { label: "UI Components", href: "/examples/components" },
  { label: "Breadcrumb Demo", isCurrent: true },
]);
<Breadcrumb items={breadcrumbs} />`}</code>
            </pre>
          </div>
        </Card>

        {/* Custom Labels */}
        <Card variant="raised" className="p-6">
          <h2 className="mb-4 text-xl font-bold text-text-primary">Custom Labels</h2>
          <p className="mb-4 text-sm text-text-secondary">
            Override default route labels with custom text
          </p>
          <div className="rounded-xl border border-border bg-surface-overlay p-4">
            <Breadcrumb items={customLabelBreadcrumbs} />
          </div>
          <div className="mt-4 rounded-lg bg-surface-raised p-4">
            <pre className="overflow-x-auto text-xs text-text-secondary">
              <code>{`const breadcrumbs = useBreadcrumbs({
  examples: "Component Examples",
  breadcrumbs: "Breadcrumb Navigation",
});
<Breadcrumb items={breadcrumbs} />`}</code>
            </pre>
          </div>
        </Card>

        {/* Without Home Icon */}
        <Card variant="raised" className="p-6">
          <h2 className="mb-4 text-xl font-bold text-text-primary">Without Home Icon</h2>
          <p className="mb-4 text-sm text-text-secondary">
            Breadcrumbs without the home icon on the first item
          </p>
          <div className="rounded-xl border border-border bg-surface-overlay p-4">
            <Breadcrumb items={autoBreadcrumbs} showHomeIcon={false} />
          </div>
          <div className="mt-4 rounded-lg bg-surface-raised p-4">
            <pre className="overflow-x-auto text-xs text-text-secondary">
              <code>{`<Breadcrumb items={breadcrumbs} showHomeIcon={false} />`}</code>
            </pre>
          </div>
        </Card>

        {/* Deep Hierarchy */}
        <Card variant="raised" className="p-6">
          <h2 className="mb-4 text-xl font-bold text-text-primary">Deep Hierarchy</h2>
          <p className="mb-4 text-sm text-text-secondary">
            Breadcrumbs with multiple levels of navigation
          </p>
          <div className="rounded-xl border border-border bg-surface-overlay p-4">
            <Breadcrumb
              items={[
                { label: "Home", href: "/" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "Swaps", href: "/swaps" },
                { label: "Swap #12345", href: "/swaps/12345" },
                { label: "Transaction Details", isCurrent: true },
              ]}
            />
          </div>
          <div className="mt-4 rounded-lg bg-surface-raised p-4">
            <pre className="overflow-x-auto text-xs text-text-secondary">
              <code>{`<Breadcrumb
  items={[
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Swaps", href: "/swaps" },
    { label: "Swap #12345", href: "/swaps/12345" },
    { label: "Transaction Details", isCurrent: true },
  ]}
/>`}</code>
            </pre>
          </div>
        </Card>

        {/* Accessibility Features */}
        <Card variant="raised" className="p-6">
          <h2 className="mb-4 text-xl font-bold text-text-primary">Accessibility Features</h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-brand-500">✓</span>
              <span>
                <strong>Keyboard Navigation:</strong> Use Tab to navigate between breadcrumb links
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-brand-500">✓</span>
              <span>
                <strong>Focus Indicators:</strong> Visible focus ring on keyboard navigation
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-brand-500">✓</span>
              <span>
                <strong>ARIA Labels:</strong> Proper <code>aria-current="page"</code> on current
                item
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-brand-500">✓</span>
              <span>
                <strong>Semantic HTML:</strong> Uses <code>&lt;nav&gt;</code> and{" "}
                <code>&lt;ol&gt;</code> elements
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-brand-500">✓</span>
              <span>
                <strong>Screen Reader Support:</strong> Proper navigation landmark and list
                structure
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
