/**
 * FormField Usage Examples
 * 
 * This file demonstrates how to use the FormField component with various controls
 * and how to refactor existing Input/Select components to use it.
 */

import { FormField } from "./form-field";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

// ============================================================================
// Example 1: Basic Input Field
// ============================================================================

export function BasicInputExample() {
  return (
    <FormField
      id="email"
      label="Email Address"
      hint="We'll never share your email"
      required
    >
      {(props) => (
        <input
          {...props}
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm"
        />
      )}
    </FormField>
  );
}

// ============================================================================
// Example 2: Input with Error State
// ============================================================================

export function InputWithErrorExample() {
  return (
    <FormField
      id="password"
      label="Password"
      error="Password must be at least 8 characters"
      required
    >
      {(props) => (
        <input
          {...props}
          type="password"
          className={cn(
            "w-full rounded-xl border px-4 py-2.5 text-sm",
            props["aria-invalid"]
              ? "border-status-error/50 focus:ring-status-error/50"
              : "border-border"
          )}
        />
      )}
    </FormField>
  );
}

// ============================================================================
// Example 3: Select Dropdown
// ============================================================================

export function SelectExample() {
  return (
    <FormField
      id="country"
      label="Country"
      hint="Select your country of residence"
    >
      {(props) => (
        <div className="relative">
          <select
            {...props}
            className="w-full appearance-none rounded-xl border border-border bg-surface-raised px-4 py-2.5 pr-10 text-sm"
          >
            <option value="">Select a country...</option>
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
            <option value="ca">Canada</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
      )}
    </FormField>
  );
}

// ============================================================================
// Example 4: Textarea
// ============================================================================

export function TextareaExample() {
  return (
    <FormField
      id="description"
      label="Description"
      hint="Maximum 500 characters"
    >
      {(props) => (
        <textarea
          {...props}
          rows={4}
          placeholder="Enter description..."
          className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm resize-none"
        />
      )}
    </FormField>
  );
}

// ============================================================================
// Example 5: Input with Left/Right Elements
// ============================================================================

export function InputWithElementsExample() {
  return (
    <FormField
      id="amount"
      label="Amount"
      hint="Enter amount in USD"
    >
      {(props) => (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            $
          </div>
          <input
            {...props}
            type="number"
            placeholder="0.00"
            className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 pl-8 text-sm"
          />
        </div>
      )}
    </FormField>
  );
}

// ============================================================================
// Example 6: Custom Control (ChainAssetSelector)
// ============================================================================

export function CustomControlExample() {
  return (
    <FormField
      id="asset"
      label="Select Asset"
      hint="Choose the asset you want to swap"
    >
      {(props) => (
        <div
          {...props}
          role="combobox"
          aria-expanded="false"
          className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm cursor-pointer"
        >
          {/* Custom control implementation */}
          <span>BTC - Bitcoin</span>
        </div>
      )}
    </FormField>
  );
}

// ============================================================================
// Example 7: Refactored Input Component
// ============================================================================

import { InputHTMLAttributes, forwardRef } from "react";

interface RefactoredInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const RefactoredInput = forwardRef<HTMLInputElement, RefactoredInputProps>(
  ({ className, label, error, hint, leftElement, rightElement, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-") ?? "input";

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
                "w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary",
                "placeholder:text-text-muted",
                "transition-all duration-[var(--motion-fast)] ease-[var(--easing-standard)]",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                fieldProps["aria-invalid"] && "border-status-error/50 focus:ring-status-error/50",
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
        )}
      </FormField>
    );
  }
);

RefactoredInput.displayName = "RefactoredInput";

// ============================================================================
// Example 8: Refactored Select Component
// ============================================================================

import { SelectHTMLAttributes } from "react";

interface RefactoredSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { label: string; value: string }[];
}

export const RefactoredSelect = forwardRef<HTMLSelectElement, RefactoredSelectProps>(
  ({ className, label, error, hint, options, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-") ?? "select";

    return (
      <FormField id={selectId} label={label} error={error} hint={hint} className="w-full">
        {(fieldProps) => (
          <div className="relative flex items-center">
            <select
              ref={ref}
              {...fieldProps}
              className={cn(
                "w-full appearance-none rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary",
                "transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                fieldProps["aria-invalid"] && "border-status-error/50 focus:ring-status-error/50",
                className
              )}
              {...props}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface-raised text-text-primary">
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 flex items-center text-text-muted" aria-hidden="true">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        )}
      </FormField>
    );
  }
);

RefactoredSelect.displayName = "RefactoredSelect";
