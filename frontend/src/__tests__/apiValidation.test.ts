/**
 * Tests for API response validation.
 */
import { z } from "zod";
import {
  validateApiResponse,
  validateApiResponseSafe,
  isValidationError,
  ValidationError,
} from "@/lib/api/validation";
import {
  ApiOrderRecordSchema,
  ApiHTLCRecordSchema,
  AdminStatsSchema,
} from "@/lib/api/schemas";

describe("API Validation", () => {
  describe("validateApiResponse", () => {
    it("should validate correct order data", () => {
      const validOrder = {
        id: "order-123",
        onchain_id: 456,
        creator: "0xabc",
        from_chain: "ethereum",
        to_chain: "bitcoin",
        from_asset: "ETH",
        to_asset: "BTC",
        from_amount: 1.5,
        to_amount: 0.05,
        min_fill_amount: null,
        filled_amount: 0,
        expiry: 1234567890,
        status: "open",
        counterparty: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      const result = validateApiResponse(validOrder, ApiOrderRecordSchema, "/orders");
      expect(result).toEqual(validOrder);
    });

    it("should throw ValidationError for invalid data", () => {
      const invalidOrder = {
        id: "order-123",
        // missing required fields
      };

      expect(() => {
        validateApiResponse(invalidOrder, ApiOrderRecordSchema, "/orders");
      }).toThrow(ValidationError);
    });

    it("should throw ValidationError with user-safe message", () => {
      const invalidOrder = {
        id: 123, // should be string
        creator: "0xabc",
        from_chain: "ethereum",
        to_chain: "bitcoin",
        from_asset: "ETH",
        to_asset: "BTC",
        from_amount: "not-a-number", // should be number
        to_amount: 0.05,
        min_fill_amount: null,
        filled_amount: 0,
        expiry: 1234567890,
        status: "open",
        counterparty: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      try {
        validateApiResponse(invalidOrder, ApiOrderRecordSchema, "/orders");
        fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toMatch(/Invalid server response|The server returned invalid data/);
        expect((error as ValidationError).status).toBe(502);
        expect((error as ValidationError).code).toBe("VALIDATION_ERROR");
      }
    });

    it("should validate HTLC data with nested objects", () => {
      const validHTLC = {
        id: "htlc-123",
        onchain_id: "0x456",
        sender: "0xabc",
        receiver: "0xdef",
        amount: 100,
        hash_lock: "0x123",
        time_lock: 1234567890,
        status: "active",
        secret: null,
        hash_algorithm: "sha256",
        created_at: "2024-01-01T00:00:00Z",
        seconds_remaining: 3600,
        can_claim: false,
        can_refund: false,
        phase: "locked",
        timeline: [
          { label: "Created", timestamp: "2024-01-01T00:00:00Z", completed: true },
          { label: "Claimed", timestamp: null, completed: false },
        ],
      };

      const result = validateApiResponse(validHTLC, ApiHTLCRecordSchema, "/htlcs");
      expect(result).toEqual(validHTLC);
    });

    it("should validate admin stats with nested objects", () => {
      const validStats = {
        htlcs: { total: 100, active: 10, claimed: 80, refunded: 10 },
        orders: { total: 200, open: 50, matched: 100, cancelled: 50 },
        swaps: { total: 150, executed: 140 },
        disputes: { total: 5, open: 2, resolved: 3 },
        volume: { total: 1000000, last_24h: 50000 },
        users: { unique_creators: 500, active_api_keys: 300 },
      };

      const result = validateApiResponse(validStats, AdminStatsSchema, "/admin/stats");
      expect(result).toEqual(validStats);
    });
  });

  describe("validateApiResponseSafe", () => {
    it("should return validated data for valid input", () => {
      const validOrder = {
        id: "order-123",
        onchain_id: 456,
        creator: "0xabc",
        from_chain: "ethereum",
        to_chain: "bitcoin",
        from_asset: "ETH",
        to_asset: "BTC",
        from_amount: 1.5,
        to_amount: 0.05,
        min_fill_amount: null,
        filled_amount: 0,
        expiry: 1234567890,
        status: "open",
        counterparty: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      const result = validateApiResponseSafe(validOrder, ApiOrderRecordSchema, "/orders");
      expect(result).toEqual(validOrder);
    });

    it("should return null for invalid data instead of throwing", () => {
      const invalidOrder = {
        id: "order-123",
        // missing required fields
      };

      const result = validateApiResponseSafe(invalidOrder, ApiOrderRecordSchema, "/orders");
      expect(result).toBeNull();
    });
  });

  describe("isValidationError", () => {
    it("should return true for ValidationError", () => {
      const schema = z.object({ id: z.string() });
      try {
        validateApiResponse({ id: 123 }, schema, "/test");
      } catch (error) {
        expect(isValidationError(error)).toBe(true);
      }
    });

    it("should return false for other errors", () => {
      const error = new Error("Regular error");
      expect(isValidationError(error)).toBe(false);
    });

    it("should return false for non-error values", () => {
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);
      expect(isValidationError("string")).toBe(false);
      expect(isValidationError({})).toBe(false);
    });
  });

  describe("ValidationError", () => {
    it("should include validation details", () => {
      const schema = z.object({
        id: z.string(),
        amount: z.number(),
      });

      try {
        validateApiResponse({ id: 123, amount: "not-a-number" }, schema, "/test");
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.validationErrors).toBeDefined();
        expect(Array.isArray(validationError.validationErrors)).toBe(true);
        expect(validationError.details).toBeDefined();
      }
    });
  });
});
