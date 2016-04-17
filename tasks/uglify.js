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
                'public/layouts/core.min.js': [
                    'public/components/jquery/dist/jquery.js',
                    'public/components/jquery.cookie/jquery.cookie.js',
                    'public/components/underscore/underscore.js',
                    'public/components/backbone/backbone.js',
                    'public/components/bootstrap/js/affix.js',
                    'public/components/bootstrap/js/alert.js',
                    'public/components/bootstrap/js/button.js',
                    'public/components/bootstrap/js/carousel.js',
                    'public/components/bootstrap/js/collapse.js',
                    'public/components/bootstrap/js/dropdown.js',
                    'public/components/bootstrap/js/modal.js',
                    'public/components/bootstrap/js/tooltip.js',
                    'public/components/bootstrap/js/popover.js',
                    'public/components/bootstrap/js/scrollspy.js',
                    'public/components/bootstrap/js/tab.js',
                    'public/components/bootstrap/js/transition.js',
                    'public/components/moment/moment.js',
                    'public/layouts/core.js'
                ],
                'public/layouts/ie-sucks.min.js': [
                    'public/components/html5shiv/dist/html5shiv.js',
                    'public/components/respond/src/respond.js',
                    'public/layouts/ie-sucks.js'
                ],
                'public/layouts/admin.min.js': ['public/layouts/admin.js']
            }
        },
        views: {
            files: [{
                expand: true,
                cwd: 'public/views/',
                src: ['**/*.js', '!**/*.min.js'],
                dest: 'public/views/',
                ext: '.min.js'
            }]
        }
    };
};
