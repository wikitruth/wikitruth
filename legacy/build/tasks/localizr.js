'use strict';


module.exports = function localizr(grunt) {
	// Load task
	grunt.loadNpmTasks('grunt-localizr');

	// Options
	return {
	    files: ['legacy/templates/**/*.dust'],
        options: {
            contentPath: ['locales/**/*.properties']
        }
	};
};