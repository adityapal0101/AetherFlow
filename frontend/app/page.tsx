'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { useFreighter } from '@/hooks/useFreighter';
import { StatsBar } from '@/components/StatsBar';
import { BottomNav } from '@/components/BottomNav';
import { zeroG, floatUp, stagger } from '@/lib/animations';

const FEATURES = [
  { title: 'Swap Tokens', desc: 'Instantly swap AFT ↔ XLM using the AetherPool liquidity engine.', href: '/swap', cta: 'Start Swapping' },
  { title: 'Provide Liquidity', desc: 'Add AFT + XLM to the liquidity pool and earn APY on your position.', href: '/pool', cta: 'Add Liquidity' },
  { title: 'Yield Router & Dashboard', desc: 'Monitor your AFT balance, trustline status, and live event streams.', href: '/dashboard', cta: 'View Dashboard' },
];

export default function HomePage() {
  const { isConnected, connect, publicKey, network } = useFreighter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <main style={{ minHeight: '100vh', paddingBottom: 100 }}>
      {/* Hero */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,242,254,0.2) 0%, transparent 70%)',
        padding: '72px 24px 56px', textAlign: 'center',
      }}>
        {/* Floating logo mark */}
        <motion.div
          {...zeroG}
          style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 28px',
            background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 26, color: '#030712',
            boxShadow: '0 0 40px rgba(0,242,254,0.4)',
          }}
        >
          <Zap size={36} />
        </motion.div>

        <motion.div {...floatUp}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.3)',
            padding: '5px 14px', borderRadius: 32, marginBottom: 20, fontSize: 12, fontWeight: 600, color: '#00f2fe'
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Live on Stellar {network}
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 6.5vw, 68px)', fontWeight: 900, lineHeight: 1.1,
            background: 'linear-gradient(135deg, #ffffff 30%, #00f2fe 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 18,
          }}>
            AetherFlow
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2.2vw, 18px)', color: 'rgba(255,255,255,0.6)',
            maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.6
          }}>
            A next-generation constant-product AMM & liquidity router on Stellar Testnet. Swap AFT, provision capital, and watch live contract events — 100% on-chain via Soroban.
          </p>

          {isConnected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 12, padding: '9px 18px', fontFamily: 'monospace', fontSize: 13, color: '#10b981',
              }}>
                {publicKey.slice(0, 6)}…{publicKey.slice(-6)}
              </div>
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, background: 'linear-gradient(135deg, #00f2fe, #4facfe)', color: '#030712', fontWeight: 700, borderRadius: 10, border: 'none' }}>
                  Open Dashboard <ArrowRight size={16} />
                </button>
              </Link>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="btn-primary"
              onClick={connect}
              style={{ fontSize: 16, padding: '14px 32px', minHeight: 48, background: 'linear-gradient(135deg, #00f2fe, #4facfe)', color: '#030712', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer' }}
            >
              Connect Freighter Wallet
            </motion.button>
          )}
        </motion.div>
      </section>

      {/* Live Stats */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 0' }}>
        <StatsBar />
      </div>

      {/* Feature cards */}
      <div className="grid-layout">
        {FEATURES.map(({ title, desc, href, cta }, i) => (
          <motion.div key={href} {...stagger(i)} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>{title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, flex: 1 }}>{desc}</p>
            <Link href={href}>
              <button className="btn-primary" style={{ width: '100%', minHeight: 44, background: 'linear-gradient(135deg, #00f2fe, #4facfe)', color: '#030712', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer' }}>{cta}</button>
            </Link>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
