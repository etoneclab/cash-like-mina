import { Button } from '@mui/material';

import styles from '../styles/Success.module.css'

import success from '../assets/send-minas.png'

interface Props {
    setSuccess: (arg: boolean) => void
}


function Success(props:Props) {
  
  return (
    <div className={styles.container}>
        <img src={success.src} alt="globe icon with arrows indicating rotation" />
        <p>Operation Completed Successfully</p>
        <Button onClick={()=>props.setSuccess(false)} className={styles.send}>
            SEND ANOTHER AMOUNT
        </Button>
    </div>
  );
}

export default Success;
