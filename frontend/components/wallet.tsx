import { Divider } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  isReady,
  PrivateKey
} from 'snarkyjs';
import styles from '../styles/Home.module.css'

import viewIcon from '../assets/view.svg'
import minaSymbol from '../assets/mina-symbol.svg'

interface Props {
  walletName: string
  balance: string
}

interface WalletInfo {
  private?: string
  public?: string
}


function Wallet(props:Props) {
  const [keys, setKeys] = useState({} as WalletInfo)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState(props.balance)
  useEffect(() => {
    const k = localStorage.getItem(props.walletName)
    console.log(k)
    setName(props.walletName)
    if (k) {
      setKeys(JSON.parse(k))
    } else {
      isReady.then(e => {
        const pk = PrivateKey.random();
        const k = {private: pk.toBase58(), public: pk.toPublicKey().toBase58()}
        setKeys(k)
        localStorage.setItem(props.walletName, JSON.stringify(k))
      })
    }
  },[])

  useEffect(() => {
    setBalance(props.balance)
  }, [props.balance])

  return (
    <div className={`${styles.wallet} ${props.walletName === "clientA" ? styles.walletDarkBorder : styles.walletLightBorder}`}>
      {
        keys?
        <>
          <p className={styles.walletOverline}>{props.walletName === "clientA" ? "FROM" : "RECIPIENT"}</p>
          <div className={styles.header}>
            <h3>{name}</h3>
            <div className={styles.keyContainer}>Public Key: 
              <span className={styles.key}>
                {keys.public?.substring(0,5)}...{keys.public?.substring(keys.public?.length-5)}
              </span>
              <img src={viewIcon.src} alt="eye icon" />
            </div>
          </div>
          <Divider />
          <div className={styles.balance}>
              <p>Current Balance</p>
              <div className={styles.balanceValue}>
                <p>{balance}</p>      
                <img src={minaSymbol.src} alt="min icon" />
              </div>
          </div>
          </>
        : null

      }
     
    </div>
  );
}

export default Wallet;
