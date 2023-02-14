import { isReady, PrivateKey, Field, Signature, PublicKey } from 'snarkyjs';

export async function processBase(userId:number, kyc:number) {
  // We need to wait for SnarkyJS to finish loading before we can do anything
  await isReady;

  // The private key of our account. When running locally the hardcoded key will
  // be used. In production the key will be loaded from a Vercel environment
  // variable.
  const prv = process.env.PRIVATE_KEY as string
  
  const privateKey = PrivateKey.fromBase58(prv);

  // We get the users credit score. In this case it's 787 for user 1, and 536
  // for anybody else :)
  // const knownCreditScore = (userId) => (userId === "1" ? 787 : 536);

  // We compute the public key associated with our private key
  const publicKey = privateKey.toPublicKey();
  // Define a Field with the value of the users id
  const id = Field(userId);

  // Define a Field with the users credit score
  const kycValue = Field(kyc);

  // Use our private key to sign an array of Fields containing the users id and
  // credit score
  const signature = Signature.create(privateKey, [id, kycValue]);

  return {
    data: { id: id, kyc: kycValue },
    signature: signature,
    publicKey: publicKey,
  };
}

export async function processSend(privKey:PrivateKey, fromPublic:PublicKey, toPublic: PublicKey, amount: Field) {
  await isReady;

  const fromPublicValue = Field(fromPublic.x.toBigInt())
  const toPublicValue = Field(toPublic.x.toBigInt())

  const signature = Signature.create(privKey, [fromPublicValue, toPublicValue, amount]);

  return signature
}

/*export const doTransferTogetherVerify = async (actors:any) => {
  const data = await processBase(909090, 1)
  const id = data.data.id;
  const kyc = data.data.kyc;
  const signature = data.signature;
  // update transaction
  const txn = await Mina.transaction(actors.feePayer, () => {
    zkApp.verify(
        id,
        kyc,
        signature,
        data.publicKey,
        actors.customerBPub,
        actors.customerAPub
    );
  });
  
  txn.sign([customerAPriv]);
  await txn.prove();
  return txn
}
*/

export const doSignDepositForTransaction = async (actors:any) => {
  const signature = await doCreateProofForTransaction(actors)
  const txn = await actors.Mina.transaction({sender: actors.feePayerPub, fee: 100_000_000}, () => {
    actors.zkApp.deposit(actors.customerAPub, actors.customerBPub, actors.amount, signature)
  });

  await txn.prove();
  //txn.sign([actors.signer, actors.feePayer]);
  
  return txn
}

export const doSignForwardForTransaction = async (actors:any) => {
  const signature = await doCreateProofForTransaction(actors)
  const txn = await actors.Mina.transaction({sender: actors.feePayerPub, fee: 100_000_000}, () => {
    actors.zkApp.forward(actors.customerAPub, actors.customerBPub, actors.amount, signature)
  });
  
  await txn.prove();
  txn.sign([actors.signer, actors.feePayer]);
 
  return txn
}

export const doCreateProofForTransaction = async (actors:any) => {
  const signature = await processSend(actors.signer, actors.customerAPub, actors.customerBPub, actors.amount)
  return signature
} 
