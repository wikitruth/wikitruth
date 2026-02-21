'use strict';

const mongoose = require('mongoose') as typeof import('mongoose');
const appModule = require('../app') as {
  kraken?: {
    get: (key: string) => string | undefined;
  };
};

module.exports = async function connectMongoose(): Promise<void> {
  const uri = appModule.kraken?.get('mongodb:uri') || 'mongodb://127.0.0.1:27017/wikitruth';

  console.log('[mongoose] connecting');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: true,
  });

  const db = mongoose.connection;

  db.on('error', function (_error: unknown) {
    void mongoose.disconnect();
    console.log('[mongoose] disconnect');
  });

  db.once('open', function () {
    console.log('[mongoose] connected successfully');
  });

  db.on('disconnected', function () {
    console.log('[mongoose] disconnected, attempting to reconnect...');
    void mongoose.connect(uri).catch(function () {
      return undefined;
    });
  });
};
