import { Kyced } from './Kyced.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
} from 'snarkyjs';
import { processBase } from './prepare.js';


async function localDeploy() {
  const txn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkApp.deploy({zkappKey: zkAppPrivateKey});
  });
  await txn.prove();
  // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
  await txn.sign([zkAppPrivateKey]).send();
}

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

  let deployerAccount: PrivateKey,
  zkAppAddress: PublicKey,
  zkAppPrivateKey: PrivateKey,
  zkApp: Kyced;

  await isReady;
  if (proofsEnabled) Kyced.compile();
  const Local = Mina.LocalBlockchain({ proofsEnabled });
  Mina.setActiveInstance(Local);
  
  deployerAccount = Local.testAccounts[0].privateKey;
  let recipient = Local.testAccounts[1].publicKey;
  
  zkAppPrivateKey = PrivateKey.random();
  zkAppAddress = zkAppPrivateKey.toPublicKey();

  zkApp = new Kyced(zkAppAddress);
  let newAccount = PrivateKey.random();
  let newAccountP  = newAccount.toPublicKey();
  Local.addAccount(newAccountP, "1450000000000");
  Local.getAccount(newAccountP)
  console.log('Before:', Local.getAccount(newAccountP).balance.toBigInt())
  console.log('Before:', Local.getAccount(deployerAccount.toPublicKey()).balance.toBigInt())

    await localDeploy();
    const data = await processBase(909090, 1)
    const id = data.data.id;
    const kyc = data.data.kyc;
    const signature = data.signature;
    // update transaction
    const txn:any = {}
    const base = txn.toJSON()
    console.log('BASE:', base)
    txn.sign([newAccount]);
    console.log('AFTE:', txn.toJSON())
   
    await txn.prove();
    console.log('AFTE1:', txn.toJSON())
    await txn.send();
    console.log('After:', Local.getAccount(zkAppAddress).balance.toBigInt())
    console.log('After:', Local.getAccount(newAccountP).balance.toBigInt())
    console.log('After:', Local.getAccount(deployerAccount.toPublicKey()).balance.toBigInt())


    shutdown()
