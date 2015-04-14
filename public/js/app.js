'use strict';


requirejs.config({
    paths: {
        'jquery': '../components/jquery/dist/jquery.min',
        'bootstrap': '../components/bootstrap/dist/js/bootstrap.min'
    }
});


require(['jquery', 'bootstrap'], function () {

    var app = {
        initialize: function () {
            // Your code here
        }
    };

    app.initialize();

});
