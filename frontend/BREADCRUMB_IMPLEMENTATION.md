# Breadcrumb Navigation Implementation

This document describes the implementation of breadcrumb navigation for the ChainBridge frontend application.

## Overview

Breadcrumb navigation has been implemented to improve user orientation on detail pages and nested views. The implementation includes:

- ✅ Automatic breadcrumb generation from routes
- ✅ Current page indication with proper ARIA attributes
- ✅ Full keyboard navigation support
- ✅ Customizable labels and manual control
- ✅ Comprehensive test coverage
- ✅ Storybook documentation

## Acceptance Criteria

All acceptance criteria have been met:

### ✅ Breadcrumbs reflect route hierarchy

- Automatic generation from URL pathname
- Support for multi-level navigation
- Proper parent-child relationships

### ✅ Current page is properly indicated

- Visual distinction for current page (no link, different styling)
- `aria-current="page"` attribute for accessibility
- Last item in breadcrumb trail is marked as current

### ✅ Keyboard navigation is supported

- Tab key navigates between breadcrumb links
- Visible focus indicators on all interactive elements
- Focus ring with proper contrast and offset
- Enter/Space keys activate links

## Files Created

### Components

- `frontend/src/components/ui/breadcrumb.tsx` - Main breadcrumb component
- `frontend/src/components/ui/breadcrumb.stories.tsx` - Storybook stories
- `frontend/src/components/ui/breadcrumb.README.md` - Component documentation

### Hooks

- `frontend/src/hooks/useBreadcrumbs.ts` - Breadcrumb generation hooks

### Tests

- `frontend/src/components/ui/__tests__/breadcrumb.test.tsx` - Component tests (17 tests)
- `frontend/src/hooks/__tests__/useBreadcrumbs.test.tsx` - Hook tests (12 tests)

### Examples

- `frontend/src/app/examples/breadcrumbs/page.tsx` - Comprehensive examples page

### Documentation

- `frontend/BREADCRUMB_IMPLEMENTATION.md` - This file

## Files Modified

The following pages have been updated to include breadcrumb navigation:

1. `frontend/src/components/ui/index.ts` - Added breadcrumb exports
2. `frontend/src/app/settings/page.tsx` - Added breadcrumbs
3. `frontend/src/app/swaps/page.tsx` - Added breadcrumbs
4. `frontend/src/app/dashboard/page.tsx` - Added breadcrumbs
5. `frontend/src/app/admin/page.tsx` - Added breadcrumbs

## Usage

### Basic Usage (Automatic)

The simplest way to add breadcrumbs to a page:

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

### With Custom Labels

Override default labels for specific routes:

```tsx
const breadcrumbs = useBreadcrumbs({
  "user-123": "John Doe",
  settings: "User Preferences",
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

## Component API

### Breadcrumb Props

| Prop           | Type               | Default     | Description                  |
| -------------- | ------------------ | ----------- | ---------------------------- |
| `items`        | `BreadcrumbItem[]` | required    | Array of breadcrumb items    |
| `className`    | `string`           | `undefined` | Optional CSS class           |
| `showHomeIcon` | `boolean`          | `true`      | Show home icon on first item |

### BreadcrumbItem Type

```typescript
interface BreadcrumbItem {
  label: string; // Display text
  href?: string; // Link URL (omit for current page)
  isCurrent?: boolean; // Mark as current page
}
```

## Accessibility Features

The breadcrumb component is fully accessible and follows WCAG 2.1 Level AA guidelines:

### Semantic HTML

- `<nav aria-label="Breadcrumb">` - Navigation landmark
- `<ol>` - Ordered list structure
- `<li>` - List items for each breadcrumb

### ARIA Attributes

- `aria-current="page"` - Marks the current page
- `aria-hidden="true"` - Hides decorative separators
- `aria-label="Breadcrumb"` - Labels the navigation region

### Keyboard Navigation

- **Tab** - Move to next breadcrumb link
- **Shift+Tab** - Move to previous breadcrumb link
- **Enter/Space** - Activate focused link

### Visual Indicators

- Visible focus ring on keyboard navigation
- High contrast focus indicators (2px ring with offset)
- Hover states for interactive elements
- Clear visual distinction between current and linked items

## Testing

### Unit Tests

All tests pass successfully:

- 17 component tests
- 12 hook tests
- 29 total tests

Run tests with:

```bash
npm test -- breadcrumb
```

### Test Coverage

- ✅ Rendering breadcrumb items
- ✅ Link generation
- ✅ Current page indication
- ✅ ARIA attributes
- ✅ Home icon display
- ✅ Separators
- ✅ Empty state
- ✅ Custom className
- ✅ Single item
- ✅ Deep hierarchy
- ✅ Route label mappings
- ✅ Custom labels
- ✅ Pathname changes
- ✅ Memoization

## Storybook

View all breadcrumb variations in Storybook:

```bash
npm run storybook
```

Navigate to **UI > Breadcrumb** to see:

- Default breadcrumb
- With/without home icon
- Deep hierarchy
- Long labels
- Keyboard navigation demo
- Empty state

## Route Label Mappings

The `useBreadcrumbs` hook includes predefined labels for common routes:

```typescript
const ROUTE_LABELS = {
  dashboard: "Dashboard",
  swap: "Swap",
  swaps: "Swap History",
  marketplace: "Marketplace",
  orders: "Orders",
  htlcs: "HTLCs",
  settings: "Settings",
  protocol: "Protocol",
  transactions: "Transactions",
  admin: "Admin",
  analytics: "Analytics",
  notifications: "Notifications",
  browse: "Browse",
  tracking: "Tracking",
  examples: "Examples",
  components: "Components",
};
```

For unlisted routes, the hook automatically formats the segment:

- Replaces hyphens/underscores with spaces
- Capitalizes each word
- Example: `user-profile` → "User Profile"

## Integration Examples

### Settings Page

```tsx
// frontend/src/app/settings/page.tsx
const breadcrumbs = useBreadcrumbs();
return (
  <div>
    <Breadcrumb items={breadcrumbs} />
    {/* Settings content */}
  </div>
);
```

### Swap History Page

```tsx
// frontend/src/app/swaps/page.tsx
const breadcrumbs = useBreadcrumbs();
return (
  <div>
    <Breadcrumb items={breadcrumbs} />
    {/* Swap history content */}
  </div>
);
```

### Admin Dashboard

```tsx
// frontend/src/app/admin/page.tsx
const breadcrumbs = useBreadcrumbs();
return (
  <div>
    <Breadcrumb items={breadcrumbs} />
    {/* Admin dashboard content */}
  </div>
);
```

## Design System Integration

The breadcrumb component follows the existing design system:

### Colors

- `text-text-primary` - Current page text
- `text-text-secondary` - Link text
- `text-text-muted` - Separator icons
- `text-brand-500` - Focus ring

### Spacing

- `gap-1.5` - Space between items and separators
- `px-2 py-1` - Link padding
- `mb-6` - Bottom margin in page layouts

### Typography

- `text-sm` - Font size
- `font-medium` - Current page weight

### Transitions

- `duration-[var(--motion-fast)]` - Hover transitions
- Smooth color changes on hover/focus

### Focus States

- 2px ring with brand color
- 2px offset from element
- Visible on keyboard navigation only

## Browser Support

The breadcrumb component works in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

The breadcrumb component is optimized for performance:

### Memoization

- `useBreadcrumbs` uses `useMemo` to prevent unnecessary recalculations
- Only recalculates when pathname or custom labels change

### Bundle Size

- Minimal impact on bundle size
- Uses existing dependencies (lucide-react, Next.js)
- No additional external dependencies

### Rendering

- Lightweight component with minimal DOM nodes
- No expensive computations
- Fast initial render and updates

## Future Enhancements

Potential improvements for future iterations:

1. **Breadcrumb Truncation** - Collapse middle items on very deep hierarchies
2. **Mobile Optimization** - Show only last 2-3 items on small screens
3. **Schema.org Markup** - Add structured data for SEO
4. **Breadcrumb Dropdown** - Allow navigation to any parent level via dropdown
5. **Animation** - Subtle transitions when breadcrumbs change
6. **Customizable Separators** - Allow custom separator icons/text

## Maintenance

### Adding New Route Labels

To add labels for new routes, update the `ROUTE_LABELS` object in `frontend/src/hooks/useBreadcrumbs.ts`:

```typescript
const ROUTE_LABELS: Record<string, string> = {
  // ... existing labels
  "new-route": "New Route Label",
};
```

### Updating Styles

Breadcrumb styles are defined in `frontend/src/components/ui/breadcrumb.tsx`. Use Tailwind utility classes and follow the existing design system patterns.

### Testing Changes

After making changes:

1. Run unit tests: `npm test -- breadcrumb`
2. Check TypeScript: `npm run type-check`
3. View in Storybook: `npm run storybook`
4. Test keyboard navigation manually

## Related Documentation

- [Component README](./src/components/ui/breadcrumb.README.md) - Detailed component documentation
- [Storybook](http://localhost:6006/?path=/docs/ui-breadcrumb--docs) - Interactive examples
- [Examples Page](/examples/breadcrumbs) - Live examples in the app

## Support

For questions or issues with the breadcrumb implementation:

1. Check the component README
2. View examples in Storybook
3. Review the examples page at `/examples/breadcrumbs`
4. Check test files for usage patterns
