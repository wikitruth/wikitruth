// @ts-nocheck
'use strict';

let mongoose = require('mongoose'),
  kraken = require('../app').kraken;

module.exports = async function() {
  let uri = kraken.get('mongodb:uri') || 'mongodb://127.0.0.1:27017/wikitruth';

  console.log('[mongoose] connecting');
  // mongoose.connect(uri, {server:{auto_reconnect:true}});
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: true,
  });

  let db = mongoose.connection;

  db.on('error', function(error) {
    mongoose.disconnect();
    console.log('[mongoose] disconnect');
  });

  db.once('open', function() {
    console.log('[mongoose] connected successfully');
  });

  db.on('disconnected', function() {
    // mongoose.connect(uri, { server: { auto_reconnect: true } });
    // console.log('[mongoose] reconnect');
    console.log('[mongoose] disconnected, attempting to reconnect...');
    mongoose.connect(uri);
  });
};
