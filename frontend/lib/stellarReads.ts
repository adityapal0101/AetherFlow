'use client';
/**
 * lib/stellarReads.ts
 *
 * Client-side chain reads for AetherFlow (public RPC + Horizon).
 */
import {
  SorobanRpc,
  Contract,
  Account,
  TransactionBuilder,
  Networks,
  scValToNative,
} from '@stellar/stellar-sdk';
import { POOL_CONTRACT, AFT_ISSUER, SOROBAN_RPC_URL, HORIZON_URL } from './config';

const RPC = SOROBAN_RPC_URL;
const HORIZON = HORIZON_URL;
const POOL = POOL_CONTRACT;
const ISSUER = AFT_ISSUER;

const DUMMY_SOURCE = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const XLM_PRICE_USD = 0.12;
const AFT_PRICE_USD = 0.05;

/** Read (aft_reserve, xlm_reserve) in raw stroops via get_reserves simulation. */
async function getReservesRaw(): Promise<[string, string]> {
  if (!POOL) return ['0', '0'];
  const server = new SorobanRpc.Server(RPC);
  const contract = new Contract(POOL);
  const tx = new TransactionBuilder(new Account(DUMMY_SOURCE, '0'), {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call('get_reserves'))
    .setTimeout(0)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationSuccess(sim) && sim.result) {
    const native = scValToNative(sim.result.retval);
    if (Array.isArray(native) && native.length >= 2) {
      return [native[0].toString(), native[1].toString()];
    }
  }
  return ['0', '0'];
}

export async function fetchPrice() {
  try {
    const [aft, xlm] = await getReservesRaw();
    const ra = Number(aft);
    const rb = Number(xlm);
    const price = ra > 0 ? rb / ra : 0.05;
    return { price: price.toFixed(6), change24h: '0.00' };
  } catch {
    return { price: '0.050000', change24h: '0.00' };
  }
}

export async function fetchPoolStats() {
  try {
    const [aftReserve, xlmReserve] = await getReservesRaw();
    const xlmNum = Number(xlmReserve) / 1e7;
    const aftNum = Number(aftReserve) / 1e7;
    const tvl = (xlmNum * XLM_PRICE_USD + aftNum * AFT_PRICE_USD).toFixed(2);
    return { tvl, xlmReserve, aftReserve, volume24h: '0', apy: '12.5' };
  } catch {
    return { tvl: '0', xlmReserve: '0', aftReserve: '0', volume24h: '0', apy: '12.5' };
  }
}

export async function fetchEvents(publicKey?: string) {
  try {
    if (!POOL) return { events: [] };
    const server = new SorobanRpc.Server(RPC);
    const info = await server.getLatestLedger();
    const startLedger = Math.max(1, info.sequence - 8000);
    const res = await server.getEvents({
      startLedger,
      filters: [{ type: 'contract', contractIds: [POOL] }],
    });

    let events = (res.events || [])
      .map((ev) => {
        const topic = ev.topic.map((t) => scValToNative(t));
        const native = scValToNative(ev.value);
        const topicName = topic[0];
        let rawAmount: number;
        if (Array.isArray(native)) {
          rawAmount = Number(native[0]) / 1e7;
        } else if (typeof native === 'bigint' || typeof native === 'number') {
          rawAmount = Number(native) / 1e7;
        } else {
          rawAmount = 0;
        }
        const firstAmount = rawAmount.toString();
        let type = 'liquidity';
        if (topicName === 'swap') type = 'swap';
        else if (topicName === 'deposit') type = 'liquidity';
        else if (topicName === 'withdraw') type = 'liquidity';
        const fromAddress = (topic[1] as string) || 'Unknown';
        return {
          id: ev.id,
          type,
          from: fromAddress,
          amount: firstAmount,
          txHash: (ev as any).txHash || (ev as any).transactionHash || '',
          ledger: ev.ledger,
          timestamp: ev.ledgerClosedAt || new Date().toISOString(),
        };
      })
      .reverse();

    if (publicKey) {
      events = events.filter((e) => e.from === publicKey);
    }

    return { events };
  } catch {
    return { events: [] };
  }
}

export async function fetchBalances(publicKey: string) {
  const empty = { aftBalance: '0', xlmBalance: '0', hasTrustline: false, aftLimit: '0' };
  try {
    const res = await fetch(`${HORIZON}/accounts/${publicKey}`);
    if (!res.ok) return empty;
    const account = await res.json();
    const balances: any[] = account.balances || [];
    const xlmEntry = balances.find((b) => b.asset_type === 'native');
    const aftEntry = balances.find((b) => b.asset_code === 'AFT' && b.asset_issuer === ISSUER);
    return {
      aftBalance: aftEntry?.balance ?? '0',
      xlmBalance: xlmEntry?.balance ?? '0',
      hasTrustline: !!aftEntry,
      aftLimit: aftEntry?.limit ?? '0',
    };
  } catch {
    return empty;
  }
}
