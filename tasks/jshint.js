'use strict';

// FIXME: Not used at the moment.
module.exports = function jshint(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-jshint');

    // Options
    return {
        files: [
            'controllers/**/*.js',
            'utils/**/*.js',
            'models/**/*.js'
        ],
        options: {
            jshintrc: '.jshintrc'
        }
    };
};
