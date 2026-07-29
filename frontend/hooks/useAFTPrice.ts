'use client';

import useSWR from 'swr';
import { fetchPrice } from '@/lib/stellarReads';

export function useAFTPrice() {
  const { data, error, isLoading } = useSWR('aft-price', fetchPrice, {
    refreshInterval: 5000,
  });

  return {
    price: data?.price ?? '0.050000',
    change24h: data?.change24h ?? '0.00',
    isLoading,
    isError: !!error,
  };
}
