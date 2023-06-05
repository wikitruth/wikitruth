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
                    'public/layouts/**/*.min.js',
                    'public/views/**/*.min.js'
                ]
            },
            src: [
                'public/layouts/**/*.js',
                'public/views/**/*.js'
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
                'public/templates/jade/**/*.js'
            ]
        }
    };
};
