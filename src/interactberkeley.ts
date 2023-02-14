import { Kyced } from './Kyced.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  fetchAccount,
  UInt64,
} from 'snarkyjs';
import { doSignDepositForTransaction, doSignForwardForTransaction, processBase, processSend } from './prepare.js';
import { fetchMissingData } from 'snarkyjs/dist/node/lib/fetch.js';
import { sendTransaction } from './utils.js';
import { signJsonTransaction } from '../node_modules/snarkyjs/dist/node/lib/account_update.js';




  let deployerAccount: PrivateKey,
  zkAppAddress: PublicKey,
  zkAppPrivateKey: PrivateKey,
  zkApp: Kyced;

  await isReady;

  let feePayer = PrivateKey.fromBase58('EKF36BUdQqZhP8xeCn1oxAK343VihK1xk7jLDrsuD1V9ZphJ53wy')
  let feePayerPub = feePayer.toPublicKey()

  let customerAPriv = PrivateKey.fromBase58('EKEjRXEMHySRFmqDSBzhE758WuRcAntR2i17ekjToN8hjR7iggox')
  let customerAPub = customerAPriv.toPublicKey()
  let customerBPriv = PrivateKey.fromBase58('EKDk9Rd7fXcYyZsQ2nyd7MS6YP5q2w5SWgFz9cQCK7QYYYAP7998') 
  let customerBPub = customerBPriv.toPublicKey()

  deployerAccount = PrivateKey.fromBase58('EKFF1GNdeRQB5M4Va7rK4eNrxxC88aGDGAbRWPPJ4qJHXyT64Zci')

  let Berkeley = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
  Mina.setActiveInstance(Berkeley);

  let customerA = await fetchAccount({ publicKey: customerAPub });
  let customerB = await fetchAccount({ publicKey: customerBPub });
  
  zkAppAddress = PublicKey.fromBase58('B62qpznUViEYBzpWas51mDyH8kAKhR7x26fih44BwXjXCkyMpe3eAvn')
  zkApp = new Kyced(zkAppAddress);

  await Kyced.compile()

  console.log('Before:', customerA.account?.balance.toBigInt())
  console.log('Before:', customerB.account?.balance.toBigInt())
 
  //const txn = await doTransferTogetherVerify({feePayer, customerAPub, customerBPub})
  const txn = await doSignDepositForTransaction({Mina, zkApp, feePayer, feePayerPub, signer: customerAPriv, customerBPub, customerAPub, amount: Field(88)})
  //const txn = await doSignForwardForTransaction({Mina, zkApp, feePayer:feePayerPub, signer: customerBPriv, customerBPub, customerAPub, amount: Field(375)})
  let jsonTxn = txn.toJSON()
  console.log('TXN 1', jsonTxn)
  jsonTxn = signJsonTransaction(jsonTxn, customerAPriv)
  console.log('TXN 2', jsonTxn)
  jsonTxn = signJsonTransaction(jsonTxn, feePayer)
  console.log('TXN 3', jsonTxn)
   
  // const hash = await txn.send();
  const hash = await sendTransaction(jsonTxn, 'https://proxy.berkeley.minaexplorer.com/graphql')
  //@ts-ignore
  console.log('HASH:',hash[0].data.sendZkapp)

  console.log('After:', customerA.account?.balance.toBigInt())
  console.log('After:', customerB.account?.balance.toBigInt())

  shutdown()