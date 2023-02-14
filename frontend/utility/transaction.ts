import { Kyced } from './Kyced';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  fetchAccount,
  Signature,
  Ledger
} from 'snarkyjs';


function signJsonTransaction(
  transactionJson: string,
  privateKey: PrivateKey | string
) {
  if (typeof privateKey === 'string')
    privateKey = PrivateKey.fromBase58(privateKey);
  let publicKey = privateKey.toPublicKey().toBase58();
  //@ts-ignore
  let zkappCommand: Types.Json.ZkappCommand = JSON.parse(transactionJson);
  let feePayer = zkappCommand.feePayer;
  if (feePayer.body.publicKey === publicKey) {
    zkappCommand = JSON.parse(
      Ledger.signFeePayer(JSON.stringify(zkappCommand), privateKey)
    );
  }
  for (let i = 0; i < zkappCommand.accountUpdates.length; i++) {
    let accountUpdate = zkappCommand.accountUpdates[i];
    if (
      accountUpdate.body.publicKey === publicKey &&
      accountUpdate.authorization.proof === null
    ) {
      zkappCommand = JSON.parse(
        // This is the incriminated line with the bug.
        // The real code calls signAccountUpdate and in the Object that function
        // doees not exist and it is instead signOtherAccountUpdate.
        // See commit https://github.com/o1-labs/snarkyjs/commit/845c66e4e73cc46fac9528f55485f1fcb71ba6c6
        //
        
        //@ts-ignore
        Ledger.signOtherAccountUpdate(JSON.stringify(zkappCommand), privateKey, i)
      );
    }
  }
  return JSON.stringify(zkappCommand);
}

export const executeTransaction = async (info:any) => {

  let
  zkAppAddress: PublicKey,
  zkAppPrivateKey: PrivateKey,
  zkApp: Kyced;

  await isReady;

  let customerAPriv = PrivateKey.fromBase58(info.customerAPriv)

  let customerAPub = customerAPriv.toPublicKey()

  let customerBPub = PublicKey.fromBase58(info.customerBPub)
  const id = Field(customerAPub.x.toBigInt());
  const kyc = Field(1)

  let Berkeley = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
  Mina.setActiveInstance(Berkeley);

  let customerA = await fetchAccount({ publicKey: customerAPub });
  let customerB = await fetchAccount({ publicKey: customerBPub });
  
  zkAppAddress = PublicKey.fromBase58('B62qprU7Kh91VkL7e7S2vdJd8pqqs4RLbuJayAmoVkL3HmbAebAx97h')
  zkApp = new Kyced(zkAppAddress);

  await Kyced.compile()

  console.log('Before:', customerA.account?.balance.toBigInt())
  console.log('Before:', customerB.account?.balance.toBigInt())
 
    //@ts-ignore
    const signature = Signature.fromJSON(info.signature)
    // update transaction
    const txn = await Mina.transaction({ sender: customerAPub, fee: 100_000_000 }, () => {
      zkApp.verify(
          id,
          kyc,
          signature,
          PublicKey.fromBase58(info.publicKey),
          customerBPub,
          customerAPub
      );
    });
    const base = txn.toJSON()
    txn.sign([customerAPriv]);
    
    await txn.prove();

    const hash = await txn.send();
    console.log('HASH:', hash.hash())

    console.log('After:', customerA.account?.balance.toBigInt())
    console.log('After:', customerB.account?.balance.toBigInt())
    shutdown()
}

export const doSignForwardForTransaction = async (actors:any) => {
  const signature = await doCreateProofForTransaction(actors)
  const txn = await actors.Mina.transaction({sender: actors.feePayerPub, fee: 100_000_000}, () => {
    actors.zkApp.forward(actors.customerAPub, actors.customerBPub, actors.amount, signature, actors.session)
  });
  
  //******************  */
  // This assumes that we are the only one. Good for a POC but needs to change in the real product.
  txn.transaction.feePayer.body.nonce = txn.transaction.feePayer.body.nonce.add(1);
  // *********************

  await txn.prove();
  //txn.sign([actors.signer, feePayerPriv]);
  let txnJson = txn.toJSON()

  txnJson = signJsonTransaction(txnJson, actors.signer)
  console.log('Here...', txnJson)
  return txn
}


export const doSignDepositForTransaction = async (actors:any) => {
  const signature = await doCreateProofForTransaction(actors)
  const txn = await actors.Mina.transaction({sender: actors.feePayerPub, fee: 102_000_000},() => {
    actors.zkApp.deposit(actors.customerAPub, actors.customerBPub, actors.amount, signature, actors.session)
  });
  
  await txn.prove();
  let txnJson = txn.toJSON()

  txnJson = signJsonTransaction(txnJson, actors.signer)
  console.log('Here...', txnJson)
  return txnJson
}

export const doSignDepositForTransactionKyc = async (actors:any) => {
  const signature = await doCreateProofForTransaction(actors)
  const txn = await actors.Mina.transaction({sender: actors.feePayerPub, fee: 102_000_000},() => {
    actors.zkApp.depositkyc(actors.customerAPub, actors.customerBPub, actors.amount, signature, actors.session, actors.kycVerification, actors.oracle)
  });
  
  await txn.prove();
  let txnJson = txn.toJSON()

  txnJson = signJsonTransaction(txnJson, actors.signer)
  return txnJson
}

const doCreateProofForTransaction = async (actors:any) => {
  const signature = await processSend(actors.signer, actors.customerAPub, actors.customerBPub, actors.amount, actors.session)
  return signature
} 

async function processSend(privKey:PrivateKey, fromPublic:PublicKey, toPublic: PublicKey, amount: Field, session: Field) {
  await isReady;

  const fromPublicValue = Field(fromPublic.x.toBigInt())
  const toPublicValue = Field(toPublic.x.toBigInt())

  const signature = Signature.create(privKey, [fromPublicValue, toPublicValue, amount, session]);

  return signature
}

// removes the quotes on JSON keys
function removeJsonQuotes(json: string) {
  let cleaned = JSON.stringify(JSON.parse(json), null, 2);
  return cleaned.replace(/\"(\S+)\"\s*:/gm, '$1:');
}

  // TODO: Decide an appropriate response structure.
  function sendZkappQuery(json: string) {
    return `mutation {
    sendZkapp(input: {
      zkappCommand: ${removeJsonQuotes(json)}
    }) {
      zkapp {
        hash
        id
        failureReason {
          failures
          index
        }
        zkappCommand {
          memo
          feePayer {
            body {
              publicKey
            }
          }
          accountUpdates {
            body {
              publicKey
              useFullCommitment
              incrementNonce
            }
          }
        }
      }
    }
  }
  `;
  }

  type FetchResponse = { data: any };
  type FetchError = {
    statusCode: number;
    statusText: string;
  };
  
  async function checkResponseStatus(
    response: Response
  ): Promise<[FetchResponse, undefined] | [undefined, FetchError]> {
    if (response.ok) {
      return [(await response.json()) as FetchResponse, undefined];
    } else {
      return [
        undefined,
        {
          statusCode: response.status,
          statusText: response.statusText,
        } as FetchError,
      ];
    }
  }
  
  function inferError(error: unknown): FetchError {
    let errorMessage = JSON.stringify(error);
    if (error instanceof AbortSignal) {
      return { statusCode: 408, statusText: `Request Timeout: ${errorMessage}` };
    } else {
      return {
        statusCode: 500,
        statusText: `Unknown Error: ${errorMessage}`,
      };
    }
  }
  

export async function sendTransaction(query:string, graphqlEndpoint:string) {
  try {
    query = sendZkappQuery(query)  
    let body = JSON.stringify({ operationName: null, query, variables: {} });
    let response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      //signal: controller.signal,
    });
    return await checkResponseStatus(response);
  } catch (error) {
    return [undefined, inferError(error)] as [undefined, FetchError];
  }
}