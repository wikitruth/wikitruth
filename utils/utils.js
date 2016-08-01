'use strict';

module.exports = {
    randomInt: function randomInt (low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    },
    randomBool: function randomBool () {
      return Math.random() >= 0.5;
    },
    numberWithCommas: function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
};