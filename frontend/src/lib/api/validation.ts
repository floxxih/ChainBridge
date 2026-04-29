/**
 * Runtime validation utilities for API responses.
 * Validates payloads against Zod schemas and provides user-safe error messages.
 */
import { z, ZodError, ZodSchema } from "zod";
import { ApiClientError } from "./client";

export class ValidationError extends ApiClientError {
  validationErrors: z.ZodIssue[];

  constructor(message: string, zodError: ZodError, rawPayload: unknown) {
    const errors = zodError.errors || [];
    super({
      message,
      status: 502, // Bad Gateway - server returned invalid data
      code: "VALIDATION_ERROR",
      details: {
        validationErrors: errors,
        rawPayload,
      },
    });
    this.name = "ValidationError";
    this.validationErrors = errors;
  }
}

/**
 * Maps Zod validation errors to user-friendly messages.
 */
function formatValidationError(error: ZodError): string {
  const issues = error.errors || [];

  if (issues.length === 0) {
    return "The server returned invalid data";
  }

  // Get the first few critical errors
  const criticalIssues = issues.slice(0, 3);
  const fieldErrors = criticalIssues.map((issue) => {
    const path = issue.path.join(".");
    const field = path || "response";
    return `${field}: ${issue.message}`;
  });

  const moreCount = issues.length - criticalIssues.length;
  const moreText = moreCount > 0 ? ` (and ${moreCount} more)` : "";

  return `Invalid server response: ${fieldErrors.join(", ")}${moreText}`;
}

/**
 * Logs validation errors for triage.
 */
function logValidationError(
  endpoint: string,
  schema: string,
  error: ZodError,
  payload: unknown
): void {
  // In production, this would send to a monitoring service
  console.error("[API Validation Error]", {
    endpoint,
    schema,
    timestamp: new Date().toISOString(),
    errors: error.errors,
    payload: JSON.stringify(payload, null, 2),
  });

  // Log to external monitoring if available
  if (typeof window !== "undefined" && (window as any).errorMonitor) {
    (window as any).errorMonitor.logValidationError({
      endpoint,
      schema,
      errors: error.errors,
      payload,
    });
  }
}

/**
 * Validates API response data against a Zod schema.
 * Throws ValidationError with user-safe message if validation fails.
 *
 * @param data - The raw API response data
 * @param schema - The Zod schema to validate against
 * @param endpoint - The API endpoint (for logging)
 * @returns The validated and typed data
 */
export function validateApiResponse<T>(
  data: unknown,
  schema: ZodSchema<T>,
  endpoint: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      // Log for triage
      logValidationError(endpoint, schema.constructor.name, error, data);

      // Throw user-safe error
      const userMessage = formatValidationError(error);
      throw new ValidationError(userMessage, error, data);
    }
    throw error;
  }
}

/**
 * Validates API response data with optional fallback.
 * Returns null instead of throwing if validation fails.
 *
 * @param data - The raw API response data
 * @param schema - The Zod schema to validate against
 * @param endpoint - The API endpoint (for logging)
 * @returns The validated data or null if validation fails
 */
export function validateApiResponseSafe<T>(
  data: unknown,
  schema: ZodSchema<T>,
  endpoint: string
): T | null {
  try {
    return validateApiResponse(data, schema, endpoint);
  } catch (error) {
    if (error instanceof ValidationError) {
      return null;
    }
    throw error;
  }
}

/**
 * Type guard to check if an error is a validation error.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
