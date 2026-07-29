'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { signTransaction } from '@stellar/freighter-api';
import { fetchBalances } from '@/lib/stellarReads';
import { HORIZON_URL, NETWORK_PASSPHRASE, AFT_ISSUER } from '@/lib/config';

export const useTrustline = (publicKey: string) => {
  const { data, mutate, isLoading } = useSWR(
    publicKey ? ['balances', publicKey] : null,
    ([, pk]: [string, string]) => fetchBalances(pk),
    { refreshInterval: 5000 }
  );

  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const addTrustline = async () => {
    if (!publicKey) return;
    setIsAdding(true);
    setAddError(null);

    try {
      const { Horizon, TransactionBuilder, Operation, Asset } = await import('@stellar/stellar-sdk');
      const server = new Horizon.Server(HORIZON_URL);
      const account = await server.loadAccount(publicKey);

      const aftAsset = new Asset('AFT', AFT_ISSUER);
      const tx = new TransactionBuilder(account, {
        fee: '10000',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.changeTrust({
            asset: aftAsset,
            limit: '1000000',
          })
        )
        .setTimeout(180)
        .build();

      const signedXDR = await signTransaction(tx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      if (!signedXDR) throw new Error('Freighter did not return a signed transaction');

      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      const response = await server.submitTransaction(signedTx);

      await mutate();
      return (response as unknown as { hash: string }).hash;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAddError(msg);
      console.error('[useTrustline] addTrustline failed:', msg, err);
      throw err;
    } finally {
      setIsAdding(false);
    }
  };

  return {
    hasTrustline: data?.hasTrustline || false,
    aftBalance: data?.aftBalance || '0',
    aftLimit: data?.aftLimit || '0',
    isLoading,
    isAdding,
    addError,
    addTrustline,
  };
};
