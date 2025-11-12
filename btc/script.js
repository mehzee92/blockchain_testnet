const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const { ECPairFactory } = require('ecpair');
const axios = require('axios');

const ECPair = ECPairFactory(ecc);
bitcoin.initEccLib(ecc);

// Configuration
const NETWORK = bitcoin.networks.testnet;
const WIF = 'cTeDwbjs4Jg6Ra3j89rVfKNpz3zhJMUuDXm6LQbqX7a88QSFKekn';
const FROM_ADDRESS = 'tb1q3v5xm3c3s0058elrnp7ms840wwxwv58vl3cufp';
const TO_ADDRESS = 'tb1qtndxnnnfkelt6aufch6wqrrhggz5kskkdj44tc';
const AMOUNT_TO_SEND = 10000; // 0.00023 BTC in satoshis

// Blockstream API for testnet
const API_BASE = 'https://blockstream.info/testnet/api';

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
    const response = await axios.post(`${API_BASE}/tx`, txHex);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to broadcast transaction: ${error.message}`);
  }
}

async function createAndSendTransaction() {
  try {
    console.log('Starting Bitcoin transaction...\n');
    
    // Import the private key
    const keyPair = ECPair.fromWIF(WIF, NETWORK);
    
    // Get UTXOs for the sender address
    console.log('Fetching UTXOs...');
    const utxos = await getUTXOs(FROM_ADDRESS);
    
    if (utxos.length === 0) {
      throw new Error('No UTXOs found for this address');
    }
    
    console.log(`Found ${utxos.length} UTXO(s)`);
    
    // Calculate total available and select UTXOs
    let totalInput = 0;
    const selectedUtxos = [];
    
    for (const utxo of utxos) {
      selectedUtxos.push(utxo);
      totalInput += utxo.value;
      
      // Stop if we have enough (amount + estimated fee)
      if (totalInput >= AMOUNT_TO_SEND + 5000) break;
    }
    
    console.log(`Total input: ${totalInput} satoshis`);
    
    // Estimate fee (rough estimate: 150 bytes * 10 sat/vbyte)
    const estimatedFee = 1500;
    const change = totalInput - AMOUNT_TO_SEND - estimatedFee;
    
    if (change < 0) {
      throw new Error('Insufficient funds (including fees)');
    }
    
    console.log(`Amount to send: ${AMOUNT_TO_SEND} satoshis`);
    console.log(`Estimated fee: ${estimatedFee} satoshis`);
    console.log(`Change: ${change} satoshis\n`);
    
    // Create transaction
    const psbt = new bitcoin.Psbt({ network: NETWORK });
    
    // Add inputs
    for (const utxo of selectedUtxos) {
      const txHex = await axios.get(`${API_BASE}/tx/${utxo.txid}/hex`);
      
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(txHex.data, 'hex'),
      });
    }
    
    // Add output to recipient
    psbt.addOutput({
      script: bitcoin.address.toOutputScript(TO_ADDRESS, NETWORK),
      value: BigInt(AMOUNT_TO_SEND),
    });
    
    // Add change output back to sender
    if (change > 546) { // Dust limit
      psbt.addOutput({
        script: bitcoin.address.toOutputScript(FROM_ADDRESS, NETWORK),
        value: BigInt(change),
      });
    }
    
    // Sign all inputs
    for (let i = 0; i < selectedUtxos.length; i++) {
      psbt.signInput(i, keyPair);
    }
    
    // Finalize and extract transaction
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();
    const txId = tx.getId();
    
    console.log('Transaction created successfully!');
    console.log(`Transaction ID: ${txId}`);
    console.log(`Transaction size: ${tx.virtualSize()} vbytes`);
    console.log(`Actual fee: ${totalInput - AMOUNT_TO_SEND - change} satoshis\n`);
    
    // Broadcast transaction
    console.log('Broadcasting transaction...');
    await broadcastTransaction(txHex);
    
    console.log('\n✓ Transaction broadcast successfully!');
    console.log(`View on explorer: https://blockstream.info/testnet/tx/${txId}`);
    
    return txId;
    
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