'use client';

import useSWR from 'swr';
import { fetchBalances } from '@/lib/stellarReads';

export function useAFTBalance(publicKey: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    publicKey ? `balances-${publicKey}` : null,
    () => fetchBalances(publicKey!),
    { refreshInterval: 4000 }
  );

  return {
    aftBalance: data?.aftBalance ?? '0',
    xlmBalance: data?.xlmBalance ?? '0',
    hasTrustline: data?.hasTrustline ?? false,
    aftLimit: data?.aftLimit ?? '0',
    isLoading,
    isError: !!error,
    mutate,
  };
}
