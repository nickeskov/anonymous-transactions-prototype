const { broadcast, waitForTx, invokeScript } = require("@waves/waves-transactions");
const { address, publicKey, base58encode } = require("@waves/waves-crypto");
const {serializeMessage} = require("../zcrypto/src/utils");
const assert = require("assert");

const env = process.env;
if (env.NODE_ENV !== 'production') {
  require('dotenv').load();
}


const rpc = env.WAVES_RPC;
const chainId = env.WAVES_CHAINID;
const dAppPublicKey = env.DAPP;
const dApp = address({publicKey:dAppPublicKey}, chainId);
const testSeed = env.MNEMONIC_TEST;
const testPublicKey = publicKey(testSeed)
const testAccount = address(testSeed, chainId)
const testAsset = "9VkU45BEvYkE7ka7ZXddc4JSWNysT9NgtjjorL2sWNSt" // test-asset on stagenet


// seed is required for deposit tx
const depositJSONTx = '{"dApp":"3Ma1Q2MsjGoVJjaGEf9Y26C8ojnRjun2m8W","chainId":"S","payment":[{"amount":10000000,"assetId":null}],"call":{"function":"deposit","args":[{"type":"binary","value":"Khsbm4KiiSVa/6Rbi8jIsIxvwthZUke1aFYB65tOQ+ePZzqTfDDMTA3eatMSBjftWZOpuuiaHvsV0+aBjo614xiQ0v6GZvXqdcR4pJ5jvwDnL7iyJU3wVbSKjpG94jgliJJHc4OaFFH+t0DbHjxqDkPMhrD7KlMpbhi3UnagcfA="},{"type":"binary","value":"LCiWKPDPsB+29GUvdU+QektH5nCW07I0OL/lCDWpG+4="},{"type":"binary","value":"JlhpDj6RjQl1/FDfqnzF9BahOBAlCvTdY+6UFMmrXawehmsH3woHtNYAfGYbAn8HdU8x8g3TCEnSxDcq+XIaPgEqpGYVoBucd/bE/fQvX6+jn4B8K3OwycTKn6WoEzLyKaP04h83tP52v+9opGMRA2a/60gU9M4jcGY2g5DTxYESMTXklQJ+H/hppfLLIEIpVtwtsuJo0kxDXaaqTYoGIw=="}]},"fee":900000}'
const withdrawalJSONTx = '{"dApp":"3Ma1Q2MsjGoVJjaGEf9Y26C8ojnRjun2m8W","senderPublicKey":"CvKjq7UNkBCm84SWghatFi1iuq5ihs9EZ2H2ipUx3oNi","chainId":"S","fee":900000,"call":{"function":"withdrawal","args":[{"type":"binary","value":"CrDalto3/HXghjOm6IFq77zAJTzevxFXpKYUoKvn6voMCRbsmvnEZiMx/7JAcXsUYPiowlceO85/+kZWZUB/VAbp2sFQA8KJEByEDHzgd2mjBhURXQIoH/VwHJIrkjj7rIZ1O6AMbgOh99NAeAVEHIhIOmPEaKu4jDGS+X5Hlhc="},{"type":"binary","value":"LSR+R08MfH4uMa8YWXks82UnKERPIh3QGvHpy3UseWoAtODk3nvYT4B+j5yA11evgL2jLkAleO/qNb15VOzBlg7um0bYSG752PWB6STczjhruryyzyh7y/Zx5Wl+18c0JLJJkZJnSEnqf2z8ieKOTcuZHtqUHGzIPkOi61X44XIWqUUlBHv1q1NWM1Sux7vX4zeswMW60kiPjGxYYhxd7RyGRXzlr0WyUR3reyVcyEIQnC6hzfNkmxHpStR1mlbcER7/u0a+9myNhbzIw9DBQgdgvGXlpyRRr1sKTxT8/Pgr+Cpxnlf//hb3wlWw7a1FyW254xJG80oq3tVBxsiCzhdT4V/Vnz5EyYGLB/HoXL9Crc6im7pB0EQnXiQvx18XAAAAAAAAAVNxq/2gY3uwL0vD+aeUbUa75i85yywbakkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKZSIA=="}]}}'
const transferJSONTx = '{"dApp":"3Ma1Q2MsjGoVJjaGEf9Y26C8ojnRjun2m8W","senderPublicKey":"CvKjq7UNkBCm84SWghatFi1iuq5ihs9EZ2H2ipUx3oNi","chainId":"S","fee":900000,"call":{"function":"transfer","args":[{"type":"binary","value":"LCRZ6FHSvT9LWgfmu3M13IVMPoa5d4pnQy4qXCpE5nqKm0zcT3E/VDdFYoal75m7blMJOsI283k7FcaolbGukSDnRFBK15/GiWhSRWFNpYJB3D86wP0xGnfmlyjzWpBSkcOXoiJv5bqzX/qST+nYkXd4OmokMhAhzOkUV0xkoMY="},{"type":"binary","value":"FqlFJQR79atTVjNUrse71+M3rMDFutJIj4xsWGIcXe0TRlmxvNMrNH1x1FnAx3ZIuBxp8AEHrnSVE/g6GaheohRfU9pPBuijSZK15Bq8d4iHxicyEqVRafeygeLGr/OCEGog2UQYqF6ZdrYjkU5eSvcYTpGZFBDKS4INrHm1Q7cUX1PaTwboo0mSteQavHeIh8YnMhKlUWn3soHixq/zghyGRXzlr0WyUR3reyVcyEIQnC6hzfNkmxHpStR1mlbcJWAA9iZpJxRKXiUHYCGoQOVVtK68NIVIf94k9q7ymVATRlmxvNMrNH1x1FnAx3ZIuBxp8AEHrnSVE/g6GaheohdT4V/Vnz5EyYGLB/HoXL9Crc6im7pB0EQnXiQvx18XJZX6rwl04pzNEnM7jxZ1ECXOSdCG32q4PF1z82DJHusFmTC1myWPXMD3tiMMP21KW74rtQnE07/2SH7XbLm9sBRnp7KjsEdXDD2iYvFUL70wD/gChCooNrX5+G96g2gn"},{"type":"binary","value":"A4GBx1L3Ev3zXyj6FFPeh/ziOJw6ITJnGkntqp/BbxQMNj0GT1DJ9e40OvqACEg/uvJ9olzpMM1hnGaS6/IEqg1KkYQ8j6JejJJHNfk30drPPzGZJt3I2cphkcaVwXWzJPkRvrhzGdlclIYAwRFRaO3uwSfQZrmYg6Y2LJiNiM4mqLsGJf4VI7OaMqn3wwIJ833Z1PCGOGG+u8UXFmCXXg=="},{"type":"binary","value":"GFa7enPhhQuxnmt5D4Q+Fl6AAop4X7WsYVPl7yKukZ0P+DTrxG4Fu4+BXnosEMxhcCWfpZ31uzA9LTf6cSa/TSMXa2rTBmrro1C0CH1fp7ff0x0uoItoxebq5VVYv1fIGkQfTHh5AqrBNtGCAIRe+q52bgm/c2SVqRfJMpvqYvQdYe6/DS0y5fliiR4aVsSL2jh59r0+LSDggQWImPDKSA=="}]}}'


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

  }).timeout(defaultTimeout);

})
