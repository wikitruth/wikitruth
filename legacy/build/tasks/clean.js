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
                'legacy/static/layouts/**/*.min.js',
                'legacy/static/layouts/**/*.min.js.map',
                'legacy/static/views/**/*.min.js',
                'legacy/static/views/**/*.min.js.map'
            ]
        },
        css: {
            src: [
                'legacy/static/css',
                'legacy/static/layouts/**/*.min.css',
                'legacy/static/views/**/*.min.css'
            ]
        },
        components: {
            src: [
                'legacy/static/components'
            ]
        }
    };
};
