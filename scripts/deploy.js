/**
 * scripts/deploy.js
 *
 * AetherFlow deployment script.
 * Covers: fund → deploy → initialize → mint → provision_liquidity → save record.
 *
 * Usage:
 *   STELLAR_ISSUER_SECRET=S... STELLAR_DISTRIBUTOR_SECRET=S... node scripts/deploy.js
 */

'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const https = require('https');
const { Keypair } = require('@stellar/stellar-sdk');

const ISSUER_SECRET      = process.env.STELLAR_ISSUER_SECRET;
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;
const RPC_URL   = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const HORIZON   = process.env.HORIZON_URL     || 'https://horizon-testnet.stellar.org';
const NETWORK   = 'testnet';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

if (!ISSUER_SECRET || !DISTRIBUTOR_SECRET) {
  console.error('\n[ERROR] Set STELLAR_ISSUER_SECRET and STELLAR_DISTRIBUTOR_SECRET\n');
  process.exit(1);
}

const issuerKp      = Keypair.fromSecret(ISSUER_SECRET);
const distributorKp = Keypair.fromSecret(DISTRIBUTOR_SECRET);
const ISSUER_PUB      = issuerKp.publicKey();
const DISTRIBUTOR_PUB = distributorKp.publicKey();

const WASM_DIR    = path.join(__dirname, '..', 'contracts', 'target', 'wasm32-unknown-unknown', 'release');
const DEPLOY_DIR  = path.join(__dirname, '..', 'deployments');
const DEPLOY_FILE = path.join(DEPLOY_DIR, 'testnet.json');

if (!fs.existsSync(DEPLOY_DIR)) fs.mkdirSync(DEPLOY_DIR, { recursive: true });

const log  = (msg) => console.log(`\n  ${msg}`);
const ok   = (msg) => console.log(`  ✓  ${msg}`);
const fail = (msg) => { console.error(`  ✗  ${msg}`); process.exit(1); };

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
  } catch (e) {
    throw new Error(e.stderr || e.message);
  }
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(body); }
      });
    }).on('error', reject);
  });
}

async function getXlmBalance(pubKey) {
  try {
    const acc = await httpGet(`${HORIZON}/accounts/${pubKey}`);
    const native = (acc.balances || []).find((b) => b.asset_type === 'native');
    return parseFloat(native?.balance || '0');
  } catch {
    return 0;
  }
}

function soroban(subCmd) {
  const cmd = `stellar ${subCmd}`;
  return run(cmd, {
    env: {
      ...process.env,
      STELLAR_NETWORK: NETWORK,
      STELLAR_RPC_URL: RPC_URL,
      STELLAR_NETWORK_PASSPHRASE: NETWORK_PASSPHRASE,
    }
  });
}

function deployWasm(wasmPath, sourceSecret) {
  return soroban(
    `contract deploy --wasm ${wasmPath} --source ${sourceSecret} --fee 10000`
  );
}

function invoke(contractId, sourceSecret, fn, args = '') {
  return soroban(
    `contract invoke --id ${contractId} --source ${sourceSecret} --fee 10000 -- ${fn} ${args}`
  );
}

async function step1_fund() {
  console.log('\n═══ STEP 1 — Fund accounts via Friendbot ═══');

  for (const [label, pubKey] of [['Issuer', ISSUER_PUB], ['Distributor', DISTRIBUTOR_PUB]]) {
    const bal = await getXlmBalance(pubKey);
    if (bal >= 10) {
      ok(`${label} (${pubKey.slice(0,6)}…) already has ${bal.toFixed(2)} XLM — skipping`);
      continue;
    }
    log(`Funding ${label} via Friendbot…`);
    try {
      const res = await httpGet(`https://friendbot.stellar.org?addr=${pubKey}`);
      if (res.hash) {
        ok(`${label} funded — tx: ${res.hash}`);
      } else {
        ok(`${label} funded`);
      }
    } catch (e) {
      fail(`Friendbot failed for ${label}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function step2_mint_classic() {
  console.log('\n═══ STEP 2 — Mint Classic AFT ═══');
  log('Running setup-trustlines.js to mint classic AFT to Distributor…');
  try {
    const output = run('node scripts/setup-trustlines.js');
    console.log(output);
    ok('Classic AFT Minted successfully.');
  } catch (e) {
    fail(`Classic mint failed: ${e.message}`);
  }
}

function step3_deploy() {
  console.log('\n═══ STEP 3 — Deploy Soroban contracts ═══');

  log(`Deploying SAC Wrapper for AFT:${ISSUER_PUB}…`);
  let aftId;
  try {
    aftId = soroban(`contract asset deploy --asset AFT:${ISSUER_PUB} --source-account ${ISSUER_SECRET}`);
    ok(`AFT SAC deployed → ${aftId}`);
  } catch (e) {
    if (e.message.includes('ExistingValue')) {
      aftId = soroban(`contract id asset --asset AFT:${ISSUER_PUB}`).trim();
      ok(`AFT SAC already exists → ${aftId}`);
    } else {
      fail(`SAC deploy failed: ${e.message}`);
    }
  }

  const contracts = [
    { name: 'AetherPool',   wasm: path.join(WASM_DIR, 'aether_pool.optimized.wasm') },
    { name: 'AetherRouter', wasm: path.join(WASM_DIR, 'aether_router.optimized.wasm') },
  ];

  const ids = { 'AFT Token': aftId };
  for (const { name, wasm } of contracts) {
    if (!fs.existsSync(wasm)) {
      fail(`WASM not found: ${wasm}\nRun: make build-contracts`);
    }
    log(`Deploying ${name} from ${path.basename(wasm)}…`);
    try {
      const contractId = deployWasm(wasm, ISSUER_SECRET);
      ok(`${name} → ${contractId}`);
      ids[name] = contractId;
    } catch (e) {
      fail(`Deploy failed for ${name}: ${e.message}`);
    }
  }

  return {
    aftId:    ids['AFT Token'],
    poolId:   ids['AetherPool'],
    routerId: ids['AetherRouter'],
  };
}

function step4_initialize(aftId, poolId, routerId) {
  console.log('\n═══ STEP 4 — Initialize contracts ═══');
  const hashes = {};

  hashes.aftInit = 'SAC wrappers do not require initialization';
  ok('AFT SAC ready.');

  log('Initializing AetherPool…');
  try {
    const XLM_CONTRACT_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'; // native testnet XLM SAC
    hashes.poolInit = invoke(poolId, ISSUER_SECRET, 'initialize',
      `--token_a ${aftId} --token_b ${XLM_CONTRACT_ID}`
    );
    ok(`Pool initialized — ${hashes.poolInit}`);
  } catch (e) {
    fail(`Pool init failed: ${e.message}`);
  }

  log('Initializing AetherRouter…');
  try {
    hashes.routerInit = invoke(routerId, ISSUER_SECRET, 'initialize',
      `--pool ${poolId} --token_fee ${aftId} --protocol_treasury ${ISSUER_PUB}`
    );
    ok(`Router initialized — ${hashes.routerInit}`);
  } catch (e) {
    fail(`Router init failed: ${e.message}`);
  }

  return hashes;
}

function step5_liquidity(poolId) {
  console.log('\n═══ STEP 5 — Add initial liquidity ═══');
  const TOKEN_AMT = '1000000000000';  // 100,000 AFT
  const XLM_AMT   = '40000000000';    // 4,000 XLM

  log(`Adding liquidity: ${TOKEN_AMT} AFT stroops + ${XLM_AMT} XLM stroops…`);
  try {
    const txHash = invoke(poolId, DISTRIBUTOR_SECRET, 'provision_liquidity',
      `--provider ${DISTRIBUTOR_PUB} --amount_a ${TOKEN_AMT} --amount_b ${XLM_AMT}`
    );
    ok(`Liquidity added — ${txHash}`);
    return txHash;
  } catch (e) {
    fail(`Add liquidity failed: ${e.message}`);
  }
}

function step6_save(data) {
  console.log('\n═══ STEP 6 — Save deployment record ═══');

  const record = {
    network: 'testnet',
    deployedAt: new Date().toISOString(),
    issuerPublicKey: ISSUER_PUB,
    distributorPublicKey: DISTRIBUTOR_PUB,
    aftAsset: `AFT:${ISSUER_PUB}`,
    AFTToken: {
      contractId: data.aftId,
      initTxHash: data.aftInit || '',
    },
    AetherPool: {
      contractId: data.poolId,
      initTxHash: data.poolInit || '',
    },
    AetherRouter: {
      contractId: data.routerId,
      initTxHash: data.routerInit || '',
    },
    trustline: {
      asset: 'AFT',
      issuer: ISSUER_PUB,
      limit: '1000000',
    },
    lpTxHash: data.lpTxHash || '',
  };

  fs.writeFileSync(DEPLOY_FILE, JSON.stringify(record, null, 2));
  ok(`Record saved → ${DEPLOY_FILE}`);
  return record;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   AetherFlow — Full Deployment             ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n  Issuer:      ${ISSUER_PUB}`);
  console.log(`  Distributor: ${DISTRIBUTOR_PUB}`);
  console.log(`  Network:     ${NETWORK} (${RPC_URL})`);

  await step1_fund();
  await step2_mint_classic();

  const { aftId, poolId, routerId } = step3_deploy();
  const { aftInit, poolInit, routerInit } = step4_initialize(aftId, poolId, routerId);
  const lpTxHash = step5_liquidity(poolId);

  const record = step6_save({
    aftId, poolId, routerId,
    aftInit, poolInit, routerInit,
    lpTxHash,
  });

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Deployment complete! 🚀                  ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  AFT Token:    ${record.AFTToken.contractId.padEnd(30)} ║`);
  console.log(`║  AetherPool:   ${record.AetherPool.contractId.padEnd(30)} ║`);
  console.log(`║  AetherRouter: ${record.AetherRouter.contractId.padEnd(30)} ║`);
  console.log('╚════════════════════════════════════════════╝');
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
