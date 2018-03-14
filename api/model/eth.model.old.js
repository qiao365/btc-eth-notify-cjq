"use strict";

const appUtil = require("./util.js");
const net = require('net');
const http = require("http");
//const datadir = '/Users/liuhr/data/blockdata/ethereum/prod';

const TableDefine = require("../domain/database.define");
const DomainAddress = TableDefine.DomainAddress;
const DomainEthListener = TableDefine.DomainEthListener;
const DomainSyncResult = TableDefine.DomainSyncResult;
const BigNumber = require('bignumber.js');

const Config = require("../domain/bitapp.prepare").CONFIG;
const datadir = Config.ethereum.datadir;

const Web3 = require("Web3");
var web3 = new Web3(new Web3.providers.IpcProvider(`${datadir}/geth.ipc`, net));
var rpcWeb3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
//var rpc = new Web3(new Web3.providers.HttpProvider(Config.ethereum.rpc));
//var web3 = Web3;
//web3.setProvider(new web3.providers.IpcProvider(`${datadir}/geth.ipc`, net));

var eth = module.exports;


eth.bulkCreateEthAddress = function bulkCreateEthAddress(quantity, usage) {
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
        return DomainAddress.bulkCreate(bulkData);
    }).then((addressInstanceArray) => {
        return {
            status: "ok",
            sqldata: addressInstanceArray.map((ele) => {
                let ej = ele.toJSON();
                return `insert into t_lib_eth (status, address, created_at, updated_at) values ('ok', '${ej.address}', now(), now());`;
            }),
            msg: `generate ${quantity} eth address`
        };
    });
};

function generateCreateAddressPromise(password, key) {
    return new Promise((resolve, reject) => {
        let client = net.connect(`${datadir}/geth.ipc`, () => {
            client.write(JSON.stringify({ "jsonrpc": "2.0", "method": "personal_newAccount", "params": [password], "id": 1 }));
        });
        let dataString = '';
        client.on('data', (data) => {
            dataString += data.toString();
            client.end();
        });
        client.on('end', () => {
            let data = JSON.parse(dataString);
            if (data.error) {
                reject(data.error);
            } else {
                resolve({
                    address: data.result,
                    key,
                    password
                });
            };
            client.destroy();
        });
    });
};

var ethFilter = {};
eth.startFilter = function startFilter() {
    let addressMap = new Object(null);
    return DomainAddress.findAll({
        where: {
            bankType: "ETH",
            status: "used"
        }
    }).then((instanceArray) => {
        addressMap = new Object(null);
        instanceArray.forEach((ele) => {
            addressMap[ele.toJSON().address] = true;
        });
        // console.log("address size:" + instanceArray.length);
        return addressMap;
    }).then((addressMap)=>{
        var filter = web3.eth.filter("latest");
        console.log('----------------------------------eth-----'+JSON.stringify(addressMap));
        filter.watch((err, blockhash)=>{
            if(!err){
                return genereateWatchHandle(addressMap, blockhash)();
            }else{
                throw err;
            };
        });

        // // 合约ABI
        // var abi = [{"constant":false,"inputs":[{"name":"addr","type":"address"},{"name":"state","type":"bool"}],"name":"setTransferAgent","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"mintingFinished","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"addr","type":"address"}],"name":"setReleaseAgent","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"receiver","type":"address"},{"name":"amount","type":"uint256"}],"name":"mint","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"burnAmount","type":"uint256"}],"name":"burn","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"mintAgents","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"addr","type":"address"},{"name":"state","type":"bool"}],"name":"setMintAgent","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"value","type":"uint256"}],"name":"upgrade","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_name","type":"string"},{"name":"_symbol","type":"string"}],"name":"setTokenInformation","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"upgradeAgent","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"releaseTokenTransfer","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"upgradeMaster","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"getUpgradeState","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"transferAgents","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"released","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"canUpgrade","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalUpgraded","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"releaseAgent","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"agent","type":"address"}],"name":"setUpgradeAgent","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"isToken","outputs":[{"name":"weAre","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"BURN_ADDRESS","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"master","type":"address"}],"name":"setUpgradeMaster","outputs":[],"payable":false,"type":"function"},{"inputs":[{"name":"_name","type":"string"},{"name":"_symbol","type":"string"},{"name":"_initialSupply","type":"uint256"},{"name":"_decimals","type":"uint256"},{"name":"_mintable","type":"bool"}],"payable":false,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newName","type":"string"},{"indexed":false,"name":"newSymbol","type":"string"}],"name":"UpdatedTokenInformation","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Upgrade","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"agent","type":"address"}],"name":"UpgradeAgentSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"addr","type":"address"},{"indexed":false,"name":"state","type":"bool"}],"name":"MintingAgentChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"burner","type":"address"},{"indexed":false,"name":"burnedAmount","type":"uint256"}],"name":"Burned","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"receiver","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"Minted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"}];
        // // 合约地址
        // var address = "0xd4fa1460F537bb9085d22C7bcCB5DD450Ef28e3a";
        // // 通过ABI和地址获取已部署的合约对象
        // var metacoin = web3.eth.contract(abi).at(address);
        // // 获取事件对象
        // var myEvent = metacoin.Transfer();
        // myEvent.watch(function(err, result) {
        //     if (!err) {
        //         console.log(result);
        //     } else {
        //         console.log(err);
        //     }
        // });
        // console.log("start"+0);
        // //获取eth数量
        // function watchBalance() {
        //     web3.setProvider(new web3.providers.HttpProvider());
        //     var coinbase = "0x0ccecf5195c26f5452ee88ab20607530bafed1cb";
        //     var originalBalance = web3.eth.getBalance(coinbase).toNumber();
        //     console.log("originalBalance"+originalBalance);
        //     web3.eth.filter('latest').watch(function() {
        //         var currentBalance = web3.eth.getBalance(coinbase).toNumber();
        //         console.log("currentBalance"+currentBalance);
        //     });
        //     var accounts = web3.eth.accounts;
        //     console.log(accounts);
        // }
        // watchBalance();


        // web3.setProvider(new web3.providers.HttpProvider());
        // web3.eth.getBlockTransactionCount("0x2d0e019fca081159e649d6ef92eb4bb4b1f030598c1352325806db743fd40e26",(err, number)=>{
        //     console.log(number); // 
        // });


        //解锁 发币
        // var accounts = rpcWeb3.eth.accounts;
        // console.log(JSON.stringify(accounts));
        // // var address = web3.personal.newAccount("123456789");
        // // console.log(address);
     
        // let client = net.connect(`${datadir}/geth.ipc`, () => {
        //     client.write(JSON.stringify({ "jsonrpc": "2.0", "method": "personal_unlockAccount", "params": ["0x007e62c3f5f19d41c943f252531fcdb25a374a23","123456789",300], "id": 1 }));//300s默认的
        // });
        // let dataString = '';
        // client.on('data', (data) => {
        //     dataString += data.toString();
        //     client.end();
        // });
        // client.on('end', () => {
        //     let data = JSON.parse(dataString);
        //     if (data.error) {
        //         console.log(data.error);
        //     } else {
        //         console.log("back"+JSON.stringify(data));
        //         var hash = rpcWeb3.eth.sendTransaction({from: "0x007e62c3f5f19d41c943f252531fcdb25a374a23", to: '0xa8ade7feab1ece71446bed25fa0cf6745c19c3d5', value: web3.toWei(1, "ether")});
        //         console.log("hash:"+hash);
        //     };
        //     client.destroy();
        // });

        // unlockAddress("","");
    });
};
//分析监听到的 块 信息
function genereateWatchHandle(addressMap, blockHash){
    console.log('-------------filter-----------');
    addressMap = addressMap || {};
    return function watchhandle(){
        let lastBlock;
        return new Promise((resolve, reject)=>{
            //获取这个 块 的信息
            web3.eth.getBlock(blockHash, (err, lastBlock)=>{
                if(!err){
                    resolve(lastBlock);
                }else{
                    reject(err);
                };
            });
        }).then((theBlock)=>{
            //根据这个块的 信息 获取交易hash数组
            return bulkGetTransaction(theBlock, addressMap);
        }).then((txArray)=>{
            //txArray 是 返回的交易信息
            let filteredArray = txArray.filter((ele)=> ele);//过滤 undefined                            
            console.log("all:"+txArray.length+",filtered:"+filteredArray.length);
            return DomainEthListener.bulkCreate(filteredArray.map((ele)=>{
                //这里根据获取到的交易的 交易数据调用 web3.eth.getTransactionReceipt//获取合约地址！！！！！！


                var contractAddressDate = "";
                //,,,,,,do something
                web3.eth.getTransactionReceipt(ele.hash, (err, receipt)=>{
                    if(!err && receipt != null){
                        contractAddressDate = receipt.contractAddress;
                    }
                });
                return {
                    contractAddress:contractAddressDate,
                    address: addressMap[ele.from]? ele.from : ele.to,
                    bankType: 'ETH',
                    txHash: ele.hash,
                    blockHash: ele.blockHash,
                    blockNumer: ele.blockNumber,
                    txFrom: ele.from,
                    txTo: ele.to,
                    txValue: new BigNumber(ele.value).toNumber(),
                    txInput: ele.input,
                    txIndex: ele.transactionIndex
                };
            }));
        }).then((instanceArray)=>{
            return {} || new Promise((resolve, reject)=>{
                let write = JSON.stringify({
                    bankType:"ETH",
                    password:Config.password,
                    data: instanceArray.map((ele)=> {
                        let ej = Object.assign({}, ele.toJSON());
                        ej.txHuman = new BigNumber(ej.txValue).dividedBy(1e18).toNumber();
                        return ej;
                    })
                });
                let option = Object.assign({}, Config.callBackServerOption);
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
            let successSync = requesResult && requesResult.result && requesResult.result.length > 0;
            if( successSync){
                DomainSyncResult.bulkCreate(requesResult.result);
            }
        });
    };
};

 //根据这个块的 信息 获取交易hash数组
let bulkGetTransaction = function(theBlock, addressMap){
    return new Promise((resolve, reject)=>{
        console.log("theBlock:"+JSON.stringify(theBlock));
        let txSize = theBlock.transactions.length;
        let txArray = [];

        function bulkFixNumberTrans(start, step){
            let transactionsArray = theBlock.transactions.slice(start, start+step);
            //获取数据库关联的 交易的数据
            let transactionArraydate = transactionsArray.map((transaction)=>{
                return new Promise((resolve, reject)=>{
                    web3.eth.getTransaction(transaction, (err, transactiondate)=>{
                        console.log(transactiondate);
                        console.log("-----------");
                        if(!err && transactiondate != null){
                            let isRelative = addressMap[transactiondate.from] || addressMap[transactiondate.to];
                            if(isRelative){
                                console.log(">>>>>>>>"+JSON.stringify(transactiondate)+">>>>>>>>");
                            }
                            resolve(isRelative ? transactiondate : undefined);
                            //resolve(tx);
                        }else {
                            reject(err);
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


// web3.eth.getTransactionReceipt//获取合约地址！！！！！！
// var receipt = web3.eth.getTransactionReceipt('0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d66f4c9c6c445836d8b');
// console.log(receipt);
// {
//   "transactionHash": "0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d66f4c9c6c445836d8b",
//   "transactionIndex": 0,
//   "blockHash": "0xef95f2f1ed3ca60b048b4bf67cde2195961e0bba6f70bcbea9a2c4e133e34b46",
//   "blockNumber": 3,
//   "contractAddress": "0xa94f5374fce5edbc8e2a8697c15331677e6ebf0b",
//   "cumulativeGasUsed": 314159,
//   "gasUsed": 30234,
//   "logs": [{
//          // logs as returned by getFilterLogs, etc.
//      }, ...]
// }

// //发币
// function sendCoin(){
//         // 合约ABI
//         var abi = [{"constant":false,"inputs":[{"name":"addr","type":"address"},{"name":"state","type":"bool"}],"name":"setTransferAgent","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"mintingFinished","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"addr","type":"address"}],"name":"setReleaseAgent","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"receiver","type":"address"},{"name":"amount","type":"uint256"}],"name":"mint","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"burnAmount","type":"uint256"}],"name":"burn","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"mintAgents","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"addr","type":"address"},{"name":"state","type":"bool"}],"name":"setMintAgent","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"value","type":"uint256"}],"name":"upgrade","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_name","type":"string"},{"name":"_symbol","type":"string"}],"name":"setTokenInformation","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"upgradeAgent","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"releaseTokenTransfer","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"upgradeMaster","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"getUpgradeState","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"transferAgents","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"released","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"canUpgrade","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalUpgraded","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"releaseAgent","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"agent","type":"address"}],"name":"setUpgradeAgent","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"isToken","outputs":[{"name":"weAre","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"BURN_ADDRESS","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"master","type":"address"}],"name":"setUpgradeMaster","outputs":[],"payable":false,"type":"function"},{"inputs":[{"name":"_name","type":"string"},{"name":"_symbol","type":"string"},{"name":"_initialSupply","type":"uint256"},{"name":"_decimals","type":"uint256"},{"name":"_mintable","type":"bool"}],"payable":false,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newName","type":"string"},{"indexed":false,"name":"newSymbol","type":"string"}],"name":"UpdatedTokenInformation","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Upgrade","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"agent","type":"address"}],"name":"UpgradeAgentSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"addr","type":"address"},{"indexed":false,"name":"state","type":"bool"}],"name":"MintingAgentChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"burner","type":"address"},{"indexed":false,"name":"burnedAmount","type":"uint256"}],"name":"Burned","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"receiver","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"Minted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"}];
//         // 合约地址
//         var address = "0xd4fa1460F537bb9085d22C7bcCB5DD450Ef28e3a";
//         // 通过ABI和地址获取已部署的合约对象
//         var metacoin = web3.eth.contract(abi).at(address);
//     var account_one = web3.eth.accounts[0];
//     var account_two = web3.eth.accounts[1];
//     // web3.eth.getTransactionReceipt()
//     var account_one_balance = metacoin.getBalance.call(account_one);
//     console.log("account one balance:", account_one_balance.toNumber());
    
//     var txhash = metacoin.transfer.sendTransaction(account_two, 100, { from: account_one });
    
//     var myEvent = metacoin.Transfer();
//     myEvent.watch(function (err, result) {
//         if (!err) {
//             if (result.transactionHash == txhash) {
//                 var account_one_balance = metacoin.balanceOf.call(account_one);
//                 console.log("account one balance after sendCoin:", account_one_balance.toNumber());
//             }
//         } else {
//             console.log(err);
//         }
//         myEvent.stopWatching();
//     });
// }

//解锁账户啊！
function unlockAddress(account, password) {
    account = "0x007e62c3f5f19d41c943f252531fcdb25a374a23";
    password = "123456789"
    return new Promise((resolve, reject) => {
        let client = net.connect(`${datadir}/geth.ipc`, () => {
            client.write(JSON.stringify({ "jsonrpc": "2.0", "method": "personal_unlockAccount", "params": [account,password,300], "id": 1 }));//300s默认的
        });
        let dataString = '';
        client.on('data', (data) => {
            dataString += data.toString();
            client.end();
        });
        client.on('end', () => {
            let data = JSON.parse(dataString);
            if (data.error) {
                reject(data.error);
            } else {
                // console.log("back"+JSON.stringify(data));
                // var hash = rpcWeb3.eth.sendTransaction({from: "0x007e62c3f5f19d41c943f252531fcdb25a374a23", to: '0xa8ade7feab1ece71446bed25fa0cf6745c19c3d5', value: web3.toWei(1, "ether")});
                // console.log("hash:"+hash);
                sendTransaction();
                // "jsonrpc":"2.0","id":1,"result":true
                resolve({
                    address: data.result
                });
            };
            client.destroy();
        });
    });
};

function sendTransaction(){
    var tx = {from: "0x007e62c3f5f19d41c943f252531fcdb25a374a23", to: '0xa8ade7feab1ece71446bed25fa0cf6745c19c3d5', value: web3.toWei(1, "ether")};
        rpcWeb3.eth.sendTransaction(tx,  (err, hash)=>{
            if (err) {
                console.log("hash:"+err);
            } else {
                console.log("hash:"+hash);
            }
        });
}


function start(){
    var MyContract = web3.eth.contract(
        [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"stop","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"owner_","type":"address"}],"name":"setOwner","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint128"}],"name":"push","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"name_","type":"bytes32"}],"name":"setName","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint128"}],"name":"mint","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"src","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"stopped","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"authority_","type":"address"}],"name":"setAuthority","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"wad","type":"uint128"}],"name":"pull","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint128"}],"name":"burn","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"start","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"authority","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"src","type":"address"},{"name":"guy","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"inputs":[{"name":"symbol_","type":"bytes32"}],"payable":false,"type":"constructor"},{"anonymous":true,"inputs":[{"indexed":true,"name":"sig","type":"bytes4"},{"indexed":true,"name":"guy","type":"address"},{"indexed":true,"name":"foo","type":"bytes32"},{"indexed":true,"name":"bar","type":"bytes32"},{"indexed":false,"name":"wad","type":"uint256"},{"indexed":false,"name":"fax","type":"bytes"}],"name":"LogNote","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"authority","type":"address"}],"name":"LogSetAuthority","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"}],"name":"LogSetOwner","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"}]
        );
    var myContractInstance = MyContract.at('0x86Fa049857E0209aa7D9e616F7eb3b3B78ECfdb0');
    
    // watch for an event with {some: 'args'}
    var can = myContractInstance.Transfer();;
    can.watch(function(error, result){
        console.log(JSON.stringify(result));
    });
};
