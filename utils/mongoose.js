'use strict';

var mongoose = require('mongoose'),
    kraken = require('../app').kraken;

module.exports = function(){
    var uri = kraken.get('mongodb:uri');

    console.log('[mongoose] connecting');
    mongoose.connect(uri, {server:{auto_reconnect:true}});
    var db = mongoose.connection;

    db.on('error', function(error) {
        mongoose.disconnect();
        console.log('[mongoose] disconnect');
    });

    db.on('disconnected', function() {
        mongoose.connect(uri, {server:{auto_reconnect:true}});
        console.log('[mongoose] reconnect');
    });
}