'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  isConnected as freighterIsConnected,
  isAllowed,
  requestAccess,
  getPublicKey,
  getNetworkDetails,
} from '@stellar/freighter-api';

interface FreighterContextType {
  publicKey: string;
  isConnected: boolean;
  network: 'TESTNET' | 'PUBLIC';
  error: string | null;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const FreighterContext = createContext<FreighterContextType>({
  publicKey: '',
  isConnected: false,
  network: 'TESTNET',
  error: null,
  isLoading: false,
  connect: async () => {},
  disconnect: () => {},
});

export const FreighterProvider = ({ children }: { children: React.ReactNode }) => {
  const [publicKey, setPublicKey] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [network, setNetwork] = useState<'TESTNET' | 'PUBLIC'>('TESTNET');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Restore session on mount if user previously connected in AetherFlow
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      if (typeof window === 'undefined') return;
      const wasConnected = localStorage.getItem('aetherflow_connected') === 'true';
      const wasDisconnected = localStorage.getItem('aetherflow_disconnected') === 'true';

      // If user hasn't explicitly connected or explicitly clicked disconnect, don't auto-connect
      if (!wasConnected || wasDisconnected) return;

      try {
        const connResult: any = await freighterIsConnected();
        const installed = connResult?.isConnected ?? !!connResult;
        if (!installed) return;

        const allowResult: any = await isAllowed();
        const allowed = allowResult?.isAllowed ?? !!allowResult;
        if (!allowed) return;

        const pk = await getPublicKey();
        if (pk && mounted) {
          setPublicKey(pk);
          setIsConnected(true);
          try {
            const details = await getNetworkDetails();
            if (mounted) {
              setNetwork(details?.networkPassphrase?.includes('Test SDF') ? 'TESTNET' : 'PUBLIC');
            }
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.debug('[FreighterProvider] session check:', err);
      }
    };

    checkSession();
    return () => { mounted = false; };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const connResult: any = await freighterIsConnected();
      const installed = connResult?.isConnected ?? !!connResult;
      if (!installed) {
        setError('Freighter extension is not installed. Get it at freighter.app');
        return;
      }

      const accessResult = await requestAccess();
      const pk: string = (accessResult as { publicKey?: string })?.publicKey
        ?? (accessResult as unknown as string);

      if (!pk) {
        setError('Connection rejected — please approve in Freighter');
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('aetherflow_connected', 'true');
        localStorage.removeItem('aetherflow_disconnected');
      }

      setPublicKey(pk);
      setIsConnected(true);

      try {
        const details = await getNetworkDetails();
        setNetwork(details?.networkPassphrase?.includes('Test SDF') ? 'TESTNET' : 'PUBLIC');
      } catch { /* fallback */ }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to connect to Freighter');
      console.error('[FreighterProvider] connect error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aetherflow_disconnected', 'true');
      localStorage.removeItem('aetherflow_connected');
    }
    setPublicKey('');
    setIsConnected(false);
    setError(null);
  }, []);

  return (
    <FreighterContext.Provider
      value={{
        publicKey,
        isConnected,
        network,
        error,
        isLoading,
        connect,
        disconnect,
      }}
    >
      {children}
    </FreighterContext.Provider>
  );
};

export const useFreighter = () => useContext(FreighterContext);
