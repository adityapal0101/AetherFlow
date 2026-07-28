'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ArrowLeftRight, Droplets, LayoutDashboard } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/swap', label: 'Swap', icon: ArrowLeftRight },
  { href: '/pool', label: 'Pool', icon: Droplets },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export const BottomNav = () => {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`nav-item ${pathname === href ? 'active' : ''}`}
          style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
        >
          <Icon size={22} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
};
