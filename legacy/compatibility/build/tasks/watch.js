'use strict';


module.exports = function watch(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Options
    return {
        clientJS: {
            files: [
                'legacy/compatibility/static/layouts/**/*.js', '!legacy/compatibility/static/layouts/**/*.min.js',
                'legacy/compatibility/static/views/**/*.js', '!legacy/compatibility/static/views/**/*.min.js'
            ],
            tasks: ['newer:uglify', 'newer:jshint:client']
        },
        serverJS: {
            files: ['views/**/*.js'],
            tasks: ['newer:jshint:server']
        },
        clientLess: {
            files: [
                'legacy/compatibility/static/layouts/**/*.less',
                'legacy/compatibility/static/views/**/*.less',
                'legacy/compatibility/static/less/**/*.less'
            ],
            tasks: ['newer:less']
        },
        layoutLess: {
            files: [
                'legacy/compatibility/static/layouts/**/*.less',
                'legacy/compatibility/static/less/**/*.less'
            ],
            tasks: ['less:layouts']
        }
    };
};
