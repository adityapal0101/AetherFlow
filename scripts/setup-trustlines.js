const {
  Asset,
  Keypair,
  Networks,
  Operation,
  Horizon,
  TransactionBuilder,
} = require('@stellar/stellar-sdk');

const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;

const ISSUER_SECRET = process.env.STELLAR_ISSUER_SECRET;
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;

if (!ISSUER_SECRET || !DISTRIBUTOR_SECRET) {
  console.error('\n[ERROR] Set STELLAR_ISSUER_SECRET and STELLAR_DISTRIBUTOR_SECRET\n');
  process.exit(1);
}

const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);
const distributorKeypair = Keypair.fromSecret(DISTRIBUTOR_SECRET);

const AFT_ASSET = new Asset('AFT', issuerKeypair.publicKey());

async function setupTrustlines() {
  try {
    const distributorAccount = await server.loadAccount(distributorKeypair.publicKey());
    
    // 1. Create Trustline
    const trustTx = new TransactionBuilder(distributorAccount, { fee: '1000', networkPassphrase })
      .addOperation(Operation.changeTrust({
        asset: AFT_ASSET,
        limit: '1000000',
      }))
      .setTimeout(30)
      .build();

    trustTx.sign(distributorKeypair);
    await server.submitTransaction(trustTx);
    console.log(`Trustline established for distributor: ${distributorKeypair.publicKey()}`);

    // 2. Initial Issue
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    const issueTx = new TransactionBuilder(issuerAccount, { fee: '1000', networkPassphrase })
      .addOperation(Operation.payment({
        destination: distributorKeypair.publicKey(),
        asset: AFT_ASSET,
        amount: '1000000',
      }))
      .setTimeout(30)
      .build();

    issueTx.sign(issuerKeypair);
    await server.submitTransaction(issueTx);
    console.log("Issued 1,000,000 AFT to distributor");

  } catch (error) {
    console.error("Error setting up trustlines:", error.response?.data?.extras?.result_codes || error.message);
  }
}

async function addTrustline(userSecret) {
  const userKeypair = Keypair.fromSecret(userSecret);
  const userAccount = await server.loadAccount(userKeypair.publicKey());

  const tx = new TransactionBuilder(userAccount, { fee: '1000', networkPassphrase })
    .addOperation(Operation.changeTrust({
      asset: AFT_ASSET,
    }))
    .setTimeout(30)
    .build();

  tx.sign(userKeypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
}

module.exports = { setupTrustlines, addTrustline, AFT_ASSET };

if (require.main === module) {
  setupTrustlines();
}
