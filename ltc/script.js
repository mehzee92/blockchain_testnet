const bitcore = require('bitcore-lib-ltc');
const axios = require('axios');

// Configuration
const NETWORK = bitcore.Networks.testnet;
const WIF = 'cT3XfskMaxpSmNGMSJopA7QdFcRgWdB4GzhDfXUesdZn2kJs4yA3';
const FROM_ADDRESS = 'mtmTYoCAvwdjLd94F18kYFUm4bc3y9v14P';
const TO_ADDRESS = 'mtmTYoCAvwdjLd94F18kYFUm4bc3y9v14P'; // Example address
const AMOUNT_TO_SEND = 100000; // 0.001 LTC in satoshis
const FEE = 10000; // 0.0001 LTC fee

// litecoinspace.org API for testnet
const API_BASE = 'https://litecoinspace.org/testnet/api';

async function getUTXOs(address) {
  try {
    const response = await axios.get(`${API_BASE}/address/${address}/utxo`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch UTXOs: ${error.message}`);
  }
}

async function broadcastTransaction(txHex) {
  try {
    const response = await axios.post(`${API_BASE}/tx`, txHex, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to broadcast transaction: ${error.message}`);
  }
}

async function createAndSendTransaction() {
  try {
    console.log('Starting Litecoin transaction...\n');

    // Import the private key
    const privateKey = new bitcore.PrivateKey(WIF);
    const fromAddress = privateKey.toAddress(NETWORK);

    // Get UTXOs for the sender address
    console.log('Fetching UTXOs...');
    const utxos = await getUTXOs(fromAddress.toString());

    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs found for this address');
    }

    console.log(`Found ${utxos.length} UTXO(s)`);

    // Calculate total input amount
    const totalInput = utxos.reduce((acc, utxo) => acc + utxo.value, 0);
    console.log(`Total input: ${totalInput} satoshis`);

    // Calculate change
    const changeAmount = totalInput - AMOUNT_TO_SEND - FEE;
    if (changeAmount < 0) {
      throw new Error('Insufficient funds (including fees)');
    }
    console.log(`Change amount: ${changeAmount} satoshis`);

    // Create a new transaction
    const transaction = new bitcore.Transaction()
      .from(utxos.map(utxo => ({
        txid: utxo.txid,
        vout: utxo.vout,
        address: fromAddress.toString(),
        script: new bitcore.Script(fromAddress).toHex(),
        satoshis: utxo.value
      })))
      .to(TO_ADDRESS, AMOUNT_TO_SEND)
      .to(fromAddress.toString(), changeAmount) // Add change output
      .sign(privateKey);

    console.log('Transaction created successfully!');
    console.log(`Transaction ID: ${transaction.id}`);

    // Broadcast transaction
    console.log('Broadcasting transaction...');
    const result = await broadcastTransaction(transaction.serialize());

    console.log('\n✓ Transaction broadcast successfully!');
    console.log(`View on explorer: https://litecoinspace.org/testnet/tx/${transaction.id}`);

    return transaction.id;

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Run the transaction
createAndSendTransaction()
  .then(() => {
    console.log('\nTransaction completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTransaction failed:', error.message);
    process.exit(1);
  });
