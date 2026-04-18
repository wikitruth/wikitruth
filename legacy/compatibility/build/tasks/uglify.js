'use strict';


module.exports = function uglify(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Options
    return {
        options: {
            sourceMap: true,
            sourceMapName: function(filePath) {
                return filePath + '.map';
            }
        },
        layouts: {
            files: {
                'legacy/compatibility/static/layouts/core.min.js': [
                    'legacy/compatibility/static/components/jquery/dist/jquery.js',
                    'legacy/compatibility/static/components/jquery.cookie/jquery.cookie.js',
                    'legacy/compatibility/static/components/underscore/underscore.js',
                    'legacy/compatibility/static/components/backbone/backbone.js',
                    'legacy/compatibility/static/components/bootstrap/js/affix.js',
                    'legacy/compatibility/static/components/bootstrap/js/alert.js',
                    'legacy/compatibility/static/components/bootstrap/js/button.js',
                    'legacy/compatibility/static/components/bootstrap/js/carousel.js',
                    'legacy/compatibility/static/components/bootstrap/js/collapse.js',
                    'legacy/compatibility/static/components/bootstrap/js/dropdown.js',
                    'legacy/compatibility/static/components/bootstrap/js/modal.js',
                    'legacy/compatibility/static/components/bootstrap/js/tooltip.js',
                    'legacy/compatibility/static/components/bootstrap/js/popover.js',
                    'legacy/compatibility/static/components/bootstrap/js/scrollspy.js',
                    'legacy/compatibility/static/components/bootstrap/js/tab.js',
                    'legacy/compatibility/static/components/bootstrap/js/transition.js',
                    'legacy/compatibility/static/components/moment/moment.js',
                    'legacy/compatibility/static/layouts/core.js'
                ],
                'legacy/compatibility/static/layouts/ie-sucks.min.js': [
                    'legacy/compatibility/static/components/html5shiv/dist/html5shiv.js',
                    'legacy/compatibility/static/components/respond/src/respond.js',
                    'legacy/compatibility/static/layouts/ie-sucks.js'
                ],
                'legacy/compatibility/static/layouts/admin.min.js': ['legacy/compatibility/static/layouts/admin.js'],
                'legacy/compatibility/static/js/app.min.js': [
                    'legacy/compatibility/static/components/bootstrap-pincode-input/js/bootstrap-pincode-input.js',
                    'models/constants.js',
                    'models/paths.js',
                    'legacy/compatibility/static/js/app.js'
                ],
                'legacy/compatibility/static/js/react.min.js': [
                    'node_modules/react/umd/react.production.min.js',
                    'node_modules/react-dom/umd/react-dom.production.min.js'
                ]
            }
        },
        views: {
            files: [{
                expand: true,
                cwd: 'legacy/compatibility/static/views/',
                src: ['**/*.js', '!**/*.min.js'],
                dest: 'legacy/compatibility/static/views/',
                ext: '.min.js'
            }]
        }
    };
};
