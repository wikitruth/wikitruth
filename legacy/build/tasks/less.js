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
                'legacy/static/css/app.min.css': [
                    'legacy/static/less/app.less'
                ]
            }/*{
                expand: true,
                cwd: 'legacy/static/css',
                src: ['**|*.less'],
                dest: '.build/css/',
                ext: '.css'
            }*/
        },
        layouts: {
            files: {
                'legacy/static/layouts/core.min.css': [
                    'legacy/static/less/bootstrap-build.less',
                    'legacy/static/less/font-awesome-build.less',
                    'legacy/static/components/bootstrap-pincode-input/css/bootstrap-pincode-input.css',
                    'legacy/static/layouts/core.less'
                ],
                'legacy/static/layouts/admin.min.css': ['legacy/static/layouts/admin.less']
            }
        },
        views: {
            files: [{
                expand: true,
                cwd: 'legacy/static/views/',
                src: ['**/*.less'],
                dest: 'legacy/static/views/',
                ext: '.min.css'
            }]
        }

    };
};
