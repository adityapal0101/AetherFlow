'use client';
import { motion } from 'framer-motion';
import { Activity, Wallet, ArrowUpRight, Loader2 } from 'lucide-react';
import { useFreighter } from '@/hooks/useFreighter';
import { useAFTBalance } from '@/hooks/useAFTBalance';
import { useContractEvents, ContractEvent } from '@/hooks/useContractEvents';
import { TrustlineCard } from '@/components/TrustlineCard';
import { BottomNav } from '@/components/BottomNav';

const EVENT_COLORS: Record<ContractEvent['type'], string> = {
  mint: '#10b981',
  burn: '#ef4444',
  swap: '#00f2fe',
  liquidity: '#3b82f6',
  trustline: '#f59e0b',
  fee: '#ec4899',
};

const EventRow = ({ event }: { event: ContractEvent }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}
  >
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: `${EVENT_COLORS[event.type]}20`,
      border: `1px solid ${EVENT_COLORS[event.type]}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: EVENT_COLORS[event.type], textTransform: 'uppercase' }}>
        {event.type.slice(0, 3)}
      </span>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: 14 }}>{event.type}</span>
        <span style={{
          background: `${EVENT_COLORS[event.type]}20`, color: EVENT_COLORS[event.type],
          padding: '2px 8px', borderRadius: 20, fontSize: 11,
        }}>
          {parseFloat(event.amount || '0').toLocaleString(undefined, { maximumFractionDigits: 4 })} AFT
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {event.from ? `${event.from.slice(0, 8)}…${event.from.slice(-4)}` : '—'}
      </div>
    </div>
    <a
      href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
      target="_blank" rel="noopener noreferrer"
      style={{ color: 'rgba(255,255,255,0.3)', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <ArrowUpRight size={14} />
    </a>
  </motion.div>
);

export default function DashboardPage() {
  const { isConnected, connect, publicKey, network } = useFreighter();
  const { aftBalance, xlmBalance, isLoading: balLoading } = useAFTBalance(publicKey);
  const { events, isLoading: eventsLoading } = useContractEvents(publicKey);

  if (!isConnected) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <Wallet size={48} style={{ color: '#00f2fe' }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>Connect Your Wallet</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 320 }}>
          Connect your Freighter wallet to view your AetherFlow dashboard.
        </p>
        <button className="btn-primary" onClick={connect} style={{ minHeight: 48, padding: '14px 32px', fontSize: 16, background: 'linear-gradient(135deg, #00f2fe, #4facfe)', color: '#030712', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
          Connect Freighter
        </button>
        <BottomNav />
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '40px 16px 100px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, color: '#e2e8f0' }}>AetherFlow Dashboard</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                {publicKey.slice(0, 8)}…{publicKey.slice(-8)} · {network}
              </span>
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid-layout" style={{ padding: 0, marginBottom: 24 }}>
            <div className="glass-card">
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 }}>AFT Balance</p>
              {balLoading ? (
                <Loader2 size={20} style={{ color: '#00f2fe', animation: 'spin 1s linear infinite' }} />
              ) : (
                <p style={{ fontSize: 32, fontWeight: 800 }}>
                  {parseFloat(aftBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  <span style={{ fontSize: 16, color: '#00f2fe', marginLeft: 8 }}>AFT</span>
                </p>
              )}
            </div>
            <div className="glass-card">
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 }}>XLM Balance</p>
              {balLoading ? (
                <Loader2 size={20} style={{ color: '#00f2fe', animation: 'spin 1s linear infinite' }} />
              ) : (
                <p style={{ fontSize: 32, fontWeight: 800 }}>
                  {parseFloat(xlmBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  <span style={{ fontSize: 16, color: '#94a3b8', marginLeft: 8 }}>XLM</span>
                </p>
              )}
            </div>
            <div className="glass-card" style={{ gridColumn: 'span 1' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 }}>Network Status</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{network}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Stellar Testnet Connected</p>
            </div>
          </div>

          {/* Trustline Card */}
          <div style={{ marginBottom: 24 }}>
            <TrustlineCard publicKey={publicKey} />
          </div>

          {/* Live Events Feed */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid rgba(0, 242, 254, 0.15)' }}>
              <Activity size={16} style={{ color: '#00f2fe' }} />
              <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Live Soroban Event Stream</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', marginLeft: 'auto', animation: 'pulse 2s infinite' }} />
            </div>
            {eventsLoading ? (
              <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
                <Loader2 size={24} style={{ color: '#00f2fe', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : events.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                No recent contract events detected
              </div>
            ) : (
              events.slice(0, 15).map((e) => <EventRow key={e.id} event={e} />)
            )}
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </main>
  );
}
