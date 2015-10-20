'use strict';

module.exports = {
    randomInt: function randomInt (low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    },
    numberWithCommas: function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
};