'use strict';


module.exports = function copyto(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-copy-to');

    // Options
    return {
        build: {
            files: [{
                cwd: 'legacy/compatibility/static',
                src: ['**/*'],
                dest: '.build/',
                expand: true
            }],
            options: {
                ignore: [
                    'legacy/compatibility/static/less{,/**/*}',
                    //'legacy/compatibility/static/js/**/*',
                    'legacy/compatibility/templates/**/*'
                ]
            }
        }
    };
};
