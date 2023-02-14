// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { isReady, PrivateKey, Field, Signature, PublicKey, Mina, AccountUpdate } from 'snarkyjs';
import {v4 as uuidv4} from 'uuid'
import axios from 'axios'
import { CashlikeRequest } from '../../../interfaces';
import { Kyced } from '../../../utility/Kyced';
import { doSignDepositForTransaction, sendTransaction } from '../../../utility/transaction';
import { signJsonTransaction } from '../../../node_modules/snarkyjs/dist/node/lib/account_update.js';

type ErrorResponse = {
  error: boolean
  data: any
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse>
) {
  await isReady
  console.log('BODY:', req.body)
  const request:CashlikeRequest = { 
    amount: req.body.amount, 
    destPublicKey: req.body.destPublicKey,
    proof: req.body.proof,
    senderPublicKey: req.body.senderPublicKey,
    sourcePublicKey: req.body.sourcePublicKey
  }
  console.log('Before processing', req.body.proof)
  let response = await processDepositRequest(request) 
  res.status(200).json({error: false, data: response})
}


async function processDepositRequest(request:CashlikeRequest) {
 
  const feePayer = PrivateKey.fromBase58(process.env.FEE_PAYER_PRIVATE as string)
  const feePayerPub = feePayer.toPublicKey()
 
  const jsonTx = signJsonTransaction(request.proof, feePayer)

  const hash = await sendTransaction(jsonTx, 'https://proxy.berkeley.minaexplorer.com/graphql')
 
  console.log('HASH:',hash[0]?.data.sendZkapp)
    
}
