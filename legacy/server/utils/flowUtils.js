'use strict';

const path = require('path');
const setupEntryRouters = require('./setupEntryRouters');
const modernFlowUtils = require(path.join(process.cwd(), 'server/src/utils/flowUtils'));

module.exports = {
  ...modernFlowUtils,
  setupEntryRouters,
};
