const circomlib = require("circomlib");
const snarkjs = require("snarkjs");
const fs = require("fs");
const {basename} = require("path");
const { groth, Circuit, bigInt } = snarkjs;

const { stringifyBigInts, unstringifyBigInts } = require("snarkjs/src/stringifybigint");

const { buildGroth16 } = require("websnark");
const buildpkey = require("./buildpkey.js");
const buildwitness = require("./buildwitness.js");

const {bn254G1Compressed, bn254G2Compressed} = require("./../../zkgo/js/index.js");
const {toHexString} = require("wasmbuilder/src/utils");

const babyJub = circomlib.babyJub;
const getBasePoint = circomlib.pedersenHash.getBasePoint;

const ANONYMITY_SET=8;

function leIntToBits(n, s) {
  x = n;
  chunks = [];
  for (let i = 0; i < s; i += 32) {
    const limb = Number(x & 0xffffffffn);
    const chunk = [limb & 0xff, limb >> 8 & 0xff, limb >> 16 & 0xff, limb >> 24];
    chunks.push([].concat(...chunk.map(x => [x & 1, x & 2, x & 4, x & 8, x & 16, x & 32, x & 64, x & 128])));
    x >>= 32n;
  }
  return [].concat(...chunks).slice(0, s);
}


function pedersenHash(bits) {
  const windowSize = 4;
  const nWindowsPerSegment = 50;
  const bitsPerSegment = windowSize * nWindowsPerSegment;

  const nSegments = Math.floor((bits.length - 1) / (windowSize * nWindowsPerSegment)) + 1;

  let accP = [bigInt.zero, bigInt.one];

  for (let s = 0; s < nSegments; s++) {
    let nWindows;
    if (s == nSegments - 1) {
      nWindows = Math.floor(((bits.length - (nSegments - 1) * bitsPerSegment) - 1) / windowSize) + 1;
    } else {
      nWindows = nWindowsPerSegment;
    }
    let escalar = bigInt.zero;
    let exp = bigInt.one;
    for (let w = 0; w < nWindows; w++) {
      let o = s * bitsPerSegment + w * windowSize;
      let acc = bigInt.one;
      for (let b = 0; ((b < windowSize - 1) && (o < bits.length)); b++) {
        if (bits[o]) {
          acc = acc.add(bigInt.one.shl(b));
        }
        o++;
      }
      if (o < bits.length) {
        if (bits[o]) {
          acc = acc.neg();
        }
        o++;
      }
      escalar = escalar.add(acc.mul(exp));
      exp = exp.shl(windowSize + 1);
    }

    if (escalar.lesser(bigInt.zero)) {
      escalar = babyJub.subOrder.add(escalar);
    }

    accP = babyJub.addPoint(accP, babyJub.mulPointEscalar(getBasePoint(s), escalar));
  }

  return babyJub.packPoint(accP);
}


function UTXOhasher(utxo) {
  const message = [].concat(leIntToBits(utxo.balance, 64), leIntToBits(utxo.pubkey, 253), leIntToBits(utxo.secret, 253));
  const h = pedersenHash(message);
  const hP = babyJub.unpackPoint(h);
  return hP[0];
}

function hash(v) {
  const b_v = leIntToBits(v, 253);
  return babyJub.unpackPoint(pedersenHash(b_v))[0];
}


function hash253(v) {
  const b_v = leIntToBits(v, 253);
  return babyJub.unpackPoint(pedersenHash(b_v))[0] & ((1n << 253n) - 1n);
}


function compress(v1, v2) {
  const b_v = [].concat(leIntToBits(v1, 253), leIntToBits(v2, 253));
  return babyJub.unpackPoint(pedersenHash(b_v))[0];
}

function compress253(v1, v2) {
  const b_v = [].concat(leIntToBits(v1, 253), leIntToBits(v2, 253));
  return babyJub.unpackPoint(pedersenHash(b_v))[0] & ((1n << 253n) - 1n);
}

function rand256() {
  n = 0n;
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(Math.random() * (1 << 30));
    n = (n << 30n) + BigInt(x);
  }
  return n % (1n << 256n);
}



const fload = f => unstringifyBigInts(JSON.parse(fs.readFileSync(f)))


let wasmgroth = undefined;

async function proof(input, name) {
  if (typeof (wasmgroth) === "undefined") {
    wasmgroth = await buildGroth16();
  }

  const circuit = new Circuit(fload(`${__dirname}/../circuitsCompiled/${name}.json`));
  const pk = fload(`${__dirname}/../circuitsCompiled/${name}_pk.json`);
  const witness = circuit.calculateWitness(input);
  const proof = unstringifyBigInts(await wasmgroth.proof(buildwitness(witness), buildpkey(pk)));
  proof.protocol = "groth";

  // extract all public signals
  const publicSignals = witness.slice(1, circuit.nPubInputs + circuit.nOutputs + 1)

  return { proof, publicSignals: publicSignals };
}

function verify({ proof, publicSignals }, name) {
  const vk = fload(`./circuitsCompiled/${name}_vk.json`);
  return groth.isValid(vk, proof, publicSignals);
}

const g1ToBuffUncompressed = (p) => {
  const g1X = bigInt.beInt2Buff(p[0], 32);
  const g1Y = bigInt.beInt2Buff(p[1], 32);
  const out = Buffer.concat([g1X, g1Y]);
  // console.log(toHexString(out))
  return out
}

const g2ToBuffUncompressed = (p) => {
  const g2X = Buffer.concat([bigInt.beInt2Buff(p[0][1], 32), bigInt.beInt2Buff(p[0][0], 32)]);
  const g2Y = Buffer.concat([bigInt.beInt2Buff(p[1][1], 32), bigInt.beInt2Buff(p[1][0], 32)]);
  const out = Buffer.concat([g2X, g2Y]);
  // console.log(toHexString(out))
  return out
}

const g1ToBuffCompressed = (p) => {
    const g1X = bigInt.beInt2Buff(p[0], 32);
    const g1Y = bigInt.beInt2Buff(p[1], 32);
    const g1Compressed = bn254G1Compressed(g1X, g1Y);
    return Buffer.concat([g1Compressed]);
}

const g2ToBuffCompressed = (p) => {
    const g2X = Buffer.concat([bigInt.beInt2Buff(p[0][1], 32), bigInt.beInt2Buff(p[0][0], 32)]);
    const g2Y = Buffer.concat([bigInt.beInt2Buff(p[1][1], 32), bigInt.beInt2Buff(p[1][0], 32)]);
    const g2Compressed = bn254G2Compressed(g2X, g2Y);
    return Buffer.concat([g2Compressed]);
}

const g1ToBuff = g1ToBuffCompressed;
const g2ToBuff = g2ToBuffCompressed;

const serializeVK = (vk) => Buffer.concat([g1ToBuff(vk.vk_alfa_1), ...[vk.vk_beta_2, vk.vk_gamma_2, vk.vk_delta_2].map(g2ToBuff), ...vk.IC.map(g1ToBuff)]);
const serializeProof = (proof) => Buffer.concat([g1ToBuff(proof.pi_a), g2ToBuff(proof.pi_b), g1ToBuff(proof.pi_c)]);

const serializeVKUncompressed = (vk) => Buffer.concat([g1ToBuffUncompressed(vk.vk_alfa_1), ...[vk.vk_beta_2, vk.vk_gamma_2, vk.vk_delta_2].map(g2ToBuffUncompressed), ...vk.IC.map(g1ToBuffUncompressed)]);
const serializeProofUncompressed = (proof) => Buffer.concat([g1ToBuffUncompressed(proof.pi_a), g2ToBuffUncompressed(proof.pi_b), g1ToBuffUncompressed(proof.pi_c)]);

const serializeInputs = (inputs) => Buffer.concat(inputs.map(x => bigInt.beInt2Buff(x, 32)));


const createUtxo = ({privkey, pubkey, balance, entropy, secret}) => {
  entropy = (typeof(entropy)==="undefined") && (typeof(secret)==="undefined") ? rand256() % (1n<<253n) : entropy;
  pubkey = typeof(pubkey)==="undefined" ?  babyJub.mulPointEscalar(babyJub.Base8, privkey)[0] :pubkey;
  secret = typeof(secret)==="undefined" ?  hash253(entropy) : secret;
  const hash = UTXOhasher({balance, pubkey, secret});
  const nullifier = typeof(privkey)!=="undefined" ? compress(privkey, secret) : undefined;
  return {hash, balance, pubkey, entropy, secret, privkey, nullifier};
};


// const createWithdrawal = ({in_hashes, utxo, receiver, index}) => {
//   const {privkey, balance, secret} = utxo;
//   const nullifier = compress(privkey, secret);
//   return {in_hashes, nullifier, receiver, balance, index, secret, privkey};
// }


// const createTransfer = ({in_hashes, index, in_utxo, out_utxo, entropy}) => {
//   const nullifier = in_utxo.map(x=>compress(x.privkey, x.secret));
//   const in_balance = in_utxo.map(x=>x.balance);
//   const in_secret = in_utxo.map(x=>x.secret);

//   const out_hash = out_utxo.map(x=>UTXOhasher({
//     ...x, 
//     pubkey:  typeof(x.pubkey)!=="undefined" ? x.pubkey: babyJub.mulPointEscalar(babyJub.Base8, x.privkey)[0]
//   }));
//   const out_balance = out_utxo.map(x=>x.balance);
//   const out_pubkey = out_utxo.map(x=>typeof(x.pubkey)!=="undefined" ? x.pubkey: babyJub.mulPointEscalar(babyJub.Base8, x.privkey)[0]);
//   const privkey = in_utxo[0].privkey;
//   entropy = typeof(entropy)!=="undefined" ? entropy : rand256() % (1n<<253n);

//   return {
//     in_hashes,
//     index,
//     nullifier,
//     in_balance,
//     in_secret,
//     out_hash,
//     out_balance,
//     out_entropy,
//     out_pubkey,
//     privkey,
//     entropy
//   }
// }



const getDepositInputs = ({hash, balance, pubkey, entropy}) => ({hash, balance, pubkey, entropy});
const getWithdrawalInputs = ({in_hashes, nullifier, receiver, balance, index, secret, privkey}) => ({in_hashes, nullifier, receiver, balance, index, secret, privkey});
const getTransferInputs = ({in_hashes, index, nullifier, in_balance, in_secret, out_hash, out_balance, out_entropy, out_pubkey, privkey, entropy}) => {
  const inputs = {in_hashes, index, in_balance, in_secret, out_hash, out_balance, out_entropy, out_pubkey, privkey, entropy};
  if (in_hashes[index[0]]!=in_hashes[index[1]])
    return {...inputs, nullifier}
  else
    return {...inputs, nullifier:[nullifier[0], compress(privkey, entropy)]}
}


const getmsg = (stdin)=> new Promise(resolve=>((typeof(stdin)==="undefined")? process.stdin: stdin).on('data', (x)=>resolve(unstringifyBigInts(JSON.parse(x)))));
const postmsg = (msg, stdout)=>((typeof(stdout)==="undefined")?process.stdout: stdout).write(JSON.stringify(stringifyBigInts(msg)));

module.exports = {
  stringifyBigInts,
  unstringifyBigInts,
  UTXOhasher,
  compress253,
  hash,
  hash253,
  compress,
  rand256,
  fload,
  proof,
  verify,
  g1ToBuff,
  g1ToBuffUncompressed,
  g2ToBuff,
  g2ToBuffUncompressed,
  serializeVK,
  serializeVKUncompressed,
  serializeProof,
  serializeProofUncompressed,
  serializeInputs,
  createUtxo,
  getDepositInputs,
  getTransferInputs,
  getWithdrawalInputs,
  getmsg,
  postmsg
};
