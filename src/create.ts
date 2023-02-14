import { isReady, PrivateKey, Field, Signature } from 'snarkyjs';

export async function doit() {
  // We need to wait for SnarkyJS to finish loading before we can do anything
  await isReady;

  let k = PrivateKey.random();
  console.log('Priv: ', k.toBase58(), 'Pub: ', k.toPublicKey().toBase58())
}

doit()