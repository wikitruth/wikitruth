'use strict';


module.exports = function watch(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Options
    return {
        clientJS: {
            files: [
                'legacy/static/layouts/**/*.js', '!legacy/static/layouts/**/*.min.js',
                'legacy/static/views/**/*.js', '!legacy/static/views/**/*.min.js'
            ],
            tasks: ['newer:uglify', 'newer:jshint:client']
        },
        serverJS: {
            files: ['views/**/*.js'],
            tasks: ['newer:jshint:server']
        },
        clientLess: {
            files: [
                'legacy/static/layouts/**/*.less',
                'legacy/static/views/**/*.less',
                'legacy/static/less/**/*.less'
            ],
            tasks: ['newer:less']
        },
        layoutLess: {
            files: [
                'legacy/static/layouts/**/*.less',
                'legacy/static/less/**/*.less'
            ],
            tasks: ['less:layouts']
        }
    };
};
