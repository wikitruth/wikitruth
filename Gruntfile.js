'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
          components: {
            files: [
              {
                expand: true, cwd: 'node_modules/font-awesome/',
                src: ['fonts/**', 'less/**'], dest: 'public/components/font-awesome/'
              }
            ]
          }
        },
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
        }
    });

    // Load the project's grunt tasks from a directory
    require('grunt-config-dir')(grunt, {
        configDir: require('path').resolve('tasks')
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-newer');
  
    grunt.registerTask('default', ['copy:components', 'newer:uglify', 'newer:less', 'concurrent']);
    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('test', [ 'jshint', 'mochacli' ]);
    grunt.registerTask('build-jade', ['copy:components', 'uglify', 'newer:less']);
    grunt.registerTask('build-dust', [ 'jshint', 'newer:less', 'requirejs', 'i18n', 'copyto' ]);
    grunt.registerTask('build', [ 'build-jade', 'build-dust' ]);
};
