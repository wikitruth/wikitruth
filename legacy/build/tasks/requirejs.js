'use strict';


module.exports = function requirejs(grunt) {
	// Load task
	grunt.loadNpmTasks('grunt-contrib-requirejs');

	// Options
	return {
        build: {
            options: {
                baseUrl: 'legacy/static/js/requirejs',
                mainConfigFile: 'legacy/static/js/requirejs/config.js',
                dir: '.build/js/requirejs',
                optimize: 'uglify',
                modules: [
                    { name: 'app' }
                ]
            }
        }
	};
};
