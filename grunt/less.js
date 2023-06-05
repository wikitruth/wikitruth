'use strict';


module.exports = function less(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-less');

    // Options
    return {
        options: {
            cleancss: false,
            compress: true
        },
        build: {
            files: {
                'public/css/app.min.css': [
                    'public/less/app.less'
                ]
            }/*{
                expand: true,
                cwd: 'public/css',
                src: ['**|*.less'],
                dest: '.build/css/',
                ext: '.css'
            }*/
        },
        layouts: {
            files: {
                'public/layouts/core.min.css': [
                    'public/less/bootstrap-build.less',
                    'public/less/font-awesome-build.less',
                    'public/components/bootstrap-pincode-input/css/bootstrap-pincode-input.css',
                    'public/layouts/core.less'
                ],
                'public/layouts/admin.min.css': ['public/layouts/admin.less']
            }
        },
        views: {
            files: [{
                expand: true,
                cwd: 'public/views/',
                src: ['**/*.less'],
                dest: 'public/views/',
                ext: '.min.css'
            }]
        }

    };
};
