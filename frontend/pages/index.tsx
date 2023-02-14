import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Wallet from '../components/wallet';
import {QRCodeSVG} from 'qrcode.react';
import { useEffect, useState } from 'react';
import io from 'Socket.IO-client'
import { ClassNames } from '@emotion/react';
import { doSignDepositForTransaction, doSignDepositForTransactionKyc, doSignForwardForTransaction, executeTransaction } from '../utility/transaction';
import { private_safeAlpha } from '@mui/system';
import { fetchAccount, Field, isReady, Mina, PrivateKey, PublicKey, Signature } from 'snarkyjs';
import { Kyced } from '../utility/Kyced';
import logo from '../assets/logo.svg'
import { v4 } from 'uuid';
import CircularProgress from '@mui/material/CircularProgress';
import { TextField, InputAdornment, Button } from '@mui/material';
import Lottie from "lottie-react";
import LoadingModal from '../components/LoadingModal';

import minaSymbol from '../assets/mina-symbol.svg'
import closeIcon from '../assets/close.svg'
import loadingGray from "../assets/loading.json";
import error from "../assets/error.png";
import successo from "../assets/success.png";

import Success from '../components/Success';
import SelectInput from '@mui/material/Select/SelectInput';
import { createEmitAndSemanticDiagnosticsBuilderProgram, resolveProjectReferencePath } from 'typescript';
import { analyzeMethod } from 'snarkyjs/dist/node/lib/proof_system';

const feePayerPub = 'B62qqQgFVKFdMFRcT4yHYiK5yHmmTkyvB9LvA8FUyeLvsdHeR9NJ1sq'
const smartContractAddress = 'B62qpM66DERiwSiau6Cu4dymh44xo75DAHo866qyMzjJz4MSQT73Wku'
const oracle = 'B62qpznUViEYBzpWas51mDyH8kAKhR7x26fih44BwXjXCkyMpe3eAvn'

let socket:any = null
export default function Home() {
  const [qrcode, setQrcode] = useState()
  const [amount, setAmount] = useState('')
  const [balanceA, setBalanceA] = useState('')
  const [balanceB, setBalanceB] = useState('')
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState('')
  // controls appearance of the success component
  const [success, setSuccess] = useState(false)
  const [kyc, setKyc] = useState(false)
  const [pending, setPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [socketMessage, setMessageSocket] = useState({type:'', data:''})
  const [message, setMessage] = useState({
    show: true,
    type: "message",
    msg: "Waiting for operation."
  })

  const [kycSession, setKycSession] = useState('')
  const [compiled, setCompiled] = useState(false)

  useEffect(() => {
    switch (socketMessage.type) {
      case 'session':
        setMessage({show: true, type:'message', msg: 'Session Set on Server'})
        setKycSession(socketMessage.data)
        console.log("Session set:", socketMessage.data, kycSession)
        break;
      case 'polling':
        setPending(pending + 1)
        break;
      case 'signature':
        console.log('Set Transaction....start payment', kycSession)
        setMessage({show: true, type:'message', msg: 'Initiate Payment'})
        sendTransactionFullKYC(socketMessage.data)
        break;
    }
  }, [socketMessage])

  useEffect(() => {
    console.log('Rerender...')
    const k = localStorage.getItem('session')
    if (!k) { 
      const s = v4()
      setSession(s); 
      localStorage.setItem('session', s) 
    }
    isReady.then(e => {
      let Berkeley = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
      Mina.setActiveInstance(Berkeley);
  
      let ka = localStorage.getItem('clientA')
      if (!ka) {
        let pka = PrivateKey.random();
        localStorage.setItem('clientA', JSON.stringify({public: pka.toPublicKey().toBase58(), private: pka.toBase58()}))
        pka = PrivateKey.random();
        localStorage.setItem('clientB', JSON.stringify({public: pka.toPublicKey().toBase58(), private: pka.toBase58()}))
        ka = localStorage.getItem('clientA')
      }
      const publicKeyA = JSON.parse(ka as string).public
      const kb = localStorage.getItem('clientB')
      const publicKeyB = JSON.parse(kb as string).public
      Promise.all([fetchAccount({ publicKey: publicKeyA }), fetchAccount({ publicKey: publicKeyB})]).then ((results) => {
        setBalanceA(results[0].account?.balance.toBigInt().toString())
        setBalanceB(results[1].account?.balance.toBigInt().toString())
        setLoading(false)
      })
      
    })

    const ws = new WebSocket('ws://localhost:8080/api/login/v2');
   
    ws.onopen = () => {
        console.log('connected')
        ws.send('Hello')
    }
   
    ws.onmessage = (msg:any) => {
        // Verify correctness...
        let resp = JSON.parse(msg.data)
        console.log('RESP1:', resp)
        if (resp.session) {
          setMessageSocket({type:'session', data:resp.session})
          return
        } 
        if (resp.signature) {
          setMessageSocket({type:'signature', data:resp.signature.signature})
          return
        }
 
        if (resp.polling) {
          if (resp.polling === 'INCLUDED') {
            setMessage({show: true, type:'message', msg: 'Deposit Done.'})
            let ka = localStorage.getItem('clientA')
            const publicKeyA = JSON.parse(ka as string).public
            fetchAccount({ publicKey: publicKeyA }).then(result => {
              setBalanceA(result.account?.balance.toBigInt().toString())
            })
          }
          if (resp.polling === 'COMPLETED') {
            setMessage({show: true, type:'message', msg: 'Operation Completed'})
            let ka = localStorage.getItem('clientB')
            const publicKeyB = JSON.parse(ka as string).public
            fetchAccount({ publicKey: publicKeyB }).then(result => {
              setBalanceB(result.account?.balance.toBigInt().toString())
            })
            setSuccess(true)
          }
          if (resp.polling === 'PENDING') {
            console.log('Here...')
            setMessageSocket({type:'polling', data:''})
          }
        } else {
          console.log('Error...')
        }
      }
  }, [])

  const sendTransactionFull = async () => {
    if (parseInt(amount)>500) {
      setMessage({show: true, type:'error', msg: 'Checked Amount. KYC Needed'})
      setOpen(true)
      getRequest()
      console.log('SessionSER', kycSession)
      return
    }
    await isReady;
    setMessage({show: true, type:'message', msg: 'Compiling...'})
    await Kyced.compile()
    setMessage({show: true, type:'message', msg: 'Creating proofs...'})
    try {
      let feePayer = PrivateKey.fromBase58('EKF36BUdQqZhP8xeCn1oxAK343VihK1xk7jLDrsuD1V9ZphJ53wy')
      let feePayerPub = feePayer.toPublicKey()
      const ka = localStorage.getItem('clientA')
      const publicKeyA = JSON.parse(ka as string).public
      const privateKeyA = JSON.parse(ka as string).private

      const kb = localStorage.getItem('clientB')
      const publicKeyB = JSON.parse(kb as string).public
      const privateKeyB = JSON.parse(kb as string).private

      let Berkeley = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
      Mina.setActiveInstance(Berkeley);
      
      const zkAppAddress = PublicKey.fromBase58(smartContractAddress)
      const zkApp = new Kyced(zkAppAddress);

      const proofA = doSignDepositForTransaction({
        customerAPub: PublicKey.fromBase58(publicKeyA),
        customerBPub: PublicKey.fromBase58(publicKeyB),
        amount: Field(amount),
        signer: PrivateKey.fromBase58(privateKeyA),
        Mina,
        zkApp,
        feePayerPub,
        session: Field(session)
      })

      const proofB = doSignForwardForTransaction({
        customerAPub: PublicKey.fromBase58(publicKeyA),
        customerBPub: PublicKey.fromBase58(publicKeyB),
        amount: Field(amount),
        signer: PrivateKey.fromBase58(privateKeyB),
        Mina,
        zkApp,
        feePayerPub,
        session: Field(session)
      })

      console.log('Waiting for proofs...')
      setMessage({show: true, type:'message', msg: 'Sending Proofs...'})
      Promise.all([proofA, proofB]).then((values:any[]) => {
        const result = sendToServer({
          amount, 
          destPublicKey: publicKeyB,
          proofA:values[0],
          proofB:values[1],
          senderPublicKey: publicKeyA,
          sourcePublicKey: publicKeyA
        }, 'http://localhost:8080/full-transaction/'+kycSession)
      })
    }
    catch(e) {
      console.log('Error>', e)
    }   
  }

  const sendTransactionFullKYC = async (signature: any) => {
    await isReady;
    await Kyced.compile()
    try {
      let feePayer = PrivateKey.fromBase58('EKF36BUdQqZhP8xeCn1oxAK343VihK1xk7jLDrsuD1V9ZphJ53wy')
      let feePayerPub = feePayer.toPublicKey()
      const ka = localStorage.getItem('clientA')
      const publicKeyA = JSON.parse(ka as string).public
      const privateKeyA = JSON.parse(ka as string).private

      const kb = localStorage.getItem('clientB')
      const publicKeyB = JSON.parse(kb as string).public
      const privateKeyB = JSON.parse(kb as string).private
      
      const zkAppAddress = PublicKey.fromBase58(smartContractAddress)
      const zkApp = new Kyced(zkAppAddress);
      console.log('SIGNATURE>', signature, signature.r)
      const proofA = doSignDepositForTransactionKyc({
        customerAPub: PublicKey.fromBase58(publicKeyA),
        customerBPub: PublicKey.fromBase58(publicKeyB),
        amount: Field(amount),
        signer: PrivateKey.fromBase58(privateKeyA),
        Mina,
        zkApp,
        feePayerPub,
        session: Field(session),
        kycVerification: Signature.fromJSON(signature),
        oracle: PublicKey.fromBase58(oracle)
      })

      const proofB = doSignForwardForTransaction({
        customerAPub: PublicKey.fromBase58(publicKeyA),
        customerBPub: PublicKey.fromBase58(publicKeyB),
        amount: Field(amount),
        signer: PrivateKey.fromBase58(privateKeyB),
        Mina,
        zkApp,
        feePayerPub,
        session: Field(session)
      })

      console.log('Waiting for proofs...')
      Promise.all([proofA, proofB]).then((values:any[]) => {
        const result = sendToServer({
          amount, 
          destPublicKey: publicKeyB,
          proofA:values[0],
          proofB:values[1],
          senderPublicKey: publicKeyA,
          sourcePublicKey: publicKeyA
        }, 'http://localhost:8080/full-transaction/'+kycSession)
      })
    }
    catch(e) {
      console.log('Error>', e)
    }   
  }

  const sendToServer = async (data: any, url:string) => {
    const d = JSON.stringify(data)
    console.log('DATA:', data)
    const response = await fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      headers: {
        'Content-Type': 'application/json'
      },
      body: d // body data type must match ta"Content-Type" header
    });
    return response.json(); 
  }

  const getSignature = async (data: any) => {
    const response = await fetch('http://localhost:8080/api/create/kyc', {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data) // body data type must match ta"Content-Type" header
    });
    return response.json(); // parses JSON response into native JavaScript objects
  }

  const getRequest = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/verify/kycdone/' + kycSession)
      const data = await response.json()
      console.log('Data:', data.data.jwt)
      setQrcode(data.data.jwt)
    } catch(e) {
      console.log('Response',e)
      setQrcode(undefined)
    }
  }

  const style = {
		height: "24px",
		width: "24px",
    color: "red"
	};

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <LoadingModal open={loading}/>
        <div className={styles.grid}>
          <div className={styles.head}>
              <img src={logo.src} alt="mina logo"/>
              <h1>Like Cash PoC</h1>
          </div>
          <div className={styles.message}>
            {
              message.show && 
              <>
                <div className={styles.msgContainer}>
                  <img src={message.type === "error" ? error.src : successo.src} />
                  <p>{message.msg}</p>
                </div>
                {pending>0 ?
                <div className={styles.trials}> 
                  <CircularProgress size={30}/>
                  <div >{pending} trials</div>
                </div>
                : null}
              </>
            }
          </div>
              { balanceA?
              <Wallet walletName="clientA" balance={balanceA}/>
              : null }
            { balanceB?
              <Wallet walletName="clientB"  balance={balanceB}/>
              : null }

        
          {success ? <Success setSuccess={setSuccess}/> :
          <>
           <div className={styles.block}>
              <h3>How much do you want to send?</h3>
              <TextField 
                InputProps={{
                  endAdornment: 
                  <InputAdornment position="end" >
                    <img src={minaSymbol.src} alt="mina icon"/>
                  </InputAdornment>,
                }}
                className={styles.money}
                name="amount"
                type="text"
                onChange={(e) => setAmount(e.target.value)}
                sx={{width: "100%", color: "black"}}
                label="You send"
              />
                {!open && <Button 
                  onClick={() => sendTransactionFull()} 
                  className={styles.send}
                >
                  Send
                </Button>}
          </div>
          {
            open && 
            <div className={styles.qrcodeModal}>
              <div className={styles.modalHead}>
                <h3>You need KYC to continue</h3>
                <div onClick={()=>setOpen(false)}>
                  <img src={closeIcon.src} />
                </div>
              </div>
              {
                kyc ? 
                <p>
                  Scan it with your App to start the KYC process.
                </p>
                :
                <p>Scan the QR Code with your App if you have already the KYC credential stored.</p>
              }
                <div>
                {qrcode ?
                  <QRCodeSVG value={qrcode} size={340} className={styles.qrcode}/>
                  : 
                  <div className={styles.loadingContainer}>
                    <Lottie
                      animationData={loadingGray}
                      loop={true}
                      autoplay={true}
                      style={style}
                    />
                  </div>
                }
                </div>
               {!kyc && 
               <>
                <p>You don’t have it yet?</p>
               <Button className={styles.send} onClick={()=>{setKyc(true)}}>GET KYC REQUEST</Button>
               </>
               }
            </div>
          }
          </>
        }
      </div>

      </main>
    </>
  )
}
