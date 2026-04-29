# FormField Component Migration Guide

## Overview

The `FormField` component is a reusable wrapper that handles label, hint, error, and control composition with proper accessibility attributes. This guide shows how to migrate existing form components to use `FormField`.

## Benefits

- **Reduces duplicated markup**: No need to repeat label, hint, and error structure
- **Automatic accessibility**: `aria-describedby`, `aria-invalid`, and `aria-required` are wired automatically
- **Consistent styling**: Unified approach to form field presentation
- **Works with any control**: Input, select, textarea, or custom components

## Basic Usage

```tsx
import { FormField } from "@/components/ui/form-field";

<FormField
  id="email"
  label="Email Address"
  hint="We'll never share your email"
  error={errors.email}
  required
>
  {(props) => <input {...props} type="email" className="..." />}
</FormField>;
```

## Migration Examples

### Before: Input Component

```tsx
// OLD: frontend/src/components/ui/input.tsx
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftElement, rightElement, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = inputId ? `${inputId}-error` : undefined;
    const hintId = inputId ? `${inputId}-hint` : undefined;
    const describedBy = (error ? errorId : undefined) ?? (hint ? hintId : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftElement && (
            <div className="absolute left-3 flex items-center text-text-muted" aria-hidden="true">
              {leftElement}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={describedBy}
            className={cn(
              "w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm",
              error && "border-status-error/50 focus:ring-status-error/50",
              leftElement && "pl-10",
              rightElement && "pr-10",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center text-text-muted" aria-hidden="true">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-status-error">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-xs text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
```

### After: Using FormField

```tsx
// NEW: Refactored using FormField
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftElement, rightElement, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <FormField id={inputId} label={label} error={error} hint={hint}>
        {(fieldProps) => (
          <div className="relative flex items-center">
            {leftElement && (
              <div className="absolute left-3 flex items-center text-text-muted" aria-hidden="true">
                {leftElement}
              </div>
            )}
            <input
              ref={ref}
              {...fieldProps}
              className={cn(
                "w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm",
                fieldProps["aria-invalid"] && "border-status-error/50 focus:ring-status-error/50",
                leftElement && "pl-10",
                rightElement && "pr-10",
                className
              )}
              {...props}
            />
            {rightElement && (
              <div
                className="absolute right-3 flex items-center text-text-muted"
                aria-hidden="true"
              >
                {rightElement}
              </div>
            )}
          </div>
        )}
      </FormField>
    );
  }
);
```

**Lines Removed**: ~30 lines of duplicated label/hint/error logic

### Before: Select Component

```tsx
// OLD: frontend/src/components/ui/select.tsx
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = selectId ? `${selectId}-error` : undefined;
    const hintId = selectId ? `${selectId}-hint` : undefined;
    const describedBy = (error ? errorId : undefined) ?? (hint ? hintId : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "w-full appearance-none rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm",
              error && "border-red-500/50 focus:ring-red-500/50",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-text-muted" />
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-xs text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
```

### After: Using FormField

```tsx
// NEW: Refactored using FormField
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <FormField id={selectId} label={label} error={error} hint={hint} className="w-full">
        {(fieldProps) => (
          <div className="relative flex items-center">
            <select
              ref={ref}
              {...fieldProps}
              className={cn(
                "w-full appearance-none rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm",
                fieldProps["aria-invalid"] && "border-status-error/50 focus:ring-status-error/50",
                className
              )}
              {...props}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-text-muted" />
          </div>
        )}
      </FormField>
    );
  }
);
```

**Lines Removed**: ~25 lines of duplicated label/hint/error logic

## Inline Form Usage

For forms that don't use the `Input` or `Select` components, you can use `FormField` directly:

### Before

```tsx
<div className="flex flex-col gap-1.5">
  <label htmlFor="amount" className="text-sm font-medium text-text-secondary">
    Amount
  </label>
  <input id="amount" type="number" aria-describedby="amount-hint" className="..." />
  <p id="amount-hint" className="text-xs text-text-muted">
    Enter amount in USD
  </p>
</div>
```

### After

```tsx
<FormField id="amount" label="Amount" hint="Enter amount in USD">
  {(props) => <input {...props} type="number" className="..." />}
</FormField>
```

## Custom Controls

`FormField` works with any custom control:

```tsx
<FormField
  id="asset-selector"
  label="Select Asset"
  hint="Choose the asset you want to swap"
  error={errors.asset}
>
  {(props) => <ChainAssetSelector {...props} value={selectedAsset} onChange={setSelectedAsset} />}
</FormField>
```

## Key Props

| Prop             | Type       | Description                                     |
| ---------------- | ---------- | ----------------------------------------------- |
| `id`             | `string`   | **Required**. Unique identifier for the control |
| `label`          | `string`   | Label text displayed above the control          |
| `error`          | `string`   | Error message (takes precedence over hint)      |
| `hint`           | `string`   | Hint text (hidden when error is present)        |
| `required`       | `boolean`  | Shows asterisk and sets `aria-required`         |
| `className`      | `string`   | Additional classes for wrapper                  |
| `labelClassName` | `string`   | Additional classes for label                    |
| `children`       | `function` | Render prop receiving field props               |

## Child Props

The render prop function receives these props to spread on your control:

```tsx
{
  id: string;
  "aria-describedby"?: string;  // Links to hint/error
  "aria-invalid"?: boolean;      // true when error present
  "aria-required"?: boolean;     // true when required
}
```

## Accessibility Features

✅ **Automatic ARIA attributes**: `aria-describedby`, `aria-invalid`, `aria-required`  
✅ **Proper label association**: `htmlFor` links label to control  
✅ **Error announcements**: Error messages use `role="alert"`  
✅ **Required field indication**: Visual asterisk with `aria-label`

## Migration Checklist

- [ ] Identify components with duplicated label/hint/error markup
- [ ] Import `FormField` from `@/components/ui/form-field`
- [ ] Replace wrapper `<div>` with `<FormField>`
- [ ] Move `label`, `error`, `hint` to `FormField` props
- [ ] Wrap control in render prop function
- [ ] Spread `fieldProps` on the control element
- [ ] Remove manual `aria-describedby`, `aria-invalid` logic
- [ ] Remove manual error/hint rendering
- [ ] Test accessibility with screen reader
- [ ] Run tests to verify functionality

## Testing

The component includes comprehensive tests covering:

- Label rendering and association
- Hint and error display logic
- ARIA attribute wiring
- Required field handling
- Support for input, select, textarea, and custom controls

Run tests:

```bash
npm test -- form-field.test.tsx
```

## Storybook

View interactive examples:

```bash
npm run storybook
```

Navigate to **UI > FormField** to see all variations.
