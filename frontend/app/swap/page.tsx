'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Loader2, ChevronDown, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useFreighter } from '@/hooks/useFreighter';
import { useAFTBalance } from '@/hooks/useAFTBalance';
import { useAFTPrice } from '@/hooks/useAFTPrice';
import { displayQuote } from '@/lib/amm';
import { POOL_CONTRACT, TOKEN_CONTRACT, XLM_CONTRACT, SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from '@/lib/config';
import { BottomNav } from '@/components/BottomNav';

type TokenDir = 'AFT_TO_XLM' | 'XLM_TO_AFT';

export default function SwapPage() {
  const { isConnected, connect, publicKey } = useFreighter();
  const { aftBalance, xlmBalance, hasTrustline, mutate } = useAFTBalance(publicKey);
  const { price } = useAFTPrice();
  const [dir, setDir] = useState<TokenDir>('AFT_TO_XLM');
  const [amountIn, setAmountIn] = useState('');
  const [slippage] = useState('0.5');
  const [isSwapping, setIsSwapping] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const flip = () => setDir((d) => (d === 'AFT_TO_XLM' ? 'XLM_TO_AFT' : 'AFT_TO_XLM'));
  const fromToken = dir === 'AFT_TO_XLM' ? 'AFT' : 'XLM';
  const toToken = dir === 'AFT_TO_XLM' ? 'XLM' : 'AFT';
  const fromBalance = dir === 'AFT_TO_XLM' ? aftBalance : xlmBalance;
  const priceVal = parseFloat(price) || 0.05;
  const amountOut = displayQuote(priceVal, amountIn, dir);

  const doSwap = async () => {
    setError('');
    // 1. Wallet not connected check
    if (!isConnected || !publicKey) return connect();

    // 2. Trustline pre-flight check
    if (!hasTrustline) {
      setError('AFT Trustline missing. Please add the AFT trustline on your Dashboard first.');
      return;
    }

    // 3. Invalid amount check
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setError('Enter an amount to swap');
      return;
    }

    // 4. Insufficient balance check
    if (parseFloat(amountIn) > parseFloat(fromBalance)) {
      setError(`Insufficient ${fromToken} balance`);
      return;
    }

    setIsSwapping(true);
    setTxHash('');

    try {
      const { Contract, nativeToScVal, Address, TransactionBuilder, Horizon, SorobanRpc } = await import('@stellar/stellar-sdk');
      const { signTransaction } = await import('@stellar/freighter-api');

      const rpcUrl = SOROBAN_RPC_URL;
      const networkPassphrase = NETWORK_PASSPHRASE;
      const poolContractId = POOL_CONTRACT;
      const aftTokenId = TOKEN_CONTRACT;
      const xlmTokenId = XLM_CONTRACT;

      const server = new SorobanRpc.Server(rpcUrl, { allowHttp: true });
      const contract = new Contract(poolContractId);
      const tokenInId = dir === 'AFT_TO_XLM' ? aftTokenId : xlmTokenId;

      const amountInStroops = Math.floor(parseFloat(amountIn) * 1e7);
      
      const swapOp = contract.call('execute_swap',
        new Address(publicKey).toScVal(), // sender
        new Address(tokenInId).toScVal(), // token_in
        nativeToScVal(amountInStroops, { type: 'i128' }), // amount_in
        nativeToScVal(1, { type: 'i128' }) // min_amount_out
      );

      const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await horizon.loadAccount(publicKey);
      
      let tx = new TransactionBuilder(account, {
        fee: '10000',
        networkPassphrase,
      })
      .addOperation(swapOp)
      .setTimeout(180)
      .build();

      tx = await server.prepareTransaction(tx);

      const signedXDR = await signTransaction(tx.toXDR(), {
        networkPassphrase,
      });

      if (!signedXDR) throw new Error('Transaction rejected in wallet');

      const signedTx = TransactionBuilder.fromXDR(signedXDR, networkPassphrase);
      const response = await server.sendTransaction(signedTx);
      
      if (response.status === 'ERROR') {
        throw new Error('Transaction submission failed.');
      }

      setTxHash(response.hash);
      
      await new Promise(r => setTimeout(r, 4000));
      await mutate();
    } catch (e: any) {
      console.error("Swap error:", e);
      const rawMsg = e?.message || String(e) || '';
      if (rawMsg.includes('trustline entry is missing') || rawMsg.includes('Error(Contract, #13)')) {
        setError('AFT Trustline missing. Please add the AFT trustline on your Dashboard first.');
      } else if (rawMsg.includes('rejected in wallet') || rawMsg.includes('User rejected')) {
        setError('Transaction rejected in wallet');
      } else {
        setError(rawMsg || 'Swap failed. Try again.');
      }
    } finally {
      setIsSwapping(false);
      setAmountIn('');
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px 100px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0' }}>Swap Tokens</h1>
          </div>

          {/* Trustline Warning Banner */}
          {isConnected && !hasTrustline && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: 20, padding: 14, borderRadius: 14,
                background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex', alignItems: 'center', gap: 12, color: '#f59e0b', fontSize: 13,
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong>No AFT Trustline:</strong> You must add the AFT trustline to swap.
              </div>
              <Link
                href="/dashboard"
                style={{
                  background: '#f59e0b', color: '#030712', textDecoration: 'none',
                  padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                Add Trustline
              </Link>
            </motion.div>
          )}

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* From */}
            <div style={{ padding: 20, borderBottom: '1px solid rgba(0, 242, 254, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>From</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  Bal: {parseFloat(fromBalance).toFixed(4)} {fromToken}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 32, fontWeight: 700, color: 'white', width: '100%',
                  }}
                />
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.3)',
                  padding: '8px 14px', borderRadius: 10, whiteSpace: 'nowrap', color: '#00f2fe'
                }}>
                  <span style={{ fontWeight: 600 }}>{fromToken}</span>
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Flip */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
              <motion.button
                whileTap={{ rotate: 180 }}
                onClick={flip}
                style={{
                  background: 'rgba(0, 242, 254, 0.15)', border: '1px solid rgba(0, 242, 254, 0.3)',
                  borderRadius: '50%', padding: 10, cursor: 'pointer', color: '#00f2fe',
                  minHeight: 44, minWidth: 44,
                }}
              >
                <ArrowLeftRight size={18} />
              </motion.button>
            </div>

            {/* To */}
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>To (estimated)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 1, fontSize: 32, fontWeight: 700, color: amountOut ? 'white' : 'rgba(255,255,255,0.3)' }}>
                  {amountOut || '0.00'}
                </span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.3)',
                  padding: '8px 14px', borderRadius: 10, color: '#00f2fe'
                }}>
                  <span style={{ fontWeight: 600 }}>{toToken}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Row */}
          {amountIn && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: 12, fontSize: 13 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Rate</span>
                <span>1 {fromToken} = {dir === 'AFT_TO_XLM' ? priceVal.toFixed(6) : (1 / priceVal).toFixed(6)} {toToken}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Slippage</span>
                <span style={{ color: '#f59e0b' }}>{slippage}%</span>
              </div>
            </motion.div>
          )}

          <button
            className="btn-primary"
            onClick={doSwap}
            disabled={isSwapping}
            style={{ width: '100%', marginTop: 16, fontSize: 16, minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #00f2fe, #4facfe)', color: '#030712', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer' }}
          >
            {isSwapping ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Swapping…</> : isConnected ? 'Execute Swap' : 'Connect Wallet'}
          </button>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  marginTop: 12, padding: 14, borderRadius: 12,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  fontSize: 13, color: '#ef4444', textAlign: 'center',
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {txHash && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  marginTop: 12, padding: 12, borderRadius: 12,
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                  fontSize: 13, color: '#10b981', textAlign: 'center',
                }}
              >
                ✓ Swap complete — tx: {txHash.slice(0, 16)}…
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <BottomNav />
    </main>
  );
}
