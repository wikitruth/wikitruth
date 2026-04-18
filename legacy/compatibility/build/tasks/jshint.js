'use strict';

module.exports = function jshint(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-jshint');

    var old = {
        files: [
            'controllers/**/*.js',
            'utils/**/*.js',
            'models/**/*.js'
        ],
        options: {
            jshintrc: '.jshintrc'
        }
    };

    // Options
    return {
        client: {
            options: {
                jshintrc: '.jshintrc-client',
                ignores: [
                    'legacy/compatibility/static/layouts/**/*.min.js',
                    'legacy/compatibility/static/views/**/*.min.js'
                ]
            },
            src: [
                'legacy/compatibility/static/layouts/**/*.js',
                'legacy/compatibility/static/views/**/*.js'
            ]
        },
        server: {
            options: {
                jshintrc: '.jshintrc-server'
            },
            src: [
                '*.js',
                'controllers/**/*.js',
                'utils/**/*.js',
                'middlewares/**/*.js',
                'models/**/*.js',
                'legacy/compatibility/templates/jade/**/*.js'
            ]
        }
    };
};
