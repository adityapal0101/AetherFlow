const { Server, Network } = require('@stellar/stellar-sdk');

const server = new Server('https://horizon-testnet.stellar.org');
Network.useTestNetwork();

async function checkTrustline(publicKey, assetCode = 'VCT', issuerKey = process.env.STELLAR_ISSUER_PUBLIC) {
  try {
    const account = await server.loadAccount(publicKey);
    const balance = account.balances.find(
      (b) => b.asset_code === assetCode && b.asset_issuer === issuerKey
    );

    if (balance) {
      return {
        hasTrustline: true,
        balance: balance.balance,
        limit: balance.limit,
      };
    }

    return { hasTrustline: false, balance: '0', limit: '0' };
  } catch (error) {
    console.error("Error checking trustline:", error.message);
    return { hasTrustline: false, balance: '0', limit: '0' };
  }
}

module.exports = { checkTrustline };

// If run directly
if (require.main === module) {
  const pubKey = process.argv[2];
  if (pubKey) {
    checkTrustline(pubKey).then(console.log);
  } else {
    console.log("Usage: node check-trustline.js <PUBLIC_KEY>");
  }
}
