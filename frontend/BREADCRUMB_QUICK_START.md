# Breadcrumb Navigation - Quick Start Guide

## 5-Minute Integration Guide

### Step 1: Import the Components

```tsx
import { Breadcrumb } from "@/components/ui";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
```

### Step 2: Add to Your Page

```tsx
export default function MyPage() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <div>
      <Breadcrumb items={breadcrumbs} />
      {/* Your page content */}
    </div>
  );
}
```

That's it! The breadcrumbs will automatically reflect your route hierarchy.

## Common Patterns

### Pattern 1: Basic Page (Most Common)

```tsx
"use client";

import { Breadcrumb } from "@/components/ui";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

export default function SettingsPage() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <Breadcrumb items={breadcrumbs} />
      <h1>Settings</h1>
      {/* Page content */}
    </div>
  );
}
```

### Pattern 2: With Custom Labels

```tsx
export default function UserProfilePage({ params }: { params: { id: string } }) {
  const breadcrumbs = useBreadcrumbs({
    [params.id]: "John Doe", // Replace ID with user name
  });

  return (
    <div>
      <Breadcrumb items={breadcrumbs} />
      {/* Page content */}
    </div>
  );
}
```

### Pattern 3: Manual Control

```tsx
import { useCustomBreadcrumbs } from "@/hooks/useBreadcrumbs";

export default function CustomPage() {
  const breadcrumbs = useCustomBreadcrumbs([
    { label: "Home", href: "/" },
    { label: "Custom Section", href: "/custom" },
    { label: "Current Page", isCurrent: true },
  ]);

  return (
    <div>
      <Breadcrumb items={breadcrumbs} />
      {/* Page content */}
    </div>
  );
}
```

## Props Reference

### Breadcrumb Component

```tsx
<Breadcrumb
  items={breadcrumbs} // Required: Array of breadcrumb items
  showHomeIcon={true} // Optional: Show home icon (default: true)
  className="custom-class" // Optional: Additional CSS classes
/>
```

### BreadcrumbItem Type

```typescript
interface BreadcrumbItem {
  label: string; // Display text
  href?: string; // Link URL (omit for current page)
  isCurrent?: boolean; // Mark as current page
}
```

## Examples by Route Type

### Static Route

```tsx
// Route: /settings
const breadcrumbs = useBreadcrumbs();
// Result: Home > Settings
```

### Nested Route

```tsx
// Route: /dashboard/settings
const breadcrumbs = useBreadcrumbs();
// Result: Home > Dashboard > Settings
```

### Dynamic Route

```tsx
// Route: /users/[id]
const breadcrumbs = useBreadcrumbs({
  [userId]: userName,
});
// Result: Home > Users > John Doe
```

### Deep Hierarchy

```tsx
// Route: /dashboard/swaps/abc123/details
const breadcrumbs = useBreadcrumbs({
  abc123: "Swap #ABC123",
});
// Result: Home > Dashboard > Swap History > Swap #ABC123 > Details
```

## Styling Tips

### Standard Layout (Recommended)

```tsx
<div className="container mx-auto max-w-5xl px-4 py-12">
  <div className="mb-6">
    <Breadcrumb items={breadcrumbs} />
  </div>
  {/* Page content */}
</div>
```

### Compact Layout

```tsx
<div className="mb-4">
  <Breadcrumb items={breadcrumbs} />
</div>
```

### Without Home Icon

```tsx
<Breadcrumb items={breadcrumbs} showHomeIcon={false} />
```

## Predefined Route Labels

These routes have predefined labels:

| Route            | Label         |
| ---------------- | ------------- |
| `/dashboard`     | Dashboard     |
| `/swap`          | Swap          |
| `/swaps`         | Swap History  |
| `/marketplace`   | Marketplace   |
| `/orders`        | Orders        |
| `/htlcs`         | HTLCs         |
| `/settings`      | Settings      |
| `/protocol`      | Protocol      |
| `/transactions`  | Transactions  |
| `/admin`         | Admin         |
| `/analytics`     | Analytics     |
| `/notifications` | Notifications |

Other routes are automatically formatted (e.g., `user-profile` → "User Profile").

## Testing Your Implementation

### Visual Check

1. Navigate to your page
2. Verify breadcrumbs appear at the top
3. Check that the current page is not a link
4. Verify all parent pages are clickable links

### Keyboard Navigation

1. Press Tab to focus on first breadcrumb link
2. Verify visible focus ring appears
3. Press Tab again to move to next link
4. Press Enter to navigate

### Screen Reader

1. Enable screen reader
2. Navigate to breadcrumbs
3. Verify "Breadcrumb navigation" is announced
4. Verify current page is marked as "current page"

## Troubleshooting

### Breadcrumbs not showing?

- Check that you're not on the home page (`/`)
- Verify the import paths are correct
- Ensure the component is inside a client component (`"use client"`)

### Wrong labels?

- Add custom labels via `useBreadcrumbs({ "route": "Label" })`
- Check the predefined labels in `useBreadcrumbs.ts`

### Styling issues?

- Ensure Tailwind CSS is configured
- Check that design system tokens are available
- Verify no conflicting CSS

## Need More Help?

- 📖 [Full Documentation](./BREADCRUMB_IMPLEMENTATION.md)
- 📖 [Component README](./src/components/ui/breadcrumb.README.md)
- 🎨 [Storybook Examples](http://localhost:6006/?path=/docs/ui-breadcrumb--docs)
- 💻 [Live Examples](/examples/breadcrumbs)
- 🧪 [Test Files](./src/components/ui/__tests__/breadcrumb.test.tsx)

## Real-World Examples

See these pages for working implementations:

- `frontend/src/app/settings/page.tsx`
- `frontend/src/app/swaps/page.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/admin/page.tsx`
