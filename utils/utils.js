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
    },
    timeSince: function timeSince(date, fullWord) {
        var seconds = Math.floor((new Date() - date) / 1000);
        var interval = Math.floor(seconds / 31536000);

        if (interval > 1) {
            return interval + (fullWord ? " years ago" : 'y');
        }
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return interval + (fullWord ? " months" : 'mo');
        }
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return interval + (fullWord ? " days" : 'd');
        }
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return interval + (fullWord ? " hours": 'h');
        }
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return interval + (fullWord ? " minutes" : 'm');
        }
        return Math.floor(seconds) + (fullWord ? " seconds": 's');
    }
};