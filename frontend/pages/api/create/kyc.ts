// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { isReady, PrivateKey, Field, Signature, PublicKey } from 'snarkyjs';
import {v4 as uuidv4} from 'uuid'
import axios from 'axios'



type ErrorResponse = {
  error: boolean
  data: any
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse>
) {
  console.log('POST', req.body, req.body.publicKey)
  const publicKey = req.body.publicKey
  let response = await processBase(publicKey, 1) 
  res.status(200).json({error: false, data: response})
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