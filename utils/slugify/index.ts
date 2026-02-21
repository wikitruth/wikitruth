// @ts-nocheck
'use strict';

exports = module.exports = function(text) {
  return text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
};
