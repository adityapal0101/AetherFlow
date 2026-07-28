'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Wallet, Activity,
  ArrowUpDown, Droplets, BarChart3, Copy, CheckCircle2, RefreshCw, Zap,
} from 'lucide-react';
import { useFreighter } from '@/hooks/useFreighter';
import { floatUp } from '@/lib/animations';

const NAV_LINKS = [
  { href: '/',          label: 'Home',      icon: BarChart3 },
  { href: '/swap',      label: 'Swap',      icon: ArrowUpDown },
  { href: '/pool',      label: 'Pool',      icon: Droplets },
  { href: '/dashboard', label: 'Dashboard', icon: Activity },
];

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, connect, disconnect, publicKey, network, isLoading } = useFreighter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <motion.header
        {...floatUp}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(5, 10, 20, 0.85)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 242, 254, 0.15)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, minWidth: 0 }}>
 
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'white' }}>
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              suppressHydrationWarning
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 15, color: '#030712',
                boxShadow: '0 0 16px rgba(0, 242, 254, 0.4)',
              }}
            >
              <Zap size={18} />
            </motion.div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AetherFlow
            </span>
          </Link>

            {/* Desktop Nav */}
            <nav className="hidden-mobile" style={{ gap: 6, marginLeft: 20, display: 'flex' }}>
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href} href={href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 10, textDecoration: 'none',
                      fontSize: 14, fontWeight: active ? 600 : 400,
                      color: active ? '#00f2fe' : 'rgba(255,255,255,0.6)',
                      background: active ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                      border: active ? '1px solid rgba(0, 242, 254, 0.25)' : '1px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={15} style={{ color: active ? '#00f2fe' : 'inherit' }} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Wallet Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.3)',
              color: '#00f2fe',
            }}>
              {network}
            </div>

            {isConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div 
                  className="hidden-mobile"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(0, 242, 254, 0.2)',
                    padding: '6px 12px', borderRadius: 10, fontSize: 12, fontFamily: 'monospace', color: '#e2e8f0',
                  }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  {publicKey.slice(0, 5)}…{publicKey.slice(-4)}
                  <button
                    onClick={copyKey}
                    title="Copy address"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2, display: 'flex', alignItems: 'center' }}
                  >
                    {copied ? <CheckCircle2 size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                  </button>
                </div>
                <button
                  className="hidden-mobile"
                  onClick={disconnect}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary"
                onClick={connect}
                disabled={isLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', fontSize: 14, minHeight: 38,
                  background: 'linear-gradient(135deg, #00f2fe, #4facfe)', color: '#030712', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer'
                }}
              >
                {isLoading
                  ? <><RefreshCw size={14} style={{ animation: 'spin 0.9s linear infinite' }} /> Connecting…</>
                  : <><Wallet size={16} /> Connect</>
                }
              </motion.button>
            )}

            <button
              onClick={() => setMobileOpen((v) => !v)}
              style={{
                display: 'none', background: 'none', border: '1px solid rgba(0, 242, 254, 0.2)',
                borderRadius: 8, color: 'white', padding: 8, cursor: 'pointer',
                minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center',
              }}
              className="mobile-menu-btn"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            style={{
              position: 'fixed', top: 64, left: 0, right: 0, zIndex: 40,
              background: 'rgba(5, 10, 20, 0.98)', backdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(0, 242, 254, 0.2)', padding: '16px 24px 24px',
            }}
          >
            {NAV_LINKS.map(({ href, label, icon: Icon }, i) => (
              <motion.div key={href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Link
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 4px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none',
                    color: pathname === href ? '#00f2fe' : 'rgba(255,255,255,0.6)',
                    fontWeight: pathname === href ? 600 : 400, fontSize: 16, minHeight: 44,
                  }}
                >
                  <Icon size={18} style={{ color: pathname === href ? '#00f2fe' : 'inherit' }} />
                  {label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
