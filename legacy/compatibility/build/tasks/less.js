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
                'legacy/compatibility/static/css/app.min.css': [
                    'legacy/compatibility/static/less/app.less'
                ]
            }/*{
                expand: true,
                cwd: 'legacy/compatibility/static/css',
                src: ['**|*.less'],
                dest: '.build/css/',
                ext: '.css'
            }*/
        },
        layouts: {
            files: {
                'legacy/compatibility/static/layouts/core.min.css': [
                    'legacy/compatibility/static/less/bootstrap-build.less',
                    'legacy/compatibility/static/less/font-awesome-build.less',
                    'legacy/compatibility/static/components/bootstrap-pincode-input/css/bootstrap-pincode-input.css',
                    'legacy/compatibility/static/layouts/core.less'
                ],
                'legacy/compatibility/static/layouts/admin.min.css': ['legacy/compatibility/static/layouts/admin.less']
            }
        },
        views: {
            files: [{
                expand: true,
                cwd: 'legacy/compatibility/static/views/',
                src: ['**/*.less'],
                dest: 'legacy/compatibility/static/views/',
                ext: '.min.css'
            }]
        }

    };
};
