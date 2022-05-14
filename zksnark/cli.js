#!/usr/bin/env node

const { getmsg, postmsg } = require("./src/utils.js");
const api = require("./api")

process.stdin.resume();
process.stdin.setEncoding('utf8');

(async ()=>{
  const {rpc, params} = await getmsg();
  if (rpc in api) {
    postmsg(await api[rpc](...params));
  } else throw (`Bad rpc call: ${rpc}`);
  process.exit();
})();


