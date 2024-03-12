'use strict';

module.exports = function (grunt) {

    let config = {

        pkg: grunt.file.readJSON('package.json'),

        /*copy: {
          components: {
            files: [
              {
                expand: true, cwd: 'node_modules/font-awesome/',
                src: ['fonts/**', 'less/**'], dest: 'public/components/font-awesome/'
              }
            ]
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

        babel: {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    'public/js/react/hello-world.js': 'public/templates/react/hello-world.js',
                    'public/js/react/entry-options-popover.js': 'public/templates/react/entry-options-popover.js'
                }
            }
        }
    }

    config.watch = require('./tasks/watch')(grunt);
    config.clean = require('./tasks/clean')(grunt);
    config.copyto = require('./tasks/copyto')(grunt);
    config.dustjs = require('./tasks/dustjs')(grunt);
    config.i18n = require('./tasks/i18n')(grunt);
    config.jshint = require('./tasks/jshint')(grunt);
    config.less = require('./tasks/less')(grunt);
    config.localizr = require('./tasks/localizr')(grunt);
    config.mochacli = require('./tasks/mochacli')(grunt);
    config.requirejs = require('./tasks/requirejs')(grunt);
    config.uglify = require('./tasks/uglify')(grunt);

    grunt.initConfig(config);

    // Load the project's grunt tasks from a directory
    // require('grunt-config-dir')(grunt, {
    //     configDir: require('path').resolve('tasks')
    // });

    grunt.loadTasks('tasks');

    require("load-grunt-tasks")(grunt, {pattern: ['grunt-*', '@*/grunt-*']});

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-newer');

    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('test', [ 'jshint', 'mochacli' ]);
    grunt.registerTask('build-js', [ 'uglify' ]);
    grunt.registerTask('build-babel', [ 'babel', 'uglify', 'copyto' ]);
    grunt.registerTask('build', [ /*'jshint',*/ 'babel', /*'copy:components',*/ 'uglify', 'less', 'requirejs', 'i18n', 'copyto'/*, 'clean:css'*/ ]);
    grunt.registerTask('default', ['concurrent']); //['copy:components', 'newer:uglify', 'less', 'concurrent']);
};
