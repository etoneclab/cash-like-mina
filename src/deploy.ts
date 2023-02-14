import {
    Mina,
    isReady,
    shutdown,
    PrivateKey,
    fetchAccount,
    AccountUpdate,
  } from 'snarkyjs';
  
  import { Kyced } from './Kyced.js';
  
  import green from 'chalk';
  
  await isReady;
  let Berkeley = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
  Mina.setActiveInstance(Berkeley);
  
  // to use this test, change this private key to an account which has enough MINA to pay fees
  let feePayerKey = PrivateKey.fromBase58(
    // @ts-ignore
    //process.env.DEPLOYER_PRIVATE_KEY
    'EKFC3bAPEbW9J53DH1VaDzdBPanBYNSm121jSzH9RHET7GcagXRo'
  );

  let feePayerPublic = feePayerKey.toPublicKey()
  
  console.log(feePayerPublic.toBase58());
  let response = await fetchAccount({ publicKey: feePayerPublic });
  if (response.error) throw Error(response.error.statusText);
  let { nonce, balance } = response.account;
  console.log(`Using fee payer account with nonce ${nonce}, balance ${balance}`);
  
  let zkappKey = PrivateKey.random();
  //let zkappKey = PrivateKey.fromBase58('EKEYN96bvTMyjNP7RiMvBHmqzyzn4YnNn5ivyFdydrPiPfKE8tkh');
  let zkappAddress = zkappKey.toPublicKey();
  
  const keyPair = {
    privateKey: zkappKey.toBase58(),
    publicKey: zkappAddress.toBase58(),
  };

  console.log("KeyPair", keyPair);
  
  let transactionFee = 100_000_000;
  // compile the SmartContract to get the verification key (if deploying) or cache the provers (if updating)
  // this can take a while...
  console.log('Compiling smart contract...');
  let { verificationKey } = await Kyced.compile();
  // check if the zkapp is already deployed, based on whether the account exists and its first zkapp state is != 0
  
  let zkapp = new Kyced(zkappAddress);
  console.log(`Deploying zkapp for public key ${zkappAddress.toBase58()}.`);
  // the `transaction()` interface is the same as when testing with a local blockchain
  let transaction = await Mina.transaction(
    feePayerPublic,
    () => {
      AccountUpdate.fundNewAccount(feePayerPublic);
      zkapp.deploy({ zkappKey, verificationKey });
      zkapp.init(zkappKey);
    }
  );
  // if you want to inspect the transaction, you can print it out:
  //console.log(transaction.toGraphqlQuery());
  
  // send the transaction to the graphql endpoint
  console.log('Sending the transaction...');
  transaction.sign([zkappKey, feePayerKey]);
  let res;
  try {
    res = await transaction.send();
    //@ts-ignore
    const txUrl = `https://berkeley.minaexplorer.com/transaction/${res.data.sendZkapp.zkapp.hash}`; // TODO: Make the network configurable
    const str =
      `\nSuccess! Deploy transaction sent.` +
      `\n` +
      `\nNext step:` +
      `\n  Your smart contract will be live (or updated)` +
      `\n  as soon as the transaction is included in a block:` +
      `\n  ${txUrl}`;
   
    
    
    console.log(str)
  } catch (err) {
    console.log('failed', err);
  }
  // if the zkapp is not deployed yet, create an update transaction
  
  shutdown();