import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SWRProvider } from "./swr-provider";
import { FreighterProvider } from "@/context/FreighterContext";
import { Navbar } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  title: "AetherFlow | Stellar Soroban AMM Protocol",
  description: "A decentralized constant-product liquidity & swap protocol built on Stellar using Soroban Smart Contracts. Instant AFT ↔ XLM swaps and liquidity provision.",
  openGraph: {
    title: "AetherFlow",
    description: "Secure liquidity and token swaps on Stellar Testnet",
    url: "https://aetherflow.pages.dev",
    siteName: "AetherFlow",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AetherFlow",
    description: "Secure liquidity and token swaps on Stellar Testnet",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <ErrorBoundary>
          <SWRProvider>
            <FreighterProvider>
              <Navbar />
              {children}
            </FreighterProvider>
          </SWRProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
