'use strict';


module.exports = function watch(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Options
    return {
        clientJS: {
            files: [
                'public/layouts/**/*.js', '!public/layouts/**/*.min.js',
                'public/views/**/*.js', '!public/views/**/*.min.js'
            ],
            tasks: ['newer:uglify', 'newer:jshint:client']
        },
        serverJS: {
            files: ['views/**/*.js'],
            tasks: ['newer:jshint:server']
        },
        clientLess: {
            files: [
                'public/layouts/**/*.less',
                'public/views/**/*.less',
                'public/less/**/*.less'
            ],
            tasks: ['newer:less']
        },
        layoutLess: {
            files: [
                'public/layouts/**/*.less',
                'public/less/**/*.less'
            ],
            tasks: ['less:layouts']
        }
    };
};
