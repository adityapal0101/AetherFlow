'use client';

interface SkeletonCardProps {
  rows?: number;
}

interface SkeletonTextProps {
  lines?: number;
  width?: string;
}

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 8,
};

export function SkeletonCard({ rows = 2 }: SkeletonCardProps) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Icon + label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...shimmer, height: 12, width: '40%' }} />
        <div style={{ ...shimmer, height: 36, width: 36, borderRadius: 10 }} />
      </div>
      {/* Value */}
      <div style={{ ...shimmer, height: 32, width: '60%' }} />
      {/* Sub */}
      {rows > 1 && <div style={{ ...shimmer, height: 10, width: '35%' }} />}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonText({ lines = 3, width = '100%' }: SkeletonTextProps) {
  const widths = ['100%', '80%', '65%', '90%', '50%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            ...shimmer,
            height: 12,
            width: widths[i % widths.length],
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}
