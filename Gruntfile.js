'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
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
                    "public/js/react/hello-world.js": "public/templates/react/hello-world.js"
                }
            }
        }
    });

    // Load the project's grunt tasks from a directory
    require('grunt-config-dir')(grunt, {
        configDir: require('path').resolve('tasks')
    });

    require("load-grunt-tasks")(grunt, {pattern: ['grunt-*', '@*/grunt-*', '!grunt-config-dir']});

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-newer');

    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('test', [ 'jshint', 'mochacli' ]);
    grunt.registerTask('build-babel', [ 'babel', 'newer:uglify', 'copyto' ]);
    grunt.registerTask('build', [ 'jshint', 'babel', /*'copy:components',*/ 'newer:uglify', 'newer:less', 'requirejs', 'i18n', 'copyto', 'clean:css' ]);
    grunt.registerTask('default', ['concurrent']); //['copy:components', 'newer:uglify', 'less', 'concurrent']);
};
