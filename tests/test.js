const { broadcast, waitForTx, invokeScript } = require("@waves/waves-transactions");
const { address, publicKey, base58encode, base58Decode } = require("@waves/waves-crypto");
const {serializeMessage} = require("../zcrypto/src/utils");
const assert = require("assert");

const env = process.env;
if (env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const ANONYMITY_SET = 8


const rpc = env.WAVES_RPC;
const chainId = env.WAVES_CHAINID;
const dAppPublicKey = env.DAPP;
const dApp = address({publicKey:dAppPublicKey}, chainId);
const testSeed = env.MNEMONIC_TEST;
const testPublicKey = publicKey(testSeed);
const testAsset = "9VkU45BEvYkE7ka7ZXddc4JSWNysT9NgtjjorL2sWNSt" // test-asset on stagenet


// seed is required for deposit tx
const depositJSONTx = '{"dApp":"3Ma1Q2MsjGoVJjaGEf9Y26C8ojnRjun2m8W","chainId":"S","payment":[{"amount":10000000,"assetId":null}],"call":{"function":"deposit","args":[{"type":"binary","value":"Khsbm4KiiSVa/6Rbi8jIsIxvwthZUke1aFYB65tOQ+ePZzqTfDDMTA3eatMSBjftWZOpuuiaHvsV0+aBjo614xiQ0v6GZvXqdcR4pJ5jvwDnL7iyJU3wVbSKjpG94jgliJJHc4OaFFH+t0DbHjxqDkPMhrD7KlMpbhi3UnagcfA="},{"type":"binary","value":"LCiWKPDPsB+29GUvdU+QektH5nCW07I0OL/lCDWpG+4="},{"type":"binary","value":"JlhpDj6RjQl1/FDfqnzF9BahOBAlCvTdY+6UFMmrXawehmsH3woHtNYAfGYbAn8HdU8x8g3TCEnSxDcq+XIaPgEqpGYVoBucd/bE/fQvX6+jn4B8K3OwycTKn6WoEzLyKaP04h83tP52v+9opGMRA2a/60gU9M4jcGY2g5DTxYESMTXklQJ+H/hppfLLIEIpVtwtsuJo0kxDXaaqTYoGIw=="}]},"fee":900000}'
const withdrawalJSONTx = '{"dApp":"3Ma1Q2MsjGoVJjaGEf9Y26C8ojnRjun2m8W","senderPublicKey":"CvKjq7UNkBCm84SWghatFi1iuq5ihs9EZ2H2ipUx3oNi","chainId":"S","call":{"function":"withdrawal","args":[{"type":"binary","value":"C0lQp+KWwi0x5hijdweZL3p2EYufo9ogpWPeI1yxbs8jE9mZjCiQyHBeOsr05XK6zzKcUg6kAcGHoeeYr4x1/AbtAiS1NO9UNfpkIlPCmFo3J/3vsnzo+7OT1TStlevVlCwsu2a/mx5pFIop58KAjAIqMA/XZlYA2omm3naWFRo="},{"type":"binary","value":"KNVywFPfU8Jm2JO8UcuFbb69lgRCeQdk5V4MjqkSbkIKbRhkHUMmlkzMTEpL6diOf+C9b+XYYpp31Ppj6c+mUgIVF81QniW5duhaZtxnphH9WXAzynZUj/phab2Sf4hUI4vPJ4OtlgRmGVE1TTHI9c5dLjO/DAyiGRf/57mvVpgXOnK8eezoqZCC/TR8Q68WJxm1STGsG3pqWRmC/Xw4mhXBtLmkBVn7TdnOucZnIxKBbE5bFRDyFJFR2ouExVoSGsw1JouFAMfxk20ZQDAHTEmgLHfnLhomVsC7lWlRd6ArGgxZIqOX/516lO2kgtkK/SmVSKFdlXdGSnyLbWBc2h+0lZr/3DzPohhluciieDoAnJY1x1+1QYRGQF7WAxo4AAAAAAAAAVNxq/2gY3uwL0vD+aeUbUa75i85yywbakkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKZSIA=="}]},"fee":900000}'
const transferJSONTx = '{"dApp":"3Ma1Q2MsjGoVJjaGEf9Y26C8ojnRjun2m8W","senderPublicKey":"CvKjq7UNkBCm84SWghatFi1iuq5ihs9EZ2H2ipUx3oNi","chainId":"S","call":{"function":"transfer","args":[{"type":"binary","value":"APd1sohD1JrapCRzmkt/v8iYUiMQpF/CZuk0tNX2E22FtFfxzYfWWGj6GA6RZ7bEA33I+1PsmEM8cTOL8DIhVQGZkeTcU7wqF5AXMDA9Fvw/MdtPX/YL4pzUuxEfTZFOLr/wppmT0Jv1DhVz6ErCSS5daurFZZpG9TdPgsta8SI="},{"type":"binary","value":"BlVGYP57Hv3JnyWf+6ODu4ccqV+30lOSzDtUtOtll1MTRlmxvNMrNH1x1FnAx3ZIuBxp8AEHrnSVE/g6Gaheogad3FqevKcbubKNn0VoUVkcaSoOammerY2dEKsrNT8hHCU2HAe+eimADujsAUN6mj+0SyEEsXwOZk1TTJQFxXUeBCVl84EbHquLeehnBmkXDXfvfSn7fAHmCUgkhI9BCyVy3mqW809ZWUPIf2tAaGfrhTeyBloOB/gxn3S3rLsPI4vPJ4OtlgRmGVE1TTHI9c5dLjO/DAyiGRf/57mvVpgVwbS5pAVZ+03ZzrnGZyMSgWxOWxUQ8hSRUdqLhMVaEh+0lZr/3DzPohhluciieDoAnJY1x1+1QYRGQF7WAxo4AI1ukKXpV+EnnEFVZzFr6DwvcS7awAmFmmJbKgXw1SgWPXYP+yT1aJP/rSq/UuJYxpBS3xmjLTJvI8JXaU/sZxVWIVKfHSgHsri8csQrl0MjZzaWG4nGhzO+RqIArPfa"},{"type":"binary","value":"L9zvmciibQ9f/BqvIqJRfzDG1QxMHyE0DATaYYcTR2kZvkwjLfuoXvYU3zfFwqn+LqOq50Z8+2OjWtgjsV7jsS3t09/sVPYsUYt9ucvGQA88W9kzNQiC9fNoa0ostgh5DaNsl+1/Unsv6NW3I/JvvJwmWbBH4QWkMN2+dUYJud0n6a4QRpU38ZJGt920s7LczWOmL0a9XjjNKgDp4gvPjA=="},{"type":"binary","value":"KZdbNwwsYI458BrT1EB8xjxveQr9CnuGqpligACFyJ8lB2HBra+s/rZeFZqKgeuha7TRZVFMdgrLA/u1MmPpcABis/BVV3Odif5eA5kTnyUt+rq4GYKEk/GMhC94dWWyF1wb7AeBVpemfNqdaXbvVAIoNx6oMbGKBtQdxvDRjDwCt1A/noVx1VzWDllZkjRmXRf14s9ilGJ1vsQZF8PyeQ=="}]},"fee":900000}'


async function invokeAndWaitTx(rpc, txData, seed) {
  txData.chainId = chainId;
  txData.dApp = dApp;
  const tx = invokeScript(txData, seed);
  await broadcast(tx, rpc);
  await waitForTx(tx.id, { apiBase: rpc });
}

describe("Integration", () => {
  const defaultTimeout = "60s";


  describe('deposit negative tests', () => {
    let depositTxData;

    beforeEach(() => {
      depositTxData = JSON.parse(depositJSONTx);
    });

    it('insufficient balance', async () => {
      depositTxData.payment[0].amount = 900000;
      await assert.rejects(async () => await invokeAndWaitTx(rpc, depositTxData, testSeed), {
        error: 306,
        message: "Error while executing account-script: wrong proof",
      });
    });

    it('extra balance', async () => {
      depositTxData.payment[0].amount = 90000000;
      await assert.rejects(async () => await invokeAndWaitTx(rpc, depositTxData, testSeed), {
        error: 306,
        message: "Error while executing account-script: wrong proof",
      });
    });

    it('extra payment', async () => {
      depositTxData.payment.push({ amount:10000000, assetId: "WAVES" });
      await assert.rejects(async () => await invokeAndWaitTx(rpc, depositTxData, testSeed), {
        error: 306,
        message: "Error while executing account-script: accept only one payment",
      });
    });

    it('payment in "test-asset"', async () => {
      depositTxData.payment = [{ amount:100, assetId: testAsset }]
      await assert.rejects(async () => await invokeAndWaitTx(rpc, depositTxData, testSeed), {
        error: 306,
        message: "Error while executing account-script: can hodl waves only at the moment",
      });
    });

    it('changed proof', async () => {
      depositTxData.call.args[0].value = Buffer.from(depositTxData.call.args[0].value, "base64")
          .sort(() => Math.random() - 0.5)
          .toString("base64");
      await assert.rejects(async () => await invokeAndWaitTx(rpc, depositTxData, testSeed), {
        error: 306,
        message: "Error while executing account-script: wrong proof",
      });
    });

    it('changed scheme inputs', async () => {
      depositTxData.call.args[1].value = Buffer.from(depositTxData.call.args[1].value, "base64")
          .sort(() => Math.random() - 0.5)
          .toString("base64");
      await assert.rejects(async () => await invokeAndWaitTx(rpc, depositTxData, testSeed), {
        error: 306,
        message: "Error while executing account-script: wrong proof",
      });
    });

    it('existing utxo', async () => {
      // this is "8kKs524A1HfGNERnLESGueVydKBRAKwfkXfuRcxuVtTR" tx on stagenet
      const existedDepositTxJSON = '{"dApp":"3Ma1Q2MsjGoVJjaGEf9Y26C8ojnRjun2m8W","chainId":"S","fee":900000,"payment":[{"amount":10000000,"assetId":null}],"call":{"function":"deposit","args":[{"type":"binary","value":"Jpwgtlm0HZ4LgeJ9dgZ5j36mGoTB1JXfjy70cOdwvkCQh+xWaqiTvRYj5hfCaeb4WK9zgMdNKpbpqzJh9PqNfhVeKPFTCfrx2m8YCXf/Uzrk4ozEZywBwlllZKcnHqOvk3W5HirFxXVdcl7ow5zZPXugxQc/z1Lv3PoYjreNJMA="},{"type":"binary","value":"K/GV0o+ZYeOht6Cby+uyZSc6OWUXA/idfx2FzTgGfXA="},{"type":"binary","value":"Iw4QlwA2WiM+bn3TrIfTmaou98g+Q9W9Nx4EZ003/WIeuykFOFM364FXAMpEthzsHEQqkBm/Z4Rf2A+7yDlYxxK4rjvFAjfy4NeCKiclaRAxQncdSgEY9rY+/WTVKnszEhjVIIgrL/qHI3ygzqxQcjMPNYpjhNOheVQJmCZw658YyYOGMwN1WPdWKXmhHRAHa8dtY1L6fTmHW7z2CHjiPw=="}]}}'
      const existedDepositTxData = JSON.parse(existedDepositTxJSON);
      await assert.rejects(async () => await invokeAndWaitTx(rpc, existedDepositTxData, testSeed), {
        error: 306,
        message: "Error while executing account-script: utxo already exists",
      });
    });

  }).timeout(defaultTimeout);


  describe('withdrawal negative tests', () => {
    let withdrawalTxData;

    beforeEach(() => {
      withdrawalTxData = JSON.parse(withdrawalJSONTx);
    });

    it('wrong caller', async () => {
      withdrawalTxData.senderPublicKey = testPublicKey
      await assert.rejects(async () => await invokeAndWaitTx(rpc, withdrawalTxData, testSeed), {
        error: 306,
        message: "Error while executing account-script: wrong caller",
      });
    });

    it('doublespend', async () => {
      // this is "Cey4sxmNdUaMXKkjr4mY2y2mzuENYVYhRxgzk2bSJLRu" tx on stagenet
      const existedWithdrawalTxJSON = '{"dApp":"3Ma1Q2MsjGoVJjaGEf9Y26C8ojnRjun2m8W","senderPublicKey":"CvKjq7UNkBCm84SWghatFi1iuq5ihs9EZ2H2ipUx3oNi","chainId":"S","call":{"function":"withdrawal","args":[{"type":"binary","value":"jvhLO70Ms9PvjvPS+Dh9hKtyBUX7lOjfvNSL2Lh+9j2rL4LVoehkP7nFL+37qcQ4Rd7FiLGuZN0uR7gmvmfgYh8KqkWsdbfEuKjkMZSPWQNcmSlrkDfdpTT2DGZIa5rrmmnek6OW6KZiB7JCskUEvL0jXN1DG4v98ivjcfak/fg="},{"type":"binary","value":"KxoMWSKjl/+depTtpILZCv0plUihXZV3Rkp8i21gXNoJ/WnnOR0/r3k3oXDoPaj7h18ugywiF2VSSAZ65tb1VQt77vqMQTixlx4q4FHIlL1twyctrOnlzwqevrTIonBYGVnPfSGz+t9i5SuOj/0XAW3duV/DQJemF38BZ3MV/FsJ/WnnOR0/r3k3oXDoPaj7h18ugywiF2VSSAZ65tb1VQcEMK5PK5nvEDVJMxoJGwUMzN5ORrcVXKjKLA7AVsULAhUXzVCeJbl26Fpm3GemEf1ZcDPKdlSP+mFpvZJ/iFQJ/WnnOR0/r3k3oXDoPaj7h18ugywiF2VSSAZ65tb1VR6POEMx+oWIS59nGHpOu/CmU2jKlU97azWLb7PjYQ1hAAAAAAAAAVNxq/2gY3uwL0vD+aeUbUa75i85yywbakkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKZSIA=="}]},"fee":900000}'
      const existedWithdrawalTxData = JSON.parse(existedWithdrawalTxJSON);
      await assert.rejects(async () => await invokeAndWaitTx(rpc, existedWithdrawalTxData), {
        error: 306,
        message: "Error while executing account-script: doublespend detected",
      });
    });

    it('changed proof', async () => {
      withdrawalTxData.call.args[0].value = Buffer.from(withdrawalTxData.call.args[0].value, "base64")
          .sort(() => Math.random() - 0.5)
          .toString("base64");
      await assert.rejects(async () => await invokeAndWaitTx(rpc, withdrawalTxData), {
        error: 306,
        message: "Error while executing account-script: wrong proof",
      });
    });

    it('input UTXO does not exist', async () => {
      const originalInputs = withdrawalTxData.call.args[1].value;
      for (let i = 0; i < ANONYMITY_SET; i++) {
        const inputs = Buffer.from(originalInputs, "base64");
        inputs.slice(32*i, 32*(i+1)).sort(() => Math.random());
        withdrawalTxData.call.args[1].value = inputs.toString("base64");
        await assert.rejects(async () => await invokeAndWaitTx(rpc, withdrawalTxData), {
          error: 306,
          message: "Error while executing account-script: input utxo not exists",
        });
      }
    });

    it('insufficient balance', async () => {
      const inputs = Buffer.from(withdrawalTxData.call.args[1].value, "base64");
      const newBalance = withdrawalTxData.fee - 1;
      inputs.writeUInt32BE(newBalance,320+8*3+4); // + 4 because ride has 64-bytes numbers
      withdrawalTxData.call.args[1].value = inputs.toString("base64");
      await assert.rejects(async () => await invokeAndWaitTx(rpc, withdrawalTxData), {
        error: 306,
        message: "Error while executing account-script: balance must be more then fee",
      });
    });

    it('changed receiver', async () => {
      const inputs = Buffer.from(withdrawalTxData.call.args[1].value, "base64");
      const testAccount = base58Decode(address(testSeed, chainId));
      testAccount.sort(() => Math.random() - 0.5);
      // receiverAccount = inputs[294:320]
      inputs.write(Buffer.from(testAccount).toString("base64"), 294, "base64");
      withdrawalTxData.call.args[1].value = inputs.toString("base64");
      await assert.rejects(async () => await invokeAndWaitTx(rpc, withdrawalTxData), {
        error: 306,
        message: "Error while executing account-script: wrong proof",
      });
    });

  }).timeout(defaultTimeout);


  describe('transfer negative tests', () => {
    // this is "9exM13L4BWY5t8AR71ZDMzuLwdEiScGwHmHmHMvoid67" tx on stagenet
    const existedTransferTxJSON = '{"dApp":"3Ma1Q2MsjGoVJjaGEf9Y26C8ojnRjun2m8W","senderPublicKey":"CvKjq7UNkBCm84SWghatFi1iuq5ihs9EZ2H2ipUx3oNi","chainId":"S","fee":900000,"call":{"function":"transfer","args":[{"type":"binary","value":"I6dTaBWolPkJYa/PSab5Rbq1oBbtH/+UA4oUZXicMoiMCChuec6/1H0qKBjVenlKZw3XzLOcp5YZTy573Sshay6gNYAgbz0G+CWNTlrsMLWWn/3qX7QrYy7VycdlveGohghZmxwadOMxVk4nj5YY7YIh8S+ddN9nEX3PNZJwL+c="},{"type":"binary","value":"HIZFfOWvRbJRHet7JVzIQhCcLqHN82SbEelK1HWaVtwnV+CTWAMwPpXE72DMBJhNycRaJm0NTDQrC5QMl90fyQn9aec5HT+veTehcOg9qPuHXy6DLCIXZVJIBnrm1vVVER7/u0a+9myNhbzIw9DBQgdgvGXlpyRRr1sKTxT8/PgCL8WhU30BQmlI0FiT02ek+YoQpdPSaxBHW4Ij0TTibg7um0bYSG752PWB6STczjhruryyzyh7y/Zx5Wl+18c0AqYAUMUtFEnh9R6ErX5rURIggpzh49iPy6KXkBQe81ou8S07Oppvaw2ZULmCf8Dd9LVkm/U2UI5alKjSPNQrGgdxV26iwp+OXAj4/af0mdItgpBJ/dnYZ+SQbXgCHOYmJvB3VdXqbfDPOVmAUpGs/GvMTtMyBW6udVnjMtbHMNUo1XLAU99TwmbYk7xRy4Vtvr2WBEJ5B2TlXgyOqRJuQhc6crx57OipkIL9NHxDrxYnGbVJMawbempZGYL9fDia"},{"type":"binary","value":"It24cATIez9gj4TgzjAIui00updvvu6VVkgyBBSoHL0bIyZOJ4LtTGIrlpp3c6Ll8NAhCAOdXHCL4ZnA8niwOS2JB21inzku8lrWhg9h7rEXPvXvlNOWWvSC81QqP19NDcxtvRdKXTOFxo1axqhMNuIOge2aoEq5UT+ndISD8YoqIlFYG8u7ZNiO6eOJ8U3yHKbz2MxL7hk+Zvb3vioDAQ=="},{"type":"binary","value":"CqBtn3KCoCwgXsLyHTsMMipj3kDpBZSOdPsp3txThBIqIEW2Tp5SRrha7h6g+z9Ta+qZB11X+5XBnQFdgoI12xUhzFimblL8w73St+DXaplNXdIfIlDwxZnaJvXP1zF5Fsm7qxQm09GeIANbdWAj+2tMNypV6uxiGdjo5ahF6t0LfPY5MFcMmEp7hKe+uR05faRNE/LfM5DaB8LfghZlLA=="}]}}'
    let transferTxData;

    beforeEach(() => {
      transferTxData = JSON.parse(transferJSONTx);
    });

    it('wrong caller', async () => {
      transferTxData.senderPublicKey = testPublicKey
      await assert.rejects(async () => await invokeAndWaitTx(rpc, transferTxData, testSeed), {
        error: 306,
        message: "Error while executing account-script: wrong caller",
      });
    });

    it('doublespend second UTXO', async () => {
      // this is "Cey4sxmNdUaMXKkjr4mY2y2mzuENYVYhRxgzk2bSJLRu" tx on stagenet
      const existedTransferTxData = JSON.parse(existedTransferTxJSON);
      const inputs = Buffer.from(existedTransferTxData.call.args[1].value, "base64");
      // replace first nullifier to new random nullifier which doesn't exist
      inputs.slice(256, 288).sort(() => Math.random() - 0.5);
      existedTransferTxData.call.args[1].value = inputs.toString("base64");

      await assert.rejects(async () => await invokeAndWaitTx(rpc, existedTransferTxData), {
        error: 306,
        message: "Error while executing account-script: doublespend detected",
      });
    });

    it('doublespend first UTXO', async () => {
      // this is "Cey4sxmNdUaMXKkjr4mY2y2mzuENYVYhRxgzk2bSJLRu" tx on stagenet
      const existedTransferTxData = JSON.parse(existedTransferTxJSON);
      const inputs = Buffer.from(existedTransferTxData.call.args[1].value, "base64");
      // replace second nullifier to new random nullifier which doesn't exist
      inputs.slice(288, 320).sort(() => Math.random() - 0.5);
      existedTransferTxData.call.args[1].value = inputs.toString("base64");

      await assert.rejects(async () => await invokeAndWaitTx(rpc, existedTransferTxData), {
        error: 306,
        message: "Error while executing account-script: doublespend detected",
      });
    });

    it('input UTXO does not exist', async () => {
      const originalInputs = transferTxData.call.args[1].value;
      for (let i = 0; i < ANONYMITY_SET; i++) {
        const inputs = Buffer.from(originalInputs, "base64");
        inputs.slice(32*i, 32*(i+1)).sort(() => Math.random());
        transferTxData.call.args[1].value = inputs.toString("base64");
        await assert.rejects(async () => await invokeAndWaitTx(rpc, transferTxData), {
          error: 306,
          message: "Error while executing account-script: input utxo not exists",
        });
      }
    });

  }).timeout(defaultTimeout);

});
