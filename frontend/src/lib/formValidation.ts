import { ReactNode } from "react";

export interface ValidationResult {
  valid: boolean;
  message?: string;
  field?: string;
}

export interface FieldValidationRule {
  field: string;
  validate: (value: unknown, form?: Record<string, unknown>) => ValidationResult;
  message?: string;
}

export interface FormValidatorOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface FieldState {
  value: unknown;
  error: string | null;
  touched: boolean;
  validating: boolean;
}

export interface FormValidationState {
  fields: Record<string, FieldState>;
  isValid: boolean;
  hasSubmitted: boolean;
}

export function createFieldValidator<T>(
  validate: (value: T) => boolean | ValidationResult,
  message?: string
) {
  return (value: T): ValidationResult => {
    const result = validate(value);
    if (typeof result === "boolean") {
      return { valid: result, message: message };
    }
    return result;
  };
}

export const required = createFieldValidator<string>(
  (value) => ({
    valid: value !== null && value !== undefined && value !== "",
    message: "This field is required",
  }),
  "This field is required"
);

export const minLength = (min: number, message?: string) =>
  createFieldValidator<string>(
    (value) => ({
      valid: !value || value.length >= min,
      message: message ?? `Must be at least ${min} characters`,
    }),
    message ?? `Must be at least ${min} characters`
  );

export const maxLength = (max: number, message?: string) =>
  createFieldValidator<string>(
    (value) => ({
      valid: !value || value.length <= max,
      message: message ?? `Must be no more than ${max} characters`,
    }),
    message ?? `Must be no more than ${max} characters`
  );

export const pattern = (regex: RegExp, message: string) =>
  createFieldValidator<string>(
    (value) => ({
      valid: !value || regex.test(value),
      message,
    }),
    message
  );

export const minValue = (min: number, message?: string) =>
  createFieldValidator<number>(
    (value) => ({
      valid: !value || value >= min,
      message: message ?? `Must be at least ${min}`,
    }),
    message ?? `Must be at least ${min}`
  );

export const maxValue = (max: number, message?: string) =>
  createFieldValidator<number>(
    (value) => ({
      valid: !value || value <= max,
      message: message ?? `Must be no more than ${max}`,
    }),
    message ?? `Must be no more than ${max}`
  );

export const email = pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address");

export const url = pattern(
  /^https?:\/\/.+/,
  "Please enter a valid URL starting with http:// or https://"
);

export function combine(...validators: Array<(value: unknown) => ValidationResult>) {
  return (value: unknown): ValidationResult => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  };
}

export function createFormValidator(rules: FieldValidationRule[]) {
  return (form: Record<string, unknown>): Record<string, ValidationResult> => {
    const errors: Record<string, ValidationResult> = {};

    for (const rule of rules) {
      const value = form[rule.field];
      const result = rule.validate(value, form);
      if (!result.valid) {
        errors[rule.field] = result;
      }
    }

    return errors;
  };
}

export function validateForm(
  form: Record<string, unknown>,
  rules: FieldValidationRule[]
): { valid: boolean; errors: Record<string, ValidationResult> } {
  const errors: Record<string, ValidationResult> = {};

  for (const rule of rules) {
    const value = form[rule.field];
    const result = rule.validate(value, form);
    if (!result.valid) {
      errors[rule.field] = { ...result, field: rule.field };
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getFieldError(
  errors: Record<string, ValidationResult>,
  field: string
): string | undefined {
  const error = errors[field];
  return error?.message;
}

export function getFirstError(
  errors: Record<string, ValidationResult>
): ValidationResult | undefined {
  const keys = Object.keys(errors);
  if (keys.length === 0) return undefined;
  return errors[keys[0]];
}

export function formatValidationMessage(result: ValidationResult, fieldLabel?: string): string {
  if (result.valid) return "";
  if (!result.message) return `Invalid value for ${fieldLabel || "field"}`;
  if (fieldLabel) {
    return result.message.replace("{field}", fieldLabel);
  }
  return result.message;
}
