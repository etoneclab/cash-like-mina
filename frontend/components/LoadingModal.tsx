import { Dialog } from '@mui/material';
import Lottie from "lottie-react";

import styles from '../styles/LoadingModal.module.css'
import loadingGray from "../assets/loading.json";

interface Props {
    open: boolean,
    message?: string
}


function LoadingModal({open, message = "Loading..."}:Props) {

    const style = {
        height: "40px",
        width: "40px",
    }
  
  return (
    <Dialog open={open} className={styles.dialog}>
        <div className={styles.loadingContainer}>
            <Lottie
                animationData={loadingGray}
                loop={true}
                autoplay={true}
                style={style}
            />
        <p>
            {message}
        </p>
        </div>
    </Dialog>
  );
}

export default LoadingModal;
