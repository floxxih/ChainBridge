# Breadcrumb Navigation - Visual Guide

## What It Looks Like

### Basic Breadcrumb

```
Home > Dashboard > Settings
```

### With Home Icon

```
🏠 Home > Dashboard > Settings
```

### Current Page (Not Clickable)

```
Home > Dashboard > Settings
         ↑         ↑        ↑
      (link)   (link)  (current - no link)
```

## Visual States

### Default State

- Links: Gray text (`text-text-secondary`)
- Current page: Dark text (`text-text-primary`)
- Separators: Chevron icons in muted gray

### Hover State

- Link background: Light gray (`bg-surface-raised`)
- Link text: Darker (`text-text-primary`)
- Smooth transition

### Focus State (Keyboard)

- 2px teal ring around link (`ring-brand-500`)
- 2px offset from element
- Visible and high contrast

## Layout Examples

### Standard Page Layout

```
┌─────────────────────────────────────────┐
│  🏠 Home > Dashboard > Settings         │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  │  Settings                         │ │
│  │                                   │ │
│  │  [Page Content]                   │ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Deep Hierarchy

```
🏠 Home > Dashboard > Swaps > Swap #12345 > Transaction Details
```

### Mobile (Wraps)

```
🏠 Home > Dashboard >
Swaps > Swap #12345 >
Transaction Details
```

## Color Scheme

### Light Mode

- Links: `#6B7280` (gray-500)
- Current: `#111827` (gray-900)
- Hover: `#374151` (gray-700)
- Focus ring: `#14B8A6` (teal-500)
- Background hover: `#F9FAFB` (gray-50)

### Dark Mode

- Links: `#9CA3AF` (gray-400)
- Current: `#F9FAFB` (gray-50)
- Hover: `#E5E7EB` (gray-200)
- Focus ring: `#14B8A6` (teal-500)
- Background hover: `#1F2937` (gray-800)

## Spacing

```
┌─ Breadcrumb Container ──────────────────┐
│                                         │
│  [Icon] Home  >  Dashboard  >  Settings │
│   ↑     ↑    ↑   ↑          ↑   ↑       │
│   4px   text 4px text       4px text    │
│                                         │
└─────────────────────────────────────────┘
     ↑                                 ↑
   mb-6                              mb-6
```

- Gap between items: `1.5` (6px)
- Link padding: `px-2 py-1` (8px horizontal, 4px vertical)
- Bottom margin: `mb-6` (24px)
- Icon size: `h-4 w-4` (16px)

## Typography

- Font size: `text-sm` (14px)
- Current page: `font-medium` (500 weight)
- Links: `font-normal` (400 weight)
- Line height: Default (1.5)

## Interactive Elements

### Clickable Links

```
┌──────────────┐
│  Dashboard   │  ← Clickable, has hover/focus states
└──────────────┘
```

### Current Page

```
┌──────────────┐
│  Settings    │  ← Not clickable, darker text
└──────────────┘
```

### Separators

```
    >    ← ChevronRight icon, decorative only
```

## Responsive Behavior

### Desktop (1280px+)

```
🏠 Home > Dashboard > Swaps > Swap #12345 > Transaction Details
```

### Tablet (768px - 1279px)

```
🏠 Home > Dashboard > Swaps >
Swap #12345 > Transaction Details
```

### Mobile (< 768px)

```
🏠 Home > Dashboard >
Swaps > Swap #12345 >
Transaction Details
```

## Accessibility Indicators

### Keyboard Focus

```
┌──────────────────────┐
│  ┌────────────────┐  │
│  │  Dashboard  ◄──┼──┼── 2px teal ring
│  └────────────────┘  │
└──────────────────────┘
     ↑
   2px offset
```

### Screen Reader Announcement

```
"Breadcrumb navigation"
"Home, link"
"Dashboard, link"
"Settings, current page"
```

## Real-World Examples

### Settings Page

```
🏠 Home > Settings
```

### Swap History

```
🏠 Home > Swap History
```

### Admin Dashboard

```
🏠 Home > Admin
```

### Deep Navigation

```
🏠 Home > Dashboard > Swaps > Swap #ABC123 > Transaction Details
```

## Component Variants

### With Home Icon (Default)

```tsx
<Breadcrumb items={breadcrumbs} />
// Result: 🏠 Home > Dashboard > Settings
```

### Without Home Icon

```tsx
<Breadcrumb items={breadcrumbs} showHomeIcon={false} />
// Result: Home > Dashboard > Settings
```

### Custom Styling

```tsx
<Breadcrumb items={breadcrumbs} className="mb-8" />
// Result: Same breadcrumb with 32px bottom margin
```

## Animation

### Hover Transition

- Duration: `150ms` (fast)
- Easing: `ease-in-out`
- Properties: `color`, `background-color`

### Focus Transition

- Instant ring appearance
- No animation on focus (accessibility requirement)

## Browser Rendering

### Chrome/Edge

```
🏠 Home › Dashboard › Settings
```

### Firefox

```
🏠 Home › Dashboard › Settings
```

### Safari

```
🏠 Home › Dashboard › Settings
```

All browsers render consistently with the same visual appearance.

## Print Styles

When printed, breadcrumbs:

- Remove hover states
- Keep link underlines
- Use black text
- Maintain hierarchy

## Dark Mode

The breadcrumb automatically adapts to dark mode:

- Lighter text colors
- Darker backgrounds on hover
- Same focus ring color (teal)
- Maintains contrast ratios

## Comparison with Other Patterns

### Breadcrumb (Hierarchical)

```
Home > Dashboard > Settings
```

### Tabs (Peer Navigation)

```
[Overview] [Settings] [Profile]
```

### Stepper (Sequential)

```
1. Details → 2. Review → 3. Confirm
```

Breadcrumbs are best for showing hierarchical location, not for peer navigation or sequential steps.
