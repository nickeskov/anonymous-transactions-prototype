const version = require("./package").version;
const { address, base58Encode } = require("@waves/waves-crypto");
const { serializeVK, serializeProof, serializeInputs, fload, proof, createUtxo, getDepositInputs, stringifyBigInts,
    createTransfer, createWithdrawal, getTransferInputs, getWithdrawalInputs } = require("./src/utils.js");



const api = {
    serializeVK: circuit=>base58Encode(serializeVK(fload(circuit))),
    utxoCompute: msg=>createUtxo(msg),
    utxoComputeMany: msg => msg.map(createUtxo),
    depositProof: async utxo => {
        const inputs = getDepositInputs(utxo);
        const proofData = await proof(inputs, 'Deposit');
        // cut balance part
        // we append this part on-chain because we need leading zeroes
        // proofData.publicSignals == [ hashSignal, balanceSignal]
        const pubSignals = proofData.publicSignals.slice(0, -1)
        // pubSignals == [ hashSignal ]
        const serializedInputs = serializeInputs(pubSignals)
        return {
            proof:serializeProof(proofData.proof).toString("base64"),
            inputs:serializedInputs.toString("base64")
        }
    },
    withdrawalProof: async withdrawal => {
        const inputs  = getWithdrawalInputs(withdrawal)
        const proofData = await proof(inputs, 'Withdrawal');
        return {
            proof:serializeProof(proofData.proof).toString("base64"),
            inputs:serializeInputs(proofData.publicSignals).toString("base64")
        }
    },
    transferProof: async transfer => {
        const inputs  = getTransferInputs(transfer)
        const proofData = await proof(inputs, 'Transfer');
        return {
            proof:serializeProof(proofData.proof).toString("base64"),
            inputs:serializeInputs(proofData.publicSignals).toString("base64")
        }
    }

}

module.exports = api
