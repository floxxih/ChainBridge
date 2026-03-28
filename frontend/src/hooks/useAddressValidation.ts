/**
 * React hook for address validation with debounced input (#61).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChainType } from "@/types/wallet";
import {
  type ValidationResult,
  detectAddressChain,
  validateAddress,
} from "@/lib/addressValidation";

interface UseAddressValidationOptions {
  /** Chain to validate against. If omitted, chain is auto-detected. */
  chain?: ChainType;
  /** Debounce delay in ms (default 300). */
  debounceMs?: number;
}

interface AddressValidationState {
  /** Current validation result (null when empty or still debouncing). */
  result: ValidationResult | null;
  /** Whether a validation is in-flight (debounce pending). */
  isValidating: boolean;
  /** Validate an address immediately without debounce. */
  validateNow: (address: string) => ValidationResult;
}

export function useAddressValidation(
  address: string,
  options: UseAddressValidationOptions = {}
): AddressValidationState {
  const { chain, debounceMs = 300 } = options;
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validate = useCallback(
    (addr: string): ValidationResult => {
      if (!addr.trim()) {
        return { valid: false, error: "Address is required" };
      }
      return chain ? validateAddress(addr, chain) : detectAddressChain(addr);
    },
    [chain]
  );

  useEffect(() => {
    if (!address.trim()) {
      setResult(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setResult(validate(address));
      setIsValidating(false);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [address, validate, debounceMs]);

  const validateNow = useCallback(
    (addr: string): ValidationResult => {
      const r = validate(addr);
      setResult(r);
      setIsValidating(false);
      return r;
    },
    [validate]
  );

  return { result, isValidating, validateNow };
}
