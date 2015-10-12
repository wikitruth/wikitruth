'use strict';


module.exports = function mochacli(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-mocha-cli');

    // Options
    return {
        src: ['tests/**/*.js'],
        options: {
            timeout: 6000,
            'check-leaks': true,
            ui: 'bdd',
            reporter: 'spec'
        }
    };
};
