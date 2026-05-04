# Breadcrumb Component

A breadcrumb navigation component for displaying hierarchical page structure with full accessibility support.

## Features

- ✅ **Route Hierarchy**: Automatically reflects the current route structure
- ✅ **Current Page Indication**: Properly marks the active page with `aria-current="page"`
- ✅ **Keyboard Navigation**: Full keyboard support with visible focus indicators
- ✅ **Accessibility**: WCAG compliant with proper ARIA labels and semantic HTML
- ✅ **Customizable**: Support for custom labels and manual breadcrumb control
- ✅ **Responsive**: Wraps gracefully on smaller screens

## Basic Usage

### Automatic Breadcrumbs

The simplest way to use breadcrumbs is with the `useBreadcrumbs()` hook, which automatically generates breadcrumbs from the current route:

```tsx
import { Breadcrumb } from "@/components/ui";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

export default function MyPage() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <div>
      <Breadcrumb items={breadcrumbs} />
      {/* Page content */}
    </div>
  );
}
```

### Custom Labels

Override default route labels with custom text:

```tsx
const breadcrumbs = useBreadcrumbs({
  "user-123": "John Doe",
  settings: "User Settings",
});
```

### Manual Control

For complete control over breadcrumb items:

```tsx
import { useCustomBreadcrumbs } from "@/hooks/useBreadcrumbs";

const breadcrumbs = useCustomBreadcrumbs([
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Profile", isCurrent: true },
]);
```

## Props

### Breadcrumb Component

| Prop           | Type               | Default     | Description                                    |
| -------------- | ------------------ | ----------- | ---------------------------------------------- |
| `items`        | `BreadcrumbItem[]` | required    | Array of breadcrumb items to display           |
| `className`    | `string`           | `undefined` | Optional className for the container           |
| `showHomeIcon` | `boolean`          | `true`      | Whether to show a home icon for the first item |

### BreadcrumbItem Type

```typescript
interface BreadcrumbItem {
  label: string; // Display label for the breadcrumb
  href?: string; // URL path for the breadcrumb link
  isCurrent?: boolean; // Whether this is the current/active page
}
```

## Examples

### Basic Three-Level Breadcrumb

```tsx
<Breadcrumb
  items={[
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", isCurrent: true },
  ]}
/>
```

### Deep Hierarchy

```tsx
<Breadcrumb
  items={[
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Swaps", href: "/swaps" },
    { label: "Swap #12345", href: "/swaps/12345" },
    { label: "Transaction Details", isCurrent: true },
  ]}
/>
```

### Without Home Icon

```tsx
<Breadcrumb items={breadcrumbs} showHomeIcon={false} />
```

## Accessibility

The breadcrumb component follows WCAG 2.1 Level AA guidelines:

### Keyboard Navigation

- **Tab**: Navigate between breadcrumb links
- **Enter/Space**: Activate the focused link
- **Shift+Tab**: Navigate backwards

### ARIA Attributes

- `<nav aria-label="Breadcrumb">`: Identifies the navigation landmark
- `aria-current="page"`: Marks the current page
- `aria-hidden="true"`: Hides decorative separators from screen readers

### Semantic HTML

- Uses `<nav>` element for navigation landmark
- Uses `<ol>` (ordered list) for breadcrumb structure
- Uses `<li>` for each breadcrumb item

### Focus Indicators

- Visible focus ring on keyboard navigation
- High contrast focus indicators
- Consistent with the design system

## Hooks

### useBreadcrumbs(customLabels?)

Automatically generates breadcrumb items from the current route.

**Parameters:**

- `customLabels` (optional): Record of custom labels to override defaults

**Returns:** `BreadcrumbItem[]`

**Example:**

```tsx
const breadcrumbs = useBreadcrumbs({
  dashboard: "My Dashboard",
  settings: "Preferences",
});
```

### useCustomBreadcrumbs(items)

Returns the provided breadcrumb items unchanged. Useful for manual control.

**Parameters:**

- `items`: Array of `BreadcrumbItem` objects

**Returns:** `BreadcrumbItem[]`

**Example:**

```tsx
const breadcrumbs = useCustomBreadcrumbs([
  { label: "Home", href: "/" },
  { label: "Custom Page", isCurrent: true },
]);
```

## Route Label Mappings

The `useBreadcrumbs` hook includes predefined labels for common routes:

- `dashboard` → "Dashboard"
- `swap` → "Swap"
- `swaps` → "Swap History"
- `marketplace` → "Marketplace"
- `orders` → "Orders"
- `htlcs` → "HTLCs"
- `settings` → "Settings"
- `protocol` → "Protocol"
- `transactions` → "Transactions"
- `admin` → "Admin"
- `analytics` → "Analytics"
- `notifications` → "Notifications"

For routes not in this list, the hook will automatically format the segment by:

1. Replacing hyphens and underscores with spaces
2. Capitalizing each word

Example: `user-profile` → "User Profile"

## Styling

The breadcrumb component uses Tailwind CSS classes and follows the design system:

- **Colors**: Uses semantic color tokens (`text-text-primary`, `text-text-secondary`, etc.)
- **Spacing**: Consistent with the design system spacing scale
- **Typography**: Uses the default font stack with appropriate sizes
- **Transitions**: Smooth hover and focus transitions
- **Responsive**: Wraps gracefully on smaller screens

## Testing

The component includes comprehensive unit tests covering:

- Rendering breadcrumb items
- Link generation
- Current page indication
- ARIA attributes
- Keyboard navigation
- Custom labels
- Edge cases (empty, single item, deep hierarchy)

Run tests with:

```bash
npm test breadcrumb
```

## Storybook

View all breadcrumb variations in Storybook:

```bash
npm run storybook
```

Navigate to **UI > Breadcrumb** to see:

- Default breadcrumb
- With/without home icon
- Deep hierarchy
- Custom labels
- Keyboard navigation demo

## Integration Examples

See the following pages for real-world usage:

- `/app/settings/page.tsx` - Settings page with breadcrumbs
- `/app/swaps/page.tsx` - Swap history with breadcrumbs
- `/app/dashboard/page.tsx` - Dashboard with breadcrumbs
- `/app/admin/page.tsx` - Admin dashboard with breadcrumbs
- `/app/examples/breadcrumbs/page.tsx` - Comprehensive examples

## Best Practices

1. **Always include breadcrumbs on detail pages** - They help users understand their location in the site hierarchy
2. **Use automatic breadcrumbs when possible** - The `useBreadcrumbs()` hook handles most cases
3. **Provide custom labels for dynamic routes** - Use the `customLabels` parameter for user-specific or ID-based routes
4. **Don't use breadcrumbs on top-level pages** - The home page doesn't need breadcrumbs
5. **Keep labels concise** - Long labels can wrap awkwardly on mobile devices
6. **Test keyboard navigation** - Ensure all links are reachable via Tab key

## Browser Support

The breadcrumb component works in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Related Components

- **Navbar** - Top-level navigation
- **Sidebar** - Primary navigation menu
- **Pagination** - Navigate through lists
