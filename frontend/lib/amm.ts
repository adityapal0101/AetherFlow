/**
 * lib/amm.ts
 *
 * Pure AMM calculations matching AetherPool constant product math ($x \cdot y = k$).
 */

/**
 * Constant-product swap output in stroops:
 *   k = reserveIn * reserveOut
 *   amountOut = reserveOut - k / (reserveIn + amountIn)
 */
export function swapOutputStroops(
  reserveIn: bigint,
  reserveOut: bigint,
  amountIn: bigint
): bigint {
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) return 0n;
  const k = reserveIn * reserveOut;
  const newReserveIn = reserveIn + amountIn;
  const newReserveOut = k / newReserveIn;
  return reserveOut - newReserveOut;
}

/**
 * Display-side estimated output using current spot price.
 */
export function displayQuote(
  price: number,
  amountIn: string,
  dir: 'AFT_TO_XLM' | 'XLM_TO_AFT'
): string {
  const n = parseFloat(amountIn);
  if (!amountIn || isNaN(n) || n <= 0 || price <= 0) return '';
  const out = dir === 'AFT_TO_XLM' ? n * price : n / price;
  return out.toFixed(6);
}
