// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { isReady, PrivateKey, Field, Signature } from 'snarkyjs';
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
  let response = await requestSignature() 
  if (response.error) {
    res.status(500).json(response)
  }
  res.status(200).json(response)
}

const requestSignature = async () : Promise<ErrorResponse> => {
  const challenge = uuidv4() 
  try {
      const response = await axios.post(process.env.SSI_SERVER + '/v3/createrequestvc', 
          {
              templateid: 1,
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


async function processBase(userId:string, kyc:number) {
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