"use strict";

const appUtil = require("./util.js");
const net = require('net');
const http = require("https");
const TableDefine = require("../domain/database.define");
const DomainAddress = TableDefine.DomainAddress;
const DomainEthListener = TableDefine.DomainEthListener;
const DomainAddressMobipromoSell = TableDefine.DomainAddressMobipromoSell;
const DomainAddressOther = TableDefine.DomainAddressOther;
const DomainSyncResult = TableDefine.DomainSyncResult;
const BigNumber = require('bignumber.js');
const CONFIG = require("../domain/bitapp.prepare").CONFIG;
const Web3 = require("web3");
const sequelize = require("../domain/bitapp.prepare").sequelize;
var rpcWeb3 = new Web3(new Web3.providers.HttpProvider(CONFIG.ethereum.rpc));
var eth = module.exports;


eth.bulkCreateEthAddress = function bulkCreateEthAddress(quantity, usage) {
    let bulk = [];
    quantity = quantity||10;
    usage = usage||'ok';
    for (let idx = 0; idx < quantity; idx++) {
        bulk[idx] = generateCreateAddressPromise(appUtil.guid());
    };
    return Promise.all(bulk).then((values) => {
        let bulkData = values.map((ele) => {
            return {
                address: ele.address,
                bankType: 'ETH',
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
            //     // return `insert into t_lib_eth (status, address, created_at, updated_at) values ('ok', '${ej.address}', now(), now());`;
            //     return `insert into pool_addresses (address, created_at, updated_at,currency,used) values ('${ej.address}', now(), now(),3,0);`;
            // }),s
            msg: `generate ${quantity} eth address`,
            quantity:quantity
        };
    });
};

//MobipromoSell 
eth.bulkCreateEthAddressWithUsageMobipromoSell = function bulkCreateEthAddressWithUsageMobipromoSell(quantity, usage) {
    let bulk = [];
    for (let idx = 0; idx < quantity; idx++) {
        bulk[idx] = generateCreateAddressPromise(appUtil.guid());
    };
    return Promise.all(bulk).then((values) => {
        let bulkData = values.map((ele) => {
            return {
                address: ele.address,
                bankType: 'ETH',
                status: "ok",
                usage: usage,
                password: ele.password
            };
        });
        return DomainAddressMobipromoSell.bulkCreate(bulkData);
    }).then((addressInstanceArray) => {
        return {
            status: "ok",
            addressInstanceArray:addressInstanceArray,
            // sqldata: addressInstanceArray.map((ele) => {
            //     let ej = ele.toJSON();
            //     // return `insert into t_lib_eth (status, address, created_at, updated_at) values ('ok', '${ej.address}', now(), now());`;
            //     return `insert into t_recharge_address (address,used, created_at,updated_at) values ('${ej.address}', 0, now(), now());`;
            // }),
            msg: `generate ${quantity} eth address`,
            quantity:quantity
        };
    });
};


eth.bulkCreateEthAddressWithOther = function bulkCreateEthAddressWithOther(quantity, usage) {
    let bulk = [];
    for (let idx = 0; idx < quantity; idx++) {
        bulk[idx] = generateCreateAddressPromise(appUtil.guid());
    };
    return Promise.all(bulk).then((values) => {
        let bulkData = values.map((ele) => {
            return {
                address: ele.address,
                bankType: 'ETH',
                status: "ok",
                usage: usage,
                password: ele.password
            };
        });
        return DomainAddressOther.bulkCreate(bulkData);
    }).then((addressInstanceArray) => {
        return {
            status: "ok",
            addressInstanceArray:addressInstanceArray,
            // sqldata: addressInstanceArray.map((ele) => {
            //     let ej = ele.toJSON();
            //     // return `insert into t_lib_eth (status, address, created_at, updated_at) values ('ok', '${ej.address}', now(), now());`;
            //     return `insert into t_recharge_address (address,used, created_at,updated_at) values ('${ej.address}', 0, now(), now());`;
            // }),
            // data: addressInstanceArray.map((ele) => {
            //     let ej = ele.toJSON();
            //     // return `insert into t_lib_eth (status, address, created_at, updated_at) values ('ok', '${ej.address}', now(), now());`;
            //     return ej.address +","+ej.password+"; ";
            // }),
            msg: `generate ${quantity} eth address`,
            quantity:quantity
        };
    });
};

function generateCreateAddressPromise(password, key) {
    return new Promise((resolve, reject) => {
        let address = rpcWeb3.personal.newAccount(password);
        let date = {
            address: address,
            password:password
            };
        resolve (date);
        // let client = net.connect(`${datadir}/geth.ipc`, () => {
        //     client.write(JSON.stringify({ "jsonrpc": "2.0", "method": "personal_newAccount", "params": [password], "id": 1 }));
        // });
        // let dataString = '';
        // client.on('data', (data) => {
        //     dataString += data.toString();
        //     client.end();
        // });
        // client.on('end', () => {
        //     let data = JSON.parse(dataString);
        //     if (data.error) {
        //         reject(data.error);
        //     } else {
        //         resolve({
        //             address: data.result,
        //             key,
        //             password
        //         });
        //     };
        //     client.destroy();
        // });
    });
};

//eth 监听
eth.startFilter = function startFilter() {
    console.log("<<<<<<<<<<<<"+"ETH:startListener"+">>>>>>>>>>>>>>");
    let filter = rpcWeb3.eth.filter("latest");
    filter.watch((err, blockhash)=>{
        if(!err){
            return genereateWatchHandle(blockhash)();
        }else{
           return console.log('eth监听','stop',err);
        };
    });
};
//分析监听到的 块 信息
function genereateWatchHandle(blockHash){
    return function watchhandle(){
        let lastBlock;
        return new Promise((resolve, reject)=>{
            //获取这个 块 的信息
            rpcWeb3.eth.getBlock(blockHash, (err, lastBlock)=>{
                if(!err){
                    resolve(lastBlock);
                }else{
                    // reject(err);
                };
            });
        }).then((theBlock)=>{
            //根据这个块的 信息 获取交易hash数组
            return bulkGetTransaction(theBlock);
        }).then((txArray)=>{
            //txArray 是 返回的交易信息
            let filteredArray = txArray.filter((ele)=> ele);//过滤 undefined                            
            // console.log("all:"+txArray.length+",filtered:"+filteredArray.length);
            var list = [];
            if(filteredArray.length >0 ){
                filteredArray.forEach((ele)=>{
                    //这里根据获取到的交易的 交易数据调用 web3.eth.getTransactionReceipt//获取合约地址！！！！！！
                    if(ele.value == 0 ){
                        return;
                    }
                    // let receipt = rpcWeb3.eth.getTransactionReceipt(ele.hash);
                    let data =  {
                        address: ele.to,
                        bankType: 'ETH',
                        txHash: ele.hash,
                        blockHash: ele.blockHash,
                        blockNumer: ele.blockNumber,
                        txFrom: ele.from,
                        txTo: ele.to,
                        txValue: new BigNumber(ele.value).toNumber(),
                        txInput: 'tx',
                        txIndex: ele.transactionIndex,
                        txDate:new Date(),
                        txHuman: ele.value/1e18
                    };
                    if(ele.value > 0 ){//  =0时候不知是做什么，当然或者token代币转币
                        list.push(data);
                    }
                });
                return DomainEthListener.bulkCreate(list).then(()=>{
                    return list;
                });
            }else return Promise.reject('节点无相关数据');
        }).then((instanceArray)=>{
            if (instanceArray.length == 0)return Promise.resolve('无上传数据');
            return new Promise((resolve, reject)=>{
                let write = JSON.stringify({
                    bankType:"ETH",
                    password:CONFIG.password,
                    data: instanceArray
                });
                console.log('\n>>>>>>>>>>>>>>>>>>>>.上传eth交易数据>>>>>>>>>>>>>>>>>>>>.\n');
                console.log(write);
                let option = Object.assign({}, CONFIG.updateOption);
                option.headers= {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(write)
                };
                let req = http.request(option, (res)=>{
                    let data = '';
                    res.setEncoding("utf8");
                    res.on("data", (chunk)=>{
                        data += chunk;
                    });
                    res.on("end", ()=>{
                        resolve(data);
                    });
                });
                req.on('error', (e)=>{
                    reject(e);
                });
                req.write(write);
                req.end();
            }).catch(err=>{
                console.log("eth error:",err);
            });
            //发送异步请求
        }).then((requesResult)=>{
            console.log("eth上传完成",requesResult);
        }).catch(err=>{
            // console.log("eth error:",err);
        });
    };
};

 //根据这个块的 信息 获取交易hash数组
let bulkGetTransaction = function(theBlock){
    return new Promise((resolve, reject)=>{
        if(theBlock.transactions == null || theBlock.transactions == undefined){
            resolve([]);
        }
        let txSize = theBlock.transactions.length;
        let txArray = [];
        function bulkFixNumberTrans(start, step){
            let transactionsArray = theBlock.transactions.slice(start, start+step);
            //获取数据库关联的 交易的数据
            let transactionArraydate = transactionsArray.map((transaction)=>{
                return new Promise((resolve, reject)=>{
                    rpcWeb3.eth.getTransaction(transaction, (err, transactiondate)=>{
                        if(!err && transactiondate != null){
                            return DomainAddress.findOne({
                                where: {
                                    bankType: "ETH",
                                    address:transactiondate.to
                                }
                            }).then((result) => {
                                // console.log(">>>>>>>>"+JSON.stringify(transactiondate)+">>>>>>>>");
                                resolve(result != null ? transactiondate : undefined);
                                // resolve(transactiondate);
                            });
                        }else {
                            // reject(err);
                        };
                    });
                });
            });
            return Promise.all(transactionArraydate).then((txarray)=>{
                txArray.push.apply(txArray, txarray);
                if(start + step >= txSize){
                    return txArray;
                }else{
                    return bulkFixNumberTrans(start+step, step);
                }
            });
        };
        bulkFixNumberTrans(0, 1).then((txarray)=>{
            resolve(txArray);
        });
    });
};

//can监听
eth.startCanFilter = function startCanFilter() {
    let abi = [{"constant":true,"inputs":[],"name":"BUY","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"newSellPrice","type":"uint256"},{"name":"newBuyPrice","type":"uint256"}],"name":"setPrices","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"DECIMALS","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"withdraw","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"INITIAL_SUPPLY","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"sellPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"standard","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"amountInWeiDecimalIs18","type":"uint256"}],"name":"setCouldTrade","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"buyPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"stopTrade","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"NAME","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"buy","outputs":[{"name":"amount","type":"uint256"}],"payable":true,"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"},{"name":"_extraData","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"amountInWeiDecimalIs18","type":"uint256"}],"name":"sell","outputs":[{"name":"revenue","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_target","type":"address"},{"name":"freeze","type":"bool"}],"name":"freezeAccount","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"SYMBOL","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"inputs":[],"payable":false,"type":"constructor"},{"payable":false,"type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_target","type":"address"},{"indexed":false,"name":"_frozen","type":"bool"}],"name":"FrozenFunds","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_spender","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Approval","type":"event"}];
    var MyContract = rpcWeb3.eth.contract(abi);
    var myContractInstance = MyContract.at("0x5f3789907b35DCe5605b00C0bE0a7eCDBFa8A841");
    console.log("<<<<<<<<<<<<"+"Can:startListener"+">>>>>>>>>>>>>>");
    var someone = myContractInstance.Transfer();
    someone.watch(function(error, transactiondate){
        if(error){
            return console.log('can监听，stop ！',error);
        }
        return DomainAddress.findOne({
            where: {
                bankType: "ETH",
                address:transactiondate.args._to
            }
        }).then((result) => {
            if(result){
                console.log(">>>>>>>>发现一个交易>>Can>>>>>>"+JSON.stringify(transactiondate)+"\n");
                sequelize.transaction((trans) => {
                    let receipt = rpcWeb3.eth.getTransactionReceipt(transactiondate.transactionHash);
                    let data = {
                        address: transactiondate.args._to,
                        bankType: 'CAN',
                        txHash: transactiondate.transactionHash,
                        blockHash: transactiondate.blockHash,
                        blockNumer: transactiondate.blockNumber,
                        txFrom: transactiondate.args._from,
                        txTo: transactiondate.args._to,
                        txValue: new BigNumber(transactiondate.args._value).toNumber(),
                        txDate:new Date(),
                        txIndex: transactiondate.transactionIndex
                    };
                    return DomainEthListener.create(data,{transaction: trans});
                }).then((instance)=>{
                    return new Promise((resolve, reject)=>{
                        let ej = Object.assign({}, instance.toJSON());
                        ej.txHuman = ej.txValue/1e18;
                        let write = JSON.stringify({
                            bankType:"CAN",
                            password:CONFIG.password,
                            data: [ej]
                        });
                        console.log('\n>>>>>>>>>>>>>>>>>>>>.上传can交易数据>>>>>>>>>>>>>>>>>>>>.\n');
                        console.log(write);
                        let option = Object.assign({}, CONFIG.updateOption);
                        option.headers= {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(write)
                        };
                        let req = http.request(option, (res)=>{
                            let data = '';
                            res.setEncoding("utf8");
                            res.on("data", (chunk)=>{
                                data += chunk;
                            });
                            res.on("end", ()=>{
                                resolve(data);
                            });
                        });
                        req.on('error', (e)=>{
                            reject(e);
                        });
                        req.write(write);
                        req.end();
                    });
                    //发送异步请求
                }).then((requesResult)=>{
                        console.log("can上传返回：",requesResult);
                        // DomainSyncResult.bulkCreate(requesResult.result);
                }).catch(err=>{
                    console.log("can,error:",err);
                });
            };
        });
    });
};

// DFTB 监听
eth.startDFTBFilter = function startDFTBFilter() {
    let abi = [{"constant":true,"inputs":[],"name":"BUY","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newSellPrice","type":"uint256"},{"name":"newBuyPrice","type":"uint256"}],"name":"setPrices","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"DECIMALS","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"withdraw","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"INITIAL_SUPPLY","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"sellPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"standard","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amountInWeiDecimalIs18","type":"uint256"}],"name":"setCouldTrade","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"buyPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"stopTrade","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"NAME","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"buy","outputs":[{"name":"amount","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"STANDARD","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"},{"name":"_extraData","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amountInWeiDecimalIs18","type":"uint256"}],"name":"sell","outputs":[{"name":"revenue","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_target","type":"address"},{"name":"freeze","type":"bool"}],"name":"freezeAccount","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"SYMBOL","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":false,"stateMutability":"nonpayable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_target","type":"address"},{"indexed":false,"name":"_frozen","type":"bool"}],"name":"FrozenFunds","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_spender","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Approval","type":"event"}];
    var MyContract = rpcWeb3.eth.contract(abi);
    var myContractInstance = MyContract.at("0xB319aa674243E015e38Fe0B2d77dE9b5552F02CB");
    console.log("<<<<<<<<<<<<"+"DFTB:startListener"+">>>>>>>>>>>>>>");
    var someone = myContractInstance.Transfer();
    someone.watch(function(error, transactiondate){
        if(error){
            return console.log('DFTB监听，stop ！',error);
        }
        return DomainAddress.findOne({
            where: {
                bankType: "ETH",
                address:transactiondate.args._to
            }
        }).then((result) => {
            if(result){
                console.log(">>>>>>>>发现一个交易>>DFTB>>>>>>"+JSON.stringify(transactiondate)+"\n");
                sequelize.transaction((trans) => {
                    let receipt = rpcWeb3.eth.getTransactionReceipt(transactiondate.transactionHash);
                    let data = {
                        address: transactiondate.args._to,
                        bankType: 'DFTB',
                        txHash: transactiondate.transactionHash,
                        blockHash: transactiondate.blockHash,
                        blockNumer: transactiondate.blockNumber,
                        txFrom: transactiondate.args._from,
                        txTo: transactiondate.args._to,
                        txValue: new BigNumber(transactiondate.args._value).toNumber(),
                        txDate:new Date(),
                        txIndex: transactiondate.transactionIndex
                    };
                    return DomainEthListener.create(data,{transaction: trans});
                }).then((instance)=>{
                    return new Promise((resolve, reject)=>{
                        let ej = Object.assign({}, instance.toJSON());
                        ej.txHuman = ej.txValue/1e18;
                        let write = JSON.stringify({
                            bankType:"DFTB",
                            password:CONFIG.password,
                            data: [ej]
                        });
                        console.log('\n>>>>>>>>>>>>>>>>>>>>.上传DFTB交易数据>>>>>>>>>>>>>>>>>>>>.\n');
                        console.log(write);
                        let option = Object.assign({}, CONFIG.updateOption);
                        option.headers= {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(write)
                        };
                        let req = http.request(option, (res)=>{
                            let data = '';
                            res.setEncoding("utf8");
                            res.on("data", (chunk)=>{
                                data += chunk;
                            });
                            res.on("end", ()=>{
                                resolve(data);
                            });
                        });
                        req.on('error', (e)=>{
                            reject(e);
                        });
                        req.write(write);
                        req.end();
                    });
                    //发送异步请求
                }).then((requesResult)=>{
                        console.log("DFTB上传返回：",requesResult);
                        // DomainSyncResult.bulkCreate(requesResult.result);
                }).catch(err=>{
                    console.log("DFTB,error:",err);
                });
            };
        });
    });
};

// DFC 监听
eth.startDFCFilter = function startDFCFilter() {
    let abi = [{"constant":true,"inputs":[],"name":"BUY","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newSellPrice","type":"uint256"},{"name":"newBuyPrice","type":"uint256"}],"name":"setPrices","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"DECIMALS","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"withdraw","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"INITIAL_SUPPLY","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"sellPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"standard","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amountInWeiDecimalIs18","type":"uint256"}],"name":"setCouldTrade","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"buyPrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"stopTrade","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"NAME","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"buy","outputs":[{"name":"amount","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"STANDARD","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"},{"name":"_extraData","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amountInWeiDecimalIs18","type":"uint256"}],"name":"sell","outputs":[{"name":"revenue","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_target","type":"address"},{"name":"freeze","type":"bool"}],"name":"freezeAccount","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"SYMBOL","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":false,"stateMutability":"nonpayable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_target","type":"address"},{"indexed":false,"name":"_frozen","type":"bool"}],"name":"FrozenFunds","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_spender","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Approval","type":"event"}];
    var MyContract = rpcWeb3.eth.contract(abi);
    var myContractInstance = MyContract.at("0x48B61132A20954B12B26f9a1cc2Cb67e98c4BE01");
    console.log("<<<<<<<<<<<<"+"DFC:startListener"+">>>>>>>>>>>>>>");
    var someone = myContractInstance.Transfer();
    someone.watch(function(error, transactiondate){
        if(error){
            return console.log('DFC监听，stop ！',error);
        }
        return DomainAddress.findOne({
            where: {
                bankType: "ETH",
                address:transactiondate.args._to
            }
        }).then((result) => {
            if(result){
                console.log(">>>>>>>>发现一个交易>>DFC>>>>>>"+JSON.stringify(transactiondate)+"\n");
                sequelize.transaction((trans) => {
                    let receipt = rpcWeb3.eth.getTransactionReceipt(transactiondate.transactionHash);
                    let data = {
                        address: transactiondate.args._to,
                        bankType: 'DFC',
                        txHash: transactiondate.transactionHash,
                        blockHash: transactiondate.blockHash,
                        blockNumer: transactiondate.blockNumber,
                        txFrom: transactiondate.args._from,
                        txTo: transactiondate.args._to,
                        txValue: new BigNumber(transactiondate.args._value).toNumber(),
                        txDate:new Date(),
                        txIndex: transactiondate.transactionIndex
                    };
                    return DomainEthListener.create(data,{transaction: trans});
                }).then((instance)=>{
                    return new Promise((resolve, reject)=>{
                        let ej = Object.assign({}, instance.toJSON());
                        ej.txHuman = ej.txValue/1e18;
                        let write = JSON.stringify({
                            bankType:"DFC",
                            password:CONFIG.password,
                            data: [ej]
                        });
                        console.log('\n>>>>>>>>>>>>>>>>>>>>.上传DFTB交易数据>>>>>>>>>>>>>>>>>>>>.\n');
                        console.log(write);
                        let option = Object.assign({}, CONFIG.updateOption);
                        option.headers= {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(write)
                        };
                        let req = http.request(option, (res)=>{
                            let data = '';
                            res.setEncoding("utf8");
                            res.on("data", (chunk)=>{
                                data += chunk;
                            });
                            res.on("end", ()=>{
                                resolve(data);
                            });
                        });
                        req.on('error', (e)=>{
                            reject(e);
                        });
                        req.write(write);
                        req.end();
                    });
                    //发送异步请求
                }).then((requesResult)=>{
                        console.log("DFC上传返回：",requesResult);
                }).catch(err=>{
                    console.log("DFC,error:",err);
                });
            };
        });
    });
};