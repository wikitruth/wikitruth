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
                    'legacy/static/layouts/**/*.min.js',
                    'legacy/static/views/**/*.min.js'
                ]
            },
            src: [
                'legacy/static/layouts/**/*.js',
                'legacy/static/views/**/*.js'
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
                'legacy/templates/jade/**/*.js'
            ]
        }
    };
};
