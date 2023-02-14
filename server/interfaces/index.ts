import { JwtHeader } from "jwt-decode"

/*
 These are the environment variables. See README 
*/

export const SSI_SERVER = process.env.SSI_SERVER
export const THIS_SERVER = process.env.THIS_SERVER
export const THIS_SERVER_PORT = process.env.THIS_SERVER_PORT
export const SSI_TOKEN = process.env.SSI_TOKEN

/* **************************** */


export const W3CDATE_FORMAT = "YYYY-MM-DDTHH:mm:ssZ"

export interface Issuer {
    id: string,
    name: string
  }
  
  export interface Proof {
    type: string,
    created: string,
    challenge?: string,
    domain?: string,
    jws: string,
    proofPurpose: string,
    verificationMethod: string
  }
  
  export interface VerifiableCredential {
    "@context": string | Array<string> | undefined,
    type: Array<string>,
    issuer?: Issuer | string,
    id?: string,
    issuanceDate?: number | string,
    credentialSubject?: Array<Object>,
    proof?: Proof,
    expirationDate?: string
  }
  
  export interface DIDParts {
    type: string
    version: string 
    keyVersion: string 
    didValue: string
    did: string
  }
  
  export interface VerifiablePresentation {
    "@context": string | Array<string> | undefined,
    type: Array<string>,
    verifiableCredential: Array<VerifiableCredential>,
    proof: Proof
  }
  
  export interface JWTBody extends VerifiablePresentation {
    iat: number
    iss: string
    aud: string
    sub: string 
    exp: number 
    jti: string 
  }
  
  export interface JWT {
    header: JwtHeader
    payload: JWTBody
    signature: string
  }
  
  export interface ErrorResponse {
    error: boolean
    data: any
  }

  export interface CashlikeRequest {
    sourcePublicKey: string 
    destPublicKey: string
    amount: number
    proof?: string
    senderPublicKey: string 
    proofA?: string
    proofB?: string
  }