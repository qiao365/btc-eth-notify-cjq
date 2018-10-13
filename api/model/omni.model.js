"use strict";
const appUtil = require('./util');
const http = require("https");

const TableDefine = require("../domain/database.define");
const DomainAddress = TableDefine.DomainAddress;
const DomainOmniListener = TableDefine.DomainOmniListener;
const DomainBtcListener = TableDefine.DomainBtcListener;
const Config = require("../domain/bitapp.prepare").CONFIG;
const Omni = require("../utils/OmniClient").Omni;
Omni.init(Config.omni.user, Config.omni.pass, Config.omni.host, Config.omni.port);

var OmniModel = module.exports;

OmniModel.bulkCreateOmniModelAddress = function bulkCreateOmniModelAddress(quantity, usage) {
    var bulk = [];
    for (var index = 0; index < quantity; ++index) {
        bulk.push(generateNewAddressPromise(appUtil.guid()));
    };
    return Promise.all(bulk).then((values) => {
        console.log('生成omni地址：',values.length,JSON.stringify(values));
        let bulkData = values.map((ele) => {
            return {
                address: ele.address,
                bankType: 'BTC',
                status: "ok",
                usage: usage,
                password: ele.password
            };
        });
        return DomainAddress.bulkCreate(bulkData);
    }).then((addressInstanceArray) => {
        return {
            status: "ok",
            addressInstanceArray:addressInstanceArray,
            // sqldata: addressInstanceArray.map((ele) => {
            //     let ej = ele.toJSON();
            //     return `insert into pool_addresses (address, created_at, updated_at,currency,used) values ('${ej.address}', now(), now(),3,0);`;
            // }),
            msg: `generate ${quantity} eth address`,
            quantity:quantity
        };
    });
};

function generateNewAddressPromise(account) {
    return new Promise((resolve, reject) => {
        Omni.getnewaddress(account, function(newAddress){
            resolve({
                address: newAddress,
                password:account
            });
        });
    });
};

OmniModel.listenNotify = function listenNotify(txid){
//   {
//     "txid": "e4080897aecafd2e6b1ece80a122cb7b01a1463fa9d39795af4676f6fb9f5cd6",
//     "fee": "0.00255909",
//     "sendingaddress": "1JYzdJkkNWbdyWYaVQwsncd3wK4LqaSEfE",
//     "referenceaddress": "1DUb2YYbQA1jjaNYzVXLZ7ZioEhLXtbUru",
//     "ismine": false,
//     "version": 0,
//     "type_int": 0,
//     "type": "Simple Send",
//     "propertyid": 31,
//     "divisible": true,
//     "amount": "766.53901050",
//     "valid": true,
//     "blockhash": "0000000000000000007076ba8ceea69f27cf7a2adbf9464b14d60acf7de2cf5b",
//     "blocktime": 1514223222,
//     "positioninblock": 457,
//     "block": 500999,
//     "confirmations": 4156
//   }
return new Promise((resolve, reject)=>{
        Omni.gettransaction(txid, function(error,data){
            if(error){
                console.log('not omni data,to btc listener:',error);
                return btcListener(txid);
            }else{
                console.log("data",JSON.stringify(data));
                if(data.block > 0 && data.propertyid > 0 && data.amount > 0 && data.propertyid == 31){
                // if(data.block > 0 && data.propertyid > 0 && data.amount > 0){// for test
                    let save = {
                        address: data.sendingaddress,
                        bankType: 'USDT',
                        txHash: txid,
                        propertyId:data.propertyid,
                        blockHash: data.blockHash,
                        blockNumber: data.block,
                        txFrom: data.sendingaddress,
                        txTo: data.referenceaddress,
                        txValue: data.amount * 1e10,
                        txInput: data.amount,
                        txDate: new Date(data.blocktime * 1000)
                    };
                    return DomainOmniListener.create(save).then((listenInstance)=>{
                        // console.log("listenInstance",listenInstance);
                        return new Promise((resolve, reject)=>{
                            listenInstance.txHuman = listenInstance.txValue / 1e10;
                            let write = JSON.stringify({
                                bankType: "USDT",
                                password: Config.password,
                                data: [listenInstance]
                            });
                            console.log('omin上传：',write);
                            let option = Object.assign({}, Config.updateOption);
                            option.headers= {
                                'Content-Type': 'application/json',
                                'Content-Length': Buffer.byteLength(write)
                            };
                            let req = http.request(option, (res) => {
                                let data = '';
                                res.setEncoding("utf8");
                                res.on("data", (chunk) => {
                                    data += chunk;
                                });
                                res.on("end", () => {
                                    resolve(data);
                                });
                            });
                            req.on('error', (e) => {
                                reject(e);
                            });
                            req.write(write);
                            req.end();
                        });
                    }).then((requesResult)=>{
                        console.log("omin上传返回：",requesResult);
                        resolve(requesResult);
                    }).catch(err=>{
                        console.log("omin,error:",err);
                        resolve("error");
                    });
                }else{
                    console.log("omin接收到其他币种", JSON.stringify(data));
                    resolve("接收到其他币种");
                }
            }
        });
    });
};

// {
//     "amount": 0.00000000,
//     "fee": -0.00007460,
//     "confirmations": 6,
//     "blockhash": "00000000000008bf0039ffc730ae052cbff952cc9086bc96e78ab7ebbbbc9a0c",
//     "blockindex": 37,
//     "blocktime": 1539240219,
//     "txid": "39e6288718c2774fb311a1ad7c4f9ea6fd5acb95386e0ede639cfe2b500eca74",
//     "walletconflicts": [
//     ],
//     "time": 1539240108,
//     "timereceived": 1539240108,
//     "bip125-replaceable": "no",
//     "details": [
//       {
//         "account": "",
//         "address": "mmqj6vCVAyHDEy3PLB9r5B7uBnQQB46D69",
//         "category": "send",
//         "amount": -0.00100000,
//         "label": "",
//         "vout": 1,
//         "fee": -0.00007460,
//         "abandoned": false
//       }, 
//       {
//         "account": "",
//         "address": "mmqj6vCVAyHDEy3PLB9r5B7uBnQQB46D69",
//         "category": "receive",
//         "amount": 0.00100000,
//         "label": "",
//         "vout": 1
//       }
//     ],
//     "hex": "01000000020cb667bef9d24ef8ff9ccf724bfb70ad818164b61b46bf4641008be96b153dac000000006b483045022100a714122c2f8e3140cdb07f469c45971600614f5f8aa3a88943fbfff1330a156802205f6b30bb8f1dda2d070411a4ef352457a3efe1d7db5fa977cae4a8e335e4ece601210300ccb3b178a06bdb12dc118e5695c9efe03a8ebcdc14a4c461a607d30abc6cb9feffffff0cb667bef9d24ef8ff9ccf724bfb70ad818164b61b46bf4641008be96b153dac010000006a4730440220727f8a4cd2c8bee24087261886529e7718e55880e2ea0bb38370dfd50c3cac5602203121239d1dd460b037045a33982e1235b75dad3368a94d955da401ce69e40972012103810e015dd65c81e4a893ac733ec0ba15086aae5903f3b85e3f87236442502d2bfeffffff02a81c1300000000001976a914270e1d3a8878d2733a0dec6f8b6d68e391e9a71788aca0860100000000001976a914455da55667752137ec64c48f72577685e227860288ac0de81500"
//   }
// omni监听btc
function btcListener(txid){
    return new Promise((resolve, reject)=>{
        Omni.getBtcTransaction(txid, function(error,data){
            if(!error){
                resolve(data);
            }else{
                reject(err);
            };
        });
    }).then((tx)=>{
        if(tx.confirmations > 0){
            let txDataSave = tx.details.map((ele)=>{
                // tx doest not have blockHeight
                if(ele.category == 'send'){
                    return undefined;
                }
                return {
                    address: ele.address,
                    bankType: 'BTC',
                    txHash: tx.txid,
                    blockHash: tx.blockHash,
                    blockNumber: tx.confirmations,
                    txFrom: ele.category == 'send' ? ele.address : '',
                    txTo: ele.category == 'receive' ? ele.address : '',
                    txValue: ele.amount * 1e10,
                    txInput: ele.amount,
                    txIndex: tx.blockindex,
                    txDate: new Date(tx.timereceived * 1000)
                };
            });
            let txDataSaveDb = txDataSave.filter((ele)=> ele);
            return DomainBtcListener.bulkCreate(txDataSaveDb);
        }else return Promise.reject('未确认：'+txid);
    }).then((listenInstance)=>{
        return new Promise((resolve, reject)=>{
            let write = JSON.stringify({
                bankType: "BTC",
                password: Config.password,
                data: listenInstance.map((ele) => {
                    let ej = Object.assign({}, ele.toJSON());
                    ej.txHuman = ej.txValue / 1e10;
                    return ej;
                })
            });
            console.log('btc上传：',write);
            let option = Object.assign({}, Config.updateOption);
            option.headers= {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(write)
            };
            let req = http.request(option, (res) => {
                let data = '';
                res.setEncoding("utf8");
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    resolve(data);
                });
            });
            req.on('error', (e) => {
                reject(e);
            });
            req.write(write);
            req.end();
        });
    }).then((requesResult)=>{
        console.log("btc上传返回：",requesResult);
        // DomainSyncResult.bulkCreate(requesResult.result);
        return requesResult;
    }).catch(err=>{
        console.log("btc,error:",err);
        return {"errpr":err};
    });
}

