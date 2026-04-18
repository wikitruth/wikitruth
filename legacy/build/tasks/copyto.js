'use strict';


module.exports = function copyto(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-copy-to');

    // Options
    return {
        build: {
            files: [{
                cwd: 'legacy/static',
                src: ['**/*'],
                dest: '.build/',
                expand: true
            }],
            options: {
                ignore: [
                    'legacy/static/less{,/**/*}',
                    //'legacy/static/js/**/*',
                    'legacy/templates/**/*'
                ]
            }
        }
    };
};
