# FormField Component

A reusable form field wrapper that handles label, hint, error, and control composition with proper accessibility attributes.

## Features

- ✅ Works with input, select, textarea, and custom controls
- ✅ Automatic `aria-describedby` wiring for hints and errors
- ✅ Automatic `aria-invalid` and `aria-required` attributes
- ✅ Reduces duplicated markup across forms
- ✅ Consistent styling and structure
- ✅ Full TypeScript support
- ✅ Comprehensive test coverage

## Quick Start

```tsx
import { FormField } from "@/components/ui/form-field";

<FormField
  id="email"
  label="Email Address"
  hint="We'll never share your email"
  error={errors.email}
  required
>
  {(props) => (
    <input
      {...props}
      type="email"
      placeholder="you@example.com"
      className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5"
    />
  )}
</FormField>;
```

## Props

| Prop             | Type                                        | Required | Description                                                       |
| ---------------- | ------------------------------------------- | -------- | ----------------------------------------------------------------- |
| `id`             | `string`                                    | ✅       | Unique identifier for the form control                            |
| `label`          | `string`                                    | ❌       | Label text displayed above the control                            |
| `error`          | `string`                                    | ❌       | Error message displayed below the control                         |
| `hint`           | `string`                                    | ❌       | Hint text displayed below the control (hidden when error present) |
| `required`       | `boolean`                                   | ❌       | Shows asterisk and sets `aria-required`                           |
| `className`      | `string`                                    | ❌       | Additional CSS classes for the wrapper                            |
| `labelClassName` | `string`                                    | ❌       | Additional CSS classes for the label                              |
| `children`       | `(props: FormFieldChildProps) => ReactNode` | ✅       | Render prop function receiving field props                        |

## Child Props

The render prop function receives these props to spread on your control:

```typescript
{
  id: string;                    // Control ID
  "aria-describedby"?: string;   // Links to hint/error element
  "aria-invalid"?: boolean;      // true when error is present
  "aria-required"?: boolean;     // true when required is true
}
```

## Examples

### Basic Input

```tsx
<FormField id="username" label="Username" hint="Choose a unique username">
  {(props) => <input {...props} type="text" className="..." />}
</FormField>
```

### Input with Error

```tsx
<FormField id="password" label="Password" error="Password must be at least 8 characters" required>
  {(props) => (
    <input
      {...props}
      type="password"
      className={cn("...", props["aria-invalid"] && "border-status-error/50")}
    />
  )}
</FormField>
```

### Select Dropdown

```tsx
<FormField id="country" label="Country" hint="Select your country">
  {(props) => (
    <select {...props} className="...">
      <option value="">Select...</option>
      <option value="us">United States</option>
      <option value="uk">United Kingdom</option>
    </select>
  )}
</FormField>
```

### Textarea

```tsx
<FormField id="bio" label="Bio" hint="Tell us about yourself">
  {(props) => <textarea {...props} rows={4} className="..." />}
</FormField>
```

### Custom Control

```tsx
<FormField id="asset" label="Select Asset" hint="Choose the asset you want to swap">
  {(props) => <ChainAssetSelector {...props} value={selectedAsset} onChange={setSelectedAsset} />}
</FormField>
```

### Input with Icon

```tsx
<FormField id="email" label="Email" hint="Enter your work email">
  {(props) => (
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2" />
      <input {...props} type="email" className="... pl-10" />
    </div>
  )}
</FormField>
```

## Accessibility

The component automatically handles accessibility attributes:

- **Label Association**: `htmlFor` attribute links label to control
- **Error Announcements**: Error messages use `role="alert"` for screen readers
- **Hint/Error Linking**: `aria-describedby` connects control to hint/error text
- **Invalid State**: `aria-invalid` indicates validation errors
- **Required Fields**: `aria-required` and visual asterisk for required fields

## Testing

Run the test suite:

```bash
npm test -- form-field.test.tsx
```

## Storybook

View interactive examples:

```bash
npm run storybook
```

Navigate to **UI > FormField** to explore all variations.

## Migration

See [FORM_FIELD_MIGRATION.md](../../../FORM_FIELD_MIGRATION.md) for guidance on refactoring existing components to use `FormField`.

## Related Components

- `Input` - Can be refactored to use `FormField` internally
- `Select` - Can be refactored to use `FormField` internally
- `ChainAssetSelector` - Works as a custom control with `FormField`
