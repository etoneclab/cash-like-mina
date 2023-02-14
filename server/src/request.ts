// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { isReady, PrivateKey, Field, Signature, PublicKey, Mina, AccountUpdate, setGraphqlEndpoint } from 'snarkyjs';
import axios from 'axios'
import { CashlikeRequest } from '../interfaces';
import { doSignDepositForTransaction, sendTransaction, sendZkappQuery } from '../utility/transaction.js';
import { signJsonTransaction } from '../../node_modules/snarkyjs/dist/node/lib/account_update.js';
import { Request, Response } from 'express';
import express, { Express } from 'express';
import { v4 } from 'uuid'
import {checkCredential, verifyCredential} from '../utility/index.js'

type ErrorResponse = {
  error: boolean
  data: any
}

const MAX_ATTEMPTS = 20

export const setupEndpoints = (app:Express) => { 

  app.post('/api/create/kyc', async (req: Request, res: Response) => {
    await isReady
    const publicKey = req.body.publicKey
    let response = await processBase(publicKey, 1) 
    res.status(200).json({error: false, data: response})
  })

  app.post('/api/verify/consumerequest', async (req: Request, res: Response) => {
    try {
      console.log('Called by API')
      const jwt = req.body.jwt
      const challenge = req.query.challenge as string
  
      // Pre check of the info. If wrong here we save a call to the SSI service.
      const result = checkCredential(jwt)
  
      const response = await axios.post(process.env.SSI_SERVER + '/v3/consumerequest', {
        jwt
        }, {headers: {
            'Content-Type': 'application/json',
            'X-Token': process.env.SSI_TOKEN
        }})
      
      const obj = global.storage.getItem(challenge)
  
      const verification = verifyCredential(response.data.data.payload)
      if (verification) {
        const signature = await processBase(verification, 1)
        obj.ws.send(JSON.stringify({challenge, signature}))
      } else {
        obj.ws.send(JSON.stringify({challenge:"", data: response.data.data}))
      }
      res.status(200).json(response.data)
    } catch(e) {
      console.log('Err:', e)
      res.status(500).json({error: true, data: e})
    }
  })

  app.get('/qrcode/:challenge', async (req: Request, res: Response) => {
    const obj = global.storage.getItem(req.params.challenge)
    if (obj.qrcode) {
      res.status(200).json(obj.qrcode.data)
    } else {
      res.status(500).json({msg: 'qrcode not found'})
    }
  })

  app.get('/api/verify/kycdone/:challenge', async (req: Request, res: Response) => {
    const challenge = req.params.challenge
    let response = await requestSignature(challenge) 
    if (response.error) {
      res.status(500).json(response)
      return
    }
    
    const obj = global.storage.getItem(challenge)
    const url = process.env.THIS_SERVER + '/qrcode/' + challenge
    global.storage.setItem(challenge, {...obj, qrcode: response.data})
    res.status(200).json({data: {jwt: url}})
  })

  app.post('/transaction', async (req: Request, res: Response) => {
    await isReady
    console.log('BODY:', req.body)
    const request:CashlikeRequest = { 
      amount: req.body.amount, 
      destPublicKey: req.body.destPublicKey,
      proof: req.body.proof,
      senderPublicKey: req.body.senderPublicKey,
      sourcePublicKey: req.body.sourcePublicKey
    }
    let response = await processDepositRequest(request) 
    pollTransaction(response, '')
    res.status(200).json({error: false, data: 'Transaction Sent...'})
  })

  app.post('/forward', async (req: Request, res: Response) => {
    await isReady
    const request:CashlikeRequest = { 
      amount: req.body.amount, 
      destPublicKey: req.body.destPublicKey,
      proof: req.body.proof,
      senderPublicKey: req.body.senderPublicKey,
      sourcePublicKey: req.body.sourcePublicKey
    }
    let response = await processForwardRequest(request) 
    res.status(200).json({error: false, data: response})
  })

  app.post('/full-transaction/:challenge', async (req: Request, res: Response) => {
    console.log('Here,', req.body, req.params)
    const challenge = req.params.challenge
    await isReady
    const request:CashlikeRequest = { 
      amount: req.body.amount, 
      destPublicKey: req.body.destPublicKey,
      proofA: req.body.proofA,
      proofB: req.body.proofB,
      senderPublicKey: req.body.senderPublicKey,
      sourcePublicKey: req.body.sourcePublicKey
    }
    let response = await processDepositRequest({...request, proof: request.proofA}) 
    const uid = v4()
    global.storage.setItem(uid, {status: 'DEPOSIT', request, response})
    pollTransaction(uid, challenge)
    res.status(200).json({error: false, data: uid})
  })
}

async function processBase(userId:string, kyc:number) {
  // We need to wait for SnarkyJS to finish loading before we can do anything
  await isReady;

  // The private key of our account. 
  const prv = process.env.PRIVATE_KEY as string
  const privateKey = PrivateKey.fromBase58(prv);

  // We compute the public key associated with our private key
  const publicKey = privateKey.toPublicKey();
  

  // Define a Field with the value of the users id i.e. the public key
  const userPK = PublicKey.fromBase58(userId)
  const id = Field(userPK.x.toBigInt());

  // Define a Field with the users KYC field value
  const kycValue = Field(kyc);

  // Use our private key to sign an array of Fields containing the users id and
  // kyc values
  const signature = Signature.create(privateKey, [id, kycValue]);

  return {
    data: { id: id, kyc: kycValue },
    signature: signature,
    publicKey: publicKey,
  };
}

async function processDepositRequest(request:CashlikeRequest) {
 
  const feePayer = PrivateKey.fromBase58(process.env.FEE_PAYER_PRIVATE as string)
  const feePayerPub = feePayer.toPublicKey()
  let proof = request.proof as string

  const jsonTx = signJsonTransaction(proof, feePayer)

  const query = sendZkappQuery(jsonTx) 
  const hash = await sendTransaction(query, 'https://proxy.berkeley.minaexplorer.com/graphql')
 
  console.log('HASH:',hash)
  return hash?.data?.sendZkapp?.zkapp?.id
}

async function processForwardRequest(request:CashlikeRequest) {
 
  const feePayer = PrivateKey.fromBase58(process.env.FEE_PAYER_PRIVATE as string)
  const feePayerPub = feePayer.toPublicKey()
  let proof = request.proof as string

  const jsonTx = signJsonTransaction(proof, feePayer)

  const query = sendZkappQuery(jsonTx) 
  const hash = await sendTransaction(query, 'https://proxy.berkeley.minaexplorer.com/graphql')
 
  console.log('HASH:',hash)
  return hash?.data?.sendZkapp?.zkapp?.id
}

type TransactionStatus = 'INCLUDED' | 'PENDING' | 'UNKNOWN';

const transactionStatusQuery = (txId: string) => `query {
  transactionStatus(zkappTransaction:"${txId}")
}`;

async function fetchTransactionStatus(
  txId: string,
  graphqlEndpoint: string
): Promise<TransactionStatus> {
  let response = await sendTransaction(
    transactionStatusQuery(txId),
    graphqlEndpoint
  );
  
  return response.data
}

const sleep = async (howmuch:number) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, howmuch)
  })
}

export const pollTransaction = async (session: string, challenge: string) => {
  const socketObj = global.storage.getItem(challenge)
  const obj = global.storage.getItem(session)
  const txId = obj.response

  for (let i=0;i<300;i++) {
    const res = await fetchTransactionStatus(txId, 'https://proxy.berkeley.minaexplorer.com/graphql');
    //@ts-ignore
    const status = res?.transactionStatus
    console.log('RESPONSE:', session, " - " , status)
    socketObj.ws.send(JSON.stringify({polling: status}))
    if (status === 'INCLUDED') {
      if (obj.status === 'DEPOSIT') {
        socketObj.ws.send(JSON.stringify({polling: obj.status}))
        let response = await processForwardRequest({...obj.request, proof: obj.request.proofB}) 
        global.storage.setItem(session, {...obj, response, status: 'FORWARD'})
        pollTransaction(session, challenge)
        return
      } else {
        socketObj.ws.send(JSON.stringify({polling: "COMPLETED"}))
        console.log('RESPONSE:', session, " - " , 'COMPLETED...')
        global.storage.removeItem(session)
        return
      }
    }
    await sleep(10000)
  }
  socketObj.ws.send(JSON.stringify({polling: "COMPLETED"}))
  console.log('RESPONSE:', session, " - " , 'TIMEOUT...')
  global.storage.removeItem(session)
}

const requestSignature = async (challenge: string) : Promise<ErrorResponse> => {
  //const challenge = v4() 
  try {
      const response = await axios.post(process.env.SSI_SERVER + '/v3/createrequestvc', 
          {
              templateid: 144,
              domain: process.env.THIS_SERVER+"/api/verify/consumerequest",
              challenge 
          },
          {headers: {
              'Content-Type': 'application/json',
              'X-Token': process.env.SSI_TOKEN
          }})
      return {error:false, data: response.data}
  } catch(e) {
    return {error:true, data: e}
  }
}