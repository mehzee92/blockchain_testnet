const axios = require('axios');

// litecoinspace.org API for testnet
const API_BASE = 'https://litecoinspace.org/testnet/api';

async function getTxDetails(txHash) {
  try {
    console.log(`Fetching details for transaction: ${txHash}\n`);
    const response = await axios.get(`${API_BASE}/tx/${txHash}`);
    const tx = response.data;

    console.log('Transaction Details:');
    console.log('--------------------');
    console.log('TxID:', tx.txid);
    console.log('Version:', tx.version);
    console.log('Locktime:', tx.locktime);
    console.log('Size:', tx.size, 'bytes');
    console.log('Weight:', tx.weight);
    console.log('Fee:', tx.fee, 'satoshis');
    console.log('Status:');
    console.log('  Confirmed:', tx.status.confirmed);
    if (tx.status.confirmed) {
      console.log('  Block Height:', tx.status.block_height);
      console.log('  Block Hash:', tx.status.block_hash);
      console.log('  Block Time:', new Date(tx.status.block_time * 1000).toLocaleString());
    }
    console.log('\nInputs:');
    tx.vin.forEach((input, index) => {
      console.log(`  Input ${index + 1}:`);
      console.log('    TxID:', input.txid);
      console.log('    Vout:', input.vout);
      console.log('    ScriptSig (hex):', input.scriptsig);
      console.log('    Witness:', input.witness ? input.witness.join(', ') : 'N/A');
      console.log('    Sequence:', input.sequence);
    });
    console.log('\nOutputs:');
    tx.vout.forEach((output, index) => {
      console.log(`  Output ${index + 1}:`);
      console.log('    Value:', output.value, 'satoshis');
      console.log('    ScriptPubKey (hex):', output.scriptpubkey);
      console.log('    Address:', output.scriptpubkey_address || 'N/A');
      console.log('    Type:', output.scriptpubkey_type);
    });
    console.log('--------------------');

    return tx;
  } catch (error) {
    console.error(`Failed to fetch transaction details: ${error.message}`);
    throw error;
  }
}

// Example Usage: Replace with an actual Litecoin testnet transaction hash
const exampleTxHash = '822a084efab2335e39ccf7489f6f81a69593afa8f7b917ca208f8eb955fe1462'; // This is the txId from the previous successful transaction

getTxDetails(exampleTxHash)
  .then(() => {
    console.log('\nTransaction details fetched successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFailed to fetch transaction details:', error.message);
    process.exit(1);
  });
