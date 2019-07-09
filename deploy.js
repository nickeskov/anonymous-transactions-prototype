const { compile } = require("@waves/ride-js");
const { broadcast, waitForTx, setScript } = require("@waves/waves-transactions");

const fs = require("fs");

const env = process.env;
if (env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const seed = env.MNEMONIC;
const rpc = env.WAVES_RPC;
const chainId = env.WAVES_CHAINID;

const data = fs.readFileSync("ride/zwaves.ride", "utf8");
const compiled = compile(data);



async function main() {
  const tx = setScript({ script: compiled.result.base64, fee: 1400000, chainId: 'D' }, seed);
  await broadcast(tx, rpc);
  await waitForTx(tx.id, { apiBase: rpc });
  process.exit();
}

main();