/**
 * lib/safeStellarCall.ts
 *
 * Wraps any async Freighter or Soroban call with:
 *  - Error normalisation (Horizon / Freighter / generic)
 *  - Returns { data, error } instead of throwing
 */

export interface SafeResult<T> {
  data: T | null;
  error: string | null;
}

/** Extract a human-readable message from any Stellar/Freighter error shape. */
function extractMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    const horizonExtras = (err as any)?.response?.data?.extras;
    if (horizonExtras) {
      const codes = (horizonExtras as Record<string, unknown>).result_codes;
      return JSON.stringify(codes);
    }
    return err.message;
  }
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    return (obj.message as string) || (obj.detail as string) || JSON.stringify(obj);
  }
  return String(err);
}

export async function safeStellarCall<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<SafeResult<T>> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    const message = extractMessage(err);
    const label = context ? `[${context}] ${message}` : message;
    console.error(`safeStellarCall error — ${label}`);
    return { data: null, error: message };
  }
}
