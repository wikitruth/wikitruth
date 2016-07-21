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
        css: 'public/css',
        /*css: {
            src: [
                'public/layouts/**|*.min.css',
                'public/views/**|*.min.css',
                'public/css/**|*.min.css'
            ]
        },*/
        components: 'public/components'
        /*components: {
            src: ['public/components/**']
        }*/
    };
};
