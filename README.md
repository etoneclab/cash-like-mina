# MINA ESCROW ANONYMOUS PAYMENT
## _A blockchain payment similar to cash payments, with KYC check for country regulations_

This package is a Proof of Concept built on the Mina ZKP blockchain to execute an anonymous payment between two entities. Given the specific country regulation the PoC has a check on the amount to be sent and if above a certain threshold it will start a KYC check control. 
If you want to know more about Mina and the ZKP SnarkyJS concepts, please visit their website at [Mina](https://minaprotocol.com)
If you want to know more about the project and the concepts behind, please visit etonec GmbH website at [etonec](https://etonec.com)
If you want to know more about Self Sovereign Identity (SSI) and the Juno platfrom from Sideos GmbH, please visit their website at [Sideos](https://sideos.io)

## Features
- Uses the Mina ZKP smart contract to achieve the results. See [ZKP Apps](https://docs.minaprotocol.com/zkapps/how-zkapps-work)
- Uses an escrow account in order to make the trasaction anonymous
- Uses an Oracle in order to confirm the validity of the KYC proof
- Uses a KYC provider, Sideos GmbH, to store the credentials of KYC completed using latest SSI technology

## Notice
This is a PoC, therefore it does only show the ability to achieve such results, however it is discouraged to use this in a production environment. More tests and flow controls needs to be implemented to make it a full functional product.

## Installation

The repository contains a front end and a server to integrate with the Oracle and the KYC provider.
The front end is a NextJS project with SnarkyJS libraries to compile and create the proofs necessary to send to the smart contract.
The server has integration with the Mina blockchain as being the Oracle, and an integration part for KYC credentials.

The server has a .setenv.sh which shall contain the necessary environment variable to successfully run the software. To use the KYC functionality you need to create an account in the Juno platform with Sideos.io, and set your tokens.

```
export PORT=8080
export FEE_PAYER_PRIVATE=EKF36BUdQqZhP8xeCn1oxAK343VihK1xk7jLDrsuD1V9ZphJ53wy
export THIS_SERVER=http://192.168.0.26:8080
export SSI_TOKEN=<Add the SSI TOKEN from Juno>
export SSI_SERVER=https://dev-cloud.sideos.io
export TRUSTED_ISSUER=<Add the trusted issuer DID>
export PRIVATE_KEY=EKFC3bAPEbW9J53DH1VaDzdBPanBYNSm121jSzH9RHET7GcagXRo
```
When the frontend starts it creates automatically two accounts, i.e. two keypairs for the Mina blockchain. If you wish to use the newly created accounts, make sure to fund the two public keys with the Mina Faucet.

The cconfig.txt contains the predefined keys for the PoC, so you may want to use them to facilitate the test. Make sure you change the local storage keys created by the front end with the one in the file. Use the Customer A and the Customer B for this purpose. These accouns in the Berkeley network have been already funded.

```
Deployer smart contract
KeyPair {
  privateKey: 'EKErqbyzp3FhrHVgSkjMF1dqMAB4Ych27VaRvuq51dtqMBTmTj8h',
  publicKey: 'B62qpM66DERiwSiau6Cu4dymh44xo75DAHo866qyMzjJz4MSQT73Wku'
}

Trusted Service

Public Key: B62qpznUViEYBzpWas51mDyH8kAKhR7x26fih44BwXjXCkyMpe3eAvn
Private Key: EKFC3bAPEbW9J53DH1VaDzdBPanBYNSm121jSzH9RHET7GcagXRo

Customer A 
"publicKey":"B62qieMrJYRb5q8x2n1XW4ByiMsjMPstkEamxnvSaCgF4SvZ6puuqxd",
"privateKey":"EKFKK6963RNE3KFj7JxEmt7JML42dqJaBXXfFGER5DWvgRMQ2xSw"

Customer B 
"publicKey":"B62qmTYcTfjRLafqjrUEpboC7JnZd4UJX7mGFeQkVyj1fNnwcMVf4my",
"privateKey":"EKE7CDqtHqi5sM7oSMc2wAuwgqvpcDeJGi7F7wErMuJdMYmYYLo6"

FEE PAYER
Priv:  EKF36BUdQqZhP8xeCn1oxAK343VihK1xk7jLDrsuD1V9ZphJ53wy 
Pub:  B62qqQgFVKFdMFRcT4yHYiK5yHmmTkyvB9LvA8FUyeLvsdHeR9NJ1sq
```

# Run
For the front end run `yarn install` and then `yarn dev` to start the nextJS website.
For the server once you set up all the environment variables, run `yarn install` and then `yarn run server`

You can test the process by sending 1 nanoMina. Type 1 in the amount to send text field, and press the Send button. Now the browser starts compiling the smart contract, and send the proofs to the Mina blockchanin. It is pretty work intensive, and it may take several minutes to complete. The browser may freeze at time depending on your machine.

Once completed you should see the amount taken away from Customer A and added to Customer B.







