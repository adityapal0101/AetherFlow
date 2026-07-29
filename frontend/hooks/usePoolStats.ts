'use client';
import useSWR from 'swr';
import { fetchPoolStats } from '@/lib/stellarReads';

export const usePoolStats = () => {
  const { data, isLoading, mutate } = useSWR('pool-stats', fetchPoolStats, { refreshInterval: 10000 });

  return {
    tvl: data?.tvl || '0',
    volume24h: data?.volume24h || '0',
    apy: data?.apy || '0',
    xlmReserve: data?.xlmReserve || '0',
    aftReserve: data?.aftReserve || '0',
    isLoading,
    mutate,
  };
};
