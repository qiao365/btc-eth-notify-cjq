"use strict";

const OmniModel = require("../model/omni.model");
var OmniController = module.exports;

OmniController.bulkCreateOmniAddressWithUsage = function bulkCreateOmniAddressWithUsage(req, res) {
    let quantity = req.params.quantity;
    let usage = req.params.usage;
    let password = req.body.password;
    if(!password || password != 'omniGYQ@$=+'){
        res.status(401);
        res.json({error:401});
        return;
    }
    return handleBulkCreateOmniControllerAddress(quantity, usage, req, res);
};

function handleBulkCreateOmniControllerAddress(quantity, usage, req, res) {
    return OmniModel.bulkCreateOmniModelAddress(quantity, usage).then((addressResult) => {
        res.status(200);
        let result = JSON.stringify(addressResult);
        let buffer = Buffer.alloc(result.length);
        buffer.write(result);
        res.set({
            "Content-Type": "text/plain"
        });
        res.send(buffer);
    }).catch((err) => {
        res.status(500);
        res.json(err);
    });
}

OmniController.listenNotify = function listenNotify(req, res){
    let txid = req.params.txid;
    return OmniModel.listenNotify(txid).then((result)=>{
        res.status(200);
        res.json({
            msg: result
        });
    }).catch((err)=>{
        res.status(500);
        res.json(err);
    });
};
