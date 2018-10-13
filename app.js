"use strict";

var express = require("express");
var bodyParser = require("body-parser");

var controllerOfEth = require("./api/controller/EthControllerOfRPC");
var controllerOfOmni = require("./api/controller/OmniControllerOfRPC");
var sequelize = require('./api/domain/bitapp.prepare').sequelize;
const ethModel = require("./api/model/eth.model");

var app = express();
app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());

app.use(function(req, res, next){
    req._filter = true;
    let method = req.method,
        url = req.originalUrl,
        ip = req.ip;
    console.log(`\n\nStarted ${method} ${url} for ${ip}`);
    console.log(`Parameters:${JSON.stringify(Object.assign(req.body, req.params, req.query))}`);
    next();
  });

app.post("/blockchain/addresses/eth/bulk/:usage/:quantity", controllerOfEth.bulkCreateEthAddressWithUsage);
app.post("/blockchain/addresses/omni/bulk/:usage/:quantity", controllerOfOmni.bulkCreateOmniAddressWithUsage);

//mobipromo.sell专用
app.post("/blockchain/address/eth/bulk/mobipromo/:usage/:quantity", controllerOfEth.bulkCreateEthAddressWithUsageMobipromoSell);
//刘总 100 address
app.post("/blockchain/address/eth/bulk/other/:usage/:quantity", controllerOfEth.bulkCreateEthAddressWithOther);//

/**
ref:https://bitcoin.stackexchange.com/questions/24457/how-do-i-use-walletnotify
**/

app.get("/blockchain/address/omni/listen/notify/:txid", controllerOfOmni.listenNotify);

var port = process.env.PORT || 8010;
app.listen(port);
// need 

sequelize.sync({force:false}).then(()=>{
    ethModel.startFilter();
    ethModel.startCanFilter();
    ethModel.startDFTBFilter();
    ethModel.startDFCFilter();
});

console.log(`> app is listening ${port}`);
module.exports = app;
