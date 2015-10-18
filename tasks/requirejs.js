'use strict';


module.exports = function requirejs(grunt) {
	// Load task
	grunt.loadNpmTasks('grunt-contrib-requirejs');

	// Options
	return {
        build: {
            options: {
                baseUrl: 'public/js',
                mainConfigFile: 'public/js/config.js',
                dir: '.build/js',
                optimize: 'uglify',
                modules: [
                    { name: 'app' }
                ]
            }
        }
	};
};
