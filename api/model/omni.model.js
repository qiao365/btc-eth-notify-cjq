"use strict";
const appUtil = require('./util');
const http = require("https");

const TableDefine = require("../domain/database.define");
const DomainAddress = TableDefine.DomainAddress;
const DomainOmniListener = TableDefine.DomainOmniListener;
const CONFIG = require("../domain/bitapp.prepare").CONFIG;
const Omni = require("../utils/OmniClient").Omni;
Omni.init(CONFIG.omni.user, CONFIG.omni.pass, CONFIG.omni.host, CONFIG.omni.port);

var OmniModel = module.exports;

OmniModel.bulkCreateOmniModelAddress = function bulkCreateOmniModelAddress(quantity, usage) {
    var bulk = [];
    for (var index = 0; index < quantity; ++index) {
        bulk.push(generateNewAddressPromise(appUtil.guid()));
    };
    return Promise.all(bulk).then((values) => {
        let bulkData = values.map((ele) => {
            return {
                address: ele.address,
                bankType: 'Omni',
                status: "ok",
                usage: usage,
                password: ele.password
            };
        });
        return DomainAddress.bulkCreate(bulkData);
    }).then((addressInstanceArray) => {
        return {
            status: "ok",
            sqldata: addressInstanceArray.map((ele) => {
                let ej = ele.toJSON();
                return `insert into pool_addresses (address, created_at, updated_at,currency,used) values ('${ej.address}', now(), now(),3,0);`;

            }),
            msg: `generate ${quantity} eth address`
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
        Omni.gettransaction(txid, function(data){
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
                    console.log("listenInstance",listenInstance);
                    return new Promise((resolve, reject)=>{
                        listenInstance.txHuman = listenInstance.txValue / 1e10;
                        let write = JSON.stringify({
                            bankType: "USDT",
                            password: Config.password,
                            data: [listenInstance]
                        });
                        console.log('omin上传：',JSON.stringify(write));
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
                        req.write();
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
        });
    });
};

