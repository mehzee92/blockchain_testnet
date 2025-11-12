const bitcore = require('bitcore-lib-ltc');

// Set the network to Litecoin testnet
const NETWORK = bitcore.Networks.testnet;

function generateLitecoinTestnetAddress() {
  // Generate a new private key
  const privateKey = new bitcore.PrivateKey(NETWORK);

  // Derive the address from the private key
  const address = privateKey.toAddress(NETWORK);

  console.log('Litecoin Testnet Address Generation:');
  console.log('------------------------------------');
  console.log('Private Key (WIF):', privateKey.toWIF());
  console.log('Address:', address.toString());
  console.log('------------------------------------');
}

// Run the function to generate the address
generateLitecoinTestnetAddress();
