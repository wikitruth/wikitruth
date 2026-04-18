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
                'legacy/compatibility/static/layouts/**/*.min.js',
                'legacy/compatibility/static/layouts/**/*.min.js.map',
                'legacy/compatibility/static/views/**/*.min.js',
                'legacy/compatibility/static/views/**/*.min.js.map'
            ]
        },
        css: {
            src: [
                'legacy/compatibility/static/css',
                'legacy/compatibility/static/layouts/**/*.min.css',
                'legacy/compatibility/static/views/**/*.min.css'
            ]
        },
        components: {
            src: [
                'legacy/compatibility/static/components'
            ]
        }
    };
};
