export class ChainBridgeError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: unknown;

  constructor(code: string, message: string, opts?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "ChainBridgeError";
    this.code = code;
    this.status = opts?.status;
    this.details = opts?.details;
  }
}

export class NetworkError extends ChainBridgeError {
  constructor(message: string, cause?: unknown) {
    super("NETWORK_ERROR", message, { details: cause });
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends ChainBridgeError {
  constructor(message = "Invalid or missing API key") {
    super("UNAUTHORIZED", message, { status: 401 });
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends ChainBridgeError {
  readonly retryAfterSeconds?: number;

  constructor(message = "Rate limit exceeded", retryAfterSeconds?: number) {
    super("RATE_LIMIT", message, { status: 429 });
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class NotFoundError extends ChainBridgeError {
  constructor(code: string, message: string) {
    super(code, message, { status: 404 });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ChainBridgeError {
  constructor(code: string, message: string) {
    super(code, message, { status: 400 });
    this.name = "ValidationError";
  }
}
