'use strict';


module.exports = function clean(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-clean');

    // Options
    return {
        tmp: 'tmp',
        build: '.build',
        js: {
            src: [
                'public/layouts/**/*.min.js',
                'public/layouts/**/*.min.js.map',
                'public/views/**/*.min.js',
                'public/views/**/*.min.js.map'
            ]
        },
        css: {
            src: [
                'public/css',
                'public/layouts/**/*.min.css',
                'public/views/**/*.min.css'
            ]
        },
        components: {
            src: [
                'public/components'
            ]
        }
    };
};
