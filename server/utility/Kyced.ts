import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  PublicKey,
  Signature,
  PrivateKey,
  AccountUpdate,
  UInt64,
} from 'snarkyjs';

// The public key of our trusted data provider
const KYC_PUBLIC_KEY =
  'B62qpznUViEYBzpWas51mDyH8kAKhR7x26fih44BwXjXCkyMpe3eAvn';

const MAX_AMOUNT = 500

export class Kyced extends SmartContract {
  // Define contract state
  @state(PublicKey) kycPublicKey = State<PublicKey>();

  // Define contract events
  events = {
    verified: Field,
  };

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      send: Permissions.proofOrSignature(),
      receive: Permissions.proofOrSignature()
    });
  }

  @method init(zkappKey: PrivateKey) {
    super.init(zkappKey);
    // Initialize contract state
    this.kycPublicKey.set(PublicKey.fromBase58(KYC_PUBLIC_KEY));
    // Specify that caller should include signature with tx instead of proof
    this.requireSignature();
  }

  @method depositkyc(
    from: PublicKey, 
    to: PublicKey, 
    amount:Field, 
    signature: Signature, 
    session: Field,
    kycVerification: Signature,
    oracle: PublicKey) {

    const fromField = from.toFields()
    const toField = to.toFields()
      
    this.kycPublicKey.assertEquals(oracle);
    // Evaluate whether the signature is valid for the provided data
    const kycDone = kycVerification.verify(oracle, [fromField[0], Field(1)]);
    // Check that the kycc signature is valid
    kycDone.assertTrue('0x0001');
   
    // Check payment signature to match values...
    const validSignature = signature.verify(from, [fromField[0], toField[0], amount, session]);
    validSignature.assertTrue('0x0002');

    // Create account update
    const accountUpdate = AccountUpdate.create(from);

    // Deposit amount into the escrow
    accountUpdate.balance.subInPlace(new UInt64(amount));
    this.balance.addInPlace(new UInt64(amount));
    accountUpdate.requireSignature();
  }

  @method deposit(from: PublicKey, 
    to: PublicKey, 
    amount:Field, 
    signature: Signature, 
    session: Field) {
    
    const fromField = from.toFields()
    const toField = to.toFields()

    amount.assertLte(MAX_AMOUNT, '0x0001')

    // Check signature to match values...
    const validSignature = signature.verify(from, [fromField[0], toField[0], amount, session]);
    validSignature.assertTrue('0x0002');

    // Create account update
    const accountUpdate = AccountUpdate.create(from);

    // Deposit amount into the escrow
    accountUpdate.balance.subInPlace(new UInt64(amount));
    this.balance.addInPlace(new UInt64(amount));
    accountUpdate.requireSignature();
  }

  @method forward(from: PublicKey, 
    to: PublicKey, 
    amount:Field, 
    signature: Signature, 
    session: Field) {
      
    const fromField = from.toFields()
    const toField = to.toFields()

    // Check signature to match values...
    const validSignature = signature.verify(to, [fromField[0], toField[0], amount, session]);
    validSignature.assertTrue('0x0001');

    // Send the amount agreed
    this.send({to, amount: new UInt64(amount)})
  }

}
