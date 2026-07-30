'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Link2, RefreshCw, Coins } from 'lucide-react';
import { useTrustline } from '@/hooks/useTrustline';
import { successPop } from '@/lib/animations';
import { useState } from 'react';
import useSWR from 'swr';

export function TrustlineCard({ publicKey }: { publicKey: string }) {
  const { hasTrustline, aftBalance, aftLimit, isLoading, isAdding, addError, addTrustline } =
    useTrustline(publicKey);
  const { isValidating } = useSWR(publicKey ? `balances-${publicKey}` : null);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = async () => {
    try {
      await addTrustline();
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 5000);
    } catch {
      // Handled by hook error state
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <RefreshCw size={16} style={{ color: '#00f2fe', animation: 'spin 0.9s linear infinite' }} />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Checking AFT trustline…</span>
      </div>
    );
  }

  if (!hasTrustline) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ borderColor: 'rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.05)' }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4, fontSize: 14 }}>
              No AFT Trustline
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 16 }}>
              Your wallet has no AFT trustline. Add it to interact with AetherFlow pools.
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              className="btn-primary"
              onClick={handleAdd}
              disabled={isAdding}
              style={{
                minHeight: 44, display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', fontSize: 14,
                background: 'rgba(245,158,11,0.8)',
                boxShadow: '0 0 20px rgba(245,158,11,0.3)',
              }}
            >
              {isAdding
                ? <><RefreshCw size={14} style={{ animation: 'spin 0.9s linear infinite' }} /> Adding…</>
                : <><Link2 size={14} /> Add Trustline</>}
            </motion.button>
            {addError && (
              <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>
                {addError}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {justAdded ? (
        <motion.div
          key="success"
          variants={successPop}
          initial="hidden" animate="visible" exit="exit"
          className="glass-card"
          style={{ borderColor: 'rgba(16,185,129,0.6)', background: 'rgba(16,185,129,0.08)', textAlign: 'center' }}
        >
          <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 700, color: '#10b981', fontSize: 16 }}>Trustline Established!</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
            You can now provide liquidity and swap AFT tokens.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="active"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.05)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CheckCircle2 size={16} style={{ color: '#10b981' }} />
            <span style={{ fontWeight: 600, color: '#10b981', fontSize: 14 }}>
              AFT Trustline active
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
              Limit: {parseFloat(aftLimit).toLocaleString()} AFT
            </span>
            <RefreshCw
              size={12}
              style={{
                color: isValidating ? 'rgba(255,255,255,0.4)' : 'transparent',
                animation: isValidating ? 'spin 0.9s linear infinite' : 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Coins size={16} style={{ color: '#00f2fe' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>AFT Balance</span>
            </div>
            <motion.span
              key={aftBalance}
              initial={{ opacity: 0.4, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 22, fontWeight: 800 }}
            >
              {parseFloat(aftBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              <span style={{ fontSize: 13, color: '#00f2fe', marginLeft: 6 }}>AFT</span>
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
