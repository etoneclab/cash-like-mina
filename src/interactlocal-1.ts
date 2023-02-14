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
import { processBase, processSend } from './prepare.js';


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
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  
  deployerAccount = Local.testAccounts[0].privateKey;
  let recipient = Local.testAccounts[1].publicKey;
  
  zkAppPrivateKey = PrivateKey.random();
  zkAppAddress = zkAppPrivateKey.toPublicKey();

  let newAccount = PrivateKey.random();
  let newAccountP  = newAccount.toPublicKey();
  Local.addAccount(newAccountP, "1450000000000");
  Local.getAccount(newAccountP)

  const dataSender = await processSend(newAccount, newAccountP, recipient, Field(20))
  
  const dataRecipient = await processSend(Local.testAccounts[1].privateKey, newAccountP, recipient, Field(20))


  shutdown()
