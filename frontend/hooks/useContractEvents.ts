'use client';
import useSWR from 'swr';
import { fetchEvents } from '@/lib/stellarReads';

export interface ContractEvent {
  id: string;
  type: 'mint' | 'burn' | 'swap' | 'liquidity' | 'trustline' | 'fee';
  from: string;
  to?: string;
  amount: string;
  txHash: string;
  ledger: number;
  timestamp: string;
}

export const useContractEvents = (publicKey?: string) => {
  const { data, error, isLoading } = useSWR(
    publicKey ? ['contract-events', publicKey] : 'contract-events',
    () => fetchEvents(publicKey),
    {
      refreshInterval: 5000,
    }
  );

  return {
    events: (data?.events as ContractEvent[]) || [],
    isLoading,
    isError: error,
  };
};
