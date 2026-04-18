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
                'legacy/static/layouts/core.min.js': [
                    'legacy/static/components/jquery/dist/jquery.js',
                    'legacy/static/components/jquery.cookie/jquery.cookie.js',
                    'legacy/static/components/underscore/underscore.js',
                    'legacy/static/components/backbone/backbone.js',
                    'legacy/static/components/bootstrap/js/affix.js',
                    'legacy/static/components/bootstrap/js/alert.js',
                    'legacy/static/components/bootstrap/js/button.js',
                    'legacy/static/components/bootstrap/js/carousel.js',
                    'legacy/static/components/bootstrap/js/collapse.js',
                    'legacy/static/components/bootstrap/js/dropdown.js',
                    'legacy/static/components/bootstrap/js/modal.js',
                    'legacy/static/components/bootstrap/js/tooltip.js',
                    'legacy/static/components/bootstrap/js/popover.js',
                    'legacy/static/components/bootstrap/js/scrollspy.js',
                    'legacy/static/components/bootstrap/js/tab.js',
                    'legacy/static/components/bootstrap/js/transition.js',
                    'legacy/static/components/moment/moment.js',
                    'legacy/static/layouts/core.js'
                ],
                'legacy/static/layouts/ie-sucks.min.js': [
                    'legacy/static/components/html5shiv/dist/html5shiv.js',
                    'legacy/static/components/respond/src/respond.js',
                    'legacy/static/layouts/ie-sucks.js'
                ],
                'legacy/static/layouts/admin.min.js': ['legacy/static/layouts/admin.js'],
                'legacy/static/js/app.min.js': [
                    'legacy/static/components/bootstrap-pincode-input/js/bootstrap-pincode-input.js',
                    'models/constants.js',
                    'models/paths.js',
                    'legacy/static/js/app.js'
                ],
                'legacy/static/js/react.min.js': [
                    'node_modules/react/umd/react.production.min.js',
                    'node_modules/react-dom/umd/react-dom.production.min.js'
                ]
            }
        },
        views: {
            files: [{
                expand: true,
                cwd: 'legacy/static/views/',
                src: ['**/*.js', '!**/*.min.js'],
                dest: 'legacy/static/views/',
                ext: '.min.js'
            }]
        }
    };
};
