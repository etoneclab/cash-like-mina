import { Kyced } from './Kyced.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  fetchAccount,
  UInt64,
} from 'snarkyjs';
import { processBase, processSend } from './prepare.js';
import { fetchMissingData } from 'snarkyjs/dist/node/lib/fetch.js';
import { sendTransaction } from './utils.js';

  await isReady;

  let pk = PrivateKey.fromBase58('EKFC3bAPEbW9J53DH1VaDzdBPanBYNSm121jSzH9RHET7GcagXRo')
  console.log(pk.toPublicKey().toBase58())
  shutdown()