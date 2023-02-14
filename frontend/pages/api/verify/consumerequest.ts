// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { isReady, PrivateKey, Field, Signature } from 'snarkyjs';
import {v4 as uuidv4} from 'uuid'
import axios from 'axios'
import { checkCredential, verifyCredential } from '../../../utility';
import { ErrorResponse } from '../../../interfaces';
import Redis from '../../../utility/redis';



export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse>
) {
  try {
    console.log('Called by API')
    const jwt = req.body.jwt

    // Pre check of the info. If wrong here we save a call to the SSI service.
    const result = checkCredential(jwt)

    const response = await axios.post(process.env.SSI_SERVER + '/v3/consumerequest', {
      jwt
      }, {headers: {
          'Content-Type': 'application/json',
          'X-Token': process.env.SSI_TOKEN
      }})
    
    const socket = global.storage.getItem('socket')

    const verification = verifyCredential(response.data.data.payload)
    if (verification) {
      const challenge = uuidv4() 
      global.storage.setItem('challenge', challenge)
      socket.emit('response', JSON.stringify({challenge, data: response.data.data}))
    } else {
      socket.emit('response', JSON.stringify({challenge:"", data: response.data.data}))
    }
    res.status(200).json(response.data)
  } catch(e) {
    res.status(500).json({error: true, data: e})
  }
}