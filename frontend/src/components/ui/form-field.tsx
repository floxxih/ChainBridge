import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export interface FormFieldProps {
  /** Unique identifier for the form control */
  id: string;
  /** Label text displayed above the control */
  label?: string;
  /** Error message displayed below the control */
  error?: string;
  /** Hint text displayed below the control when no error */
  hint?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** Additional CSS classes for the label */
  labelClassName?: string;
  /** The form control element (input, select, textarea, custom component) */
  children: (props: FormFieldChildProps) => ReactNode;
}

export interface FormFieldChildProps {
  /** ID to be applied to the control element */
  id: string;
  /** Computed aria-describedby value linking to hint/error */
  "aria-describedby"?: string;
  /** Computed aria-invalid value based on error state */
  "aria-invalid"?: boolean;
  /** Computed aria-required value based on required prop */
  "aria-required"?: boolean;
}

/**
 * FormField - Reusable form field wrapper for label, hint, error, and control composition
 * 
 * Provides consistent structure and accessibility attributes for form controls.
 * Works with input, select, textarea, and custom controls.
 * 
 * @example
 * ```tsx
 * <FormField
 *   id="email"
 *   label="Email Address"
 *   hint="We'll never share your email"
 *   error={errors.email}
 *   required
 * >
 *   {(props) => (
 *     <input
 *       {...props}
 *       type="email"
 *       className="..."
 *     />
 *   )}
 * </FormField>
 * ```
 */
export function FormField({
  id,
  label,
  error,
  hint,
  required,
  className,
  labelClassName,
  children,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  
  // Build aria-describedby from available hint/error
  const describedByIds: string[] = [];
  if (error) describedByIds.push(errorId);
  if (hint && !error) describedByIds.push(hintId);
  const describedBy = describedByIds.length > 0 ? describedByIds.join(" ") : undefined;

  const childProps: FormFieldChildProps = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-required": required ? true : undefined,
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium text-text-secondary",
            labelClassName
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-status-error" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      
      {children(childProps)}
      
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
