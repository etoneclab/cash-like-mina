import jwt_decode from 'jwt-decode'
import { Issuer, VerifiableCredential, VerifiablePresentation } from '../interfaces';

export const checkCredential = (jwt: string) => {
    try {
        const decoded:VerifiablePresentation = jwt_decode(jwt)
        console.log('Verifiable Presentation Type', decoded.type.filter(item => item!== 'VerifiablePresentation'))
        decoded.verifiableCredential.forEach((element:VerifiableCredential) => {
            console.log('Verifiable Credential Type', element.type.filter(item => item!== 'VerifiableCredential'))
            console.log('Credential Subject', element.credentialSubject)
            console.log('Issuer', element.issuer)
        });
        return decoded
    } catch(e) {
        console.log('Error decoding JWT')
        return ""
    }
}

export const verifyCredential = (vp: VerifiablePresentation) => {
    try {
        if (!vp.type.includes('CredentialShared')) {
            return false
        }
        for(let i=0;i<vp.verifiableCredential.length;i++) {
            const vc:VerifiableCredential=vp.verifiableCredential[i]
            if (vc.type.includes('KYCInfo')) {
                if ((vc.issuer as Issuer).id===process.env.TRUSTED_ISSUER) {
                    //@ts-ignore
                    return vc.credentialSubject.publickey;
                }
            }
        }
    } catch(e) {
        return false
    }
}