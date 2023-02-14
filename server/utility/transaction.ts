import { Kyced } from './Kyced.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  fetchAccount,
  Signature,
} from 'snarkyjs';
import axios from 'axios'
import { Response } from 'express';


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
    const txn : any = {} 
    const base = txn.toJSON()
    txn.sign([customerAPriv]);
    
    await txn.prove();

    const hash = await txn.send();
    console.log('HASH:', hash.hash())

    console.log('After:', customerA.account?.balance.toBigInt())
    console.log('After:', customerB.account?.balance.toBigInt())
    shutdown()
}

export const doSignDepositForTransaction = async (actors:any) => {
  const signature = await doCreateProofForTransaction(actors)
  const txn = await actors.Mina.transaction(() => {
    actors.zkApp.deposit(actors.customerAPub, actors.customerBPub, actors.amount, signature)
  });

  await txn.prove();
  txn.sign([actors.signer]);
  
  return txn.toJSON()
}

const doCreateProofForTransaction = async (actors:any) => {
  const signature = await processSend(actors.signer, actors.customerAPub, actors.customerBPub, actors.amount)
  return signature
} 

async function processSend(privKey:PrivateKey, fromPublic:PublicKey, toPublic: PublicKey, amount: Field) {

  const fromPublicValue = Field(fromPublic.x.toBigInt())
  const toPublicValue = Field(toPublic.x.toBigInt())

  const signature = Signature.create(privKey, [fromPublicValue, toPublicValue, amount]);

  return signature
}

// removes the quotes on JSON keys
function removeJsonQuotes(json: string) {
  let cleaned = JSON.stringify(JSON.parse(json), null, 2);
  return cleaned.replace(/\"(\S+)\"\s*:/gm, '$1:');
}

  // TODO: Decide an appropriate response structure.
export function sendZkappQuery(json: string) {
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
    let body = { operationName: null, query, variables: {} };
    let response = await axios.post(graphqlEndpoint, body, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data
  } catch (error) {
    console.log('ERROR:', error)
    return [undefined, inferError(error)] as [undefined, FetchError];
  }
}