'use strict';

const path = require('path');

const templatesModule = require(path.join(process.cwd(), 'server/src/models/templates'));

module.exports = templatesModule && templatesModule.default ? templatesModule.default : templatesModule;
