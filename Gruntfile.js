'use strict';

function jshint(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-jshint');

    /*let old = {
        files: [
            'controllers/!**!/!*.js',
            'utils/!**!/!*.js',
            'models/!**!/!*.js'
        ],
        options: {
            jshintrc: '.jshintrc'
        }
    };*/

    // Options
    return {
        client: {
            options: {
                jshintrc: '.jshintrc-client',
                ignores: [
                    'public/layouts/**/*.min.js',
                    'public/views/**/*.min.js'
                ]
            },
            src: [
                'public/layouts/**/*.js',
                'public/views/**/*.js'
            ]
        },
        server: {
            options: {
                jshintrc: '.jshintrc-server'
            },
            src: [
                '*.js',
                'controllers/**/*.js',
                'utils/**/*.js',
                'middlewares/**/*.js',
                'models/**/*.js',
                'public/templates/jade/**/*.js'
            ]
        }
    };
}

function uglify(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Options
    return {
        options: {
            sourceMap: true,
            sourceMapName: function (filePath) {
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
                'public/layouts/admin.min.js': ['public/layouts/admin.js'],
                'public/js/app.min.js': [
                    'public/components/bootstrap-pincode-input/js/bootstrap-pincode-input.js',
                    'models/constants.js',
                    'models/paths.js',
                    'public/js/app.js'
                ],
                'public/js/react.min.js': [
                    'node_modules/react/umd/react.production.min.js',
                    'node_modules/react-dom/umd/react-dom.production.min.js'
                ]
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
}

function less(grunt) {
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
}

function requirejs(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-requirejs');

    // Options
    return {
        build: {
            options: {
                baseUrl: 'public/js/requirejs',
                mainConfigFile: 'public/js/requirejs/config.js',
                dir: '.build/js/requirejs',
                optimize: 'uglify',
                modules: [
                    {name: 'app'}
                ]
            }
        }
    };
}

function clean(grunt) {
    // Load task
    grunt.registerTask('i18n', [ /*'clean',*/ 'localizr', 'dustjs', 'clean:tmp']);

    // Options
    return {};
}

function copyto(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-copy-to');

    // Options
    return {
        build: {
            files: [{
                cwd: 'public',
                src: ['**/*'],
                dest: '.build/',
                expand: true
            }],
            options: {
                ignore: [
                    'public/less{,/**/*}',
                    //'public/js/**/*',
                    'public/templates/**/*'
                ]
            }
        }
    };
}

/*function localizr(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-localizr');

    // Options
    return {
        files: ['public/templates/!**!/!*.dust'],
        options: {
            contentPath: ['locales/!**!/!*.properties']
        }
    };
}*/

function watch(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Options
    return {
        clientJS: {
            files: [
                'public/layouts/**/*.js', '!public/layouts/**/*.min.js',
                'public/views/**/*.js', '!public/views/**/*.min.js'
            ],
            tasks: ['newer:uglify', 'newer:jshint:client']
        },
        serverJS: {
            files: ['views/**/*.js'],
            tasks: ['newer:jshint:server']
        },
        clientLess: {
            files: [
                'public/layouts/**/*.less',
                'public/views/**/*.less',
                'public/less/**/*.less'
            ],
            tasks: ['newer:less']
        },
        layoutLess: {
            files: [
                'public/layouts/**/*.less',
                'public/less/**/*.less'
            ],
            tasks: ['less:layouts']
        }
    };
}

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        /*uglify: {
            options: {
                banner: '/!*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> *!/\n'
            },
            build: {
                src: 'src/<%= pkg.name %>.js',
                dest: 'build/<%= pkg.name %>.min.js'
            }
        },*/

        concurrent: {
            dev: {
                tasks: ['nodemon', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },

        nodemon: {
            dev: {
                script: 'server.js',
                options: {
                    ignore: [
                        'node_modules/**',
                        'public/**'
                    ],
                    ext: 'js'
                }
            }
        },

        babel: function (grunt) {
            return {
                options: {
                    sourceMap: true
                },
                dist: {
                    files: {
                        'public/js/react/hello-world.js': 'public/templates/react/hello-world.js',
                        'public/js/react/entry-options-popover.js': 'public/templates/react/entry-options-popover.js'
                    }
                }
            };
        },

        jshint: jshint(grunt),
        uglify: uglify(grunt),
        less: less(grunt),
        requirejs: requirejs(grunt),
        clean: clean(grunt),
        copyto: copyto(grunt),
        watch: watch(grunt)
        // localizr: localizr(grunt)
    });


    // Load the plugin that provides the "uglify" task.
    // grunt.loadNpmTasks('grunt-contrib-uglify');

    // Default task(s).
    // grunt.registerTask('default', ['uglify']);

    // require('load-grunt-config')(grunt);


    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-newer');

    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('build-js', ['uglify']);
    grunt.registerTask('build', ['jshint', /*'babel', 'copy:components',*/ 'uglify', 'less', 'requirejs', /*'i18n',*/ 'copyto'/*, 'clean:css'*/]);
    grunt.registerTask('default', ['concurrent']); //['copy:components', 'newer:uglify', 'less', 'concurrent']);
};