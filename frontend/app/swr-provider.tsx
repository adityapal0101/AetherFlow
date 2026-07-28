'use client';
import { SWRConfig } from 'swr';

export const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) =>
          fetch(url).then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
            return res.json();
          }),
        refreshInterval: 5000,
        revalidateOnFocus: true,
        onError: (error: Error, key: string) => {
          console.error(`[SWR] ${key}:`, error.message);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
};
