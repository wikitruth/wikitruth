'use strict';

var templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    flowUtils   = require('../utils/flowUtils'),
    db          = require('../app').db.models,
    async       = require('async');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        var clipboard = req.session.clipboard || {};
        var topicIds = clipboard['object' + constants.OBJECT_TYPES.topic];
        var argumentIds = clipboard['object' + constants.OBJECT_TYPES.argument];

        if(req.user) {
            req.params.username = req.user.username;
        }
        flowUtils.setModelContext(req, model);

        async.parallel({
            topics: function (callback) {
                if(topicIds && topicIds.length > 0) {
                    var query = {
                        _id: {
                            $in: topicIds
                        }
                    };
                    db.Topic.find(query, function(err, results) {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtra(result);
                        });
                        model.topics = results;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            arguments: function (callback) {
                if(argumentIds && argumentIds.length > 0) {
                    var query = {
                        _id: {
                            $in: argumentIds
                        }
                    };
                    db.Argument.find(query, function(err, results) {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtra(result);
                        });
                        model.arguments = results;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err) {
            res.render(templates.wiki.clipboard, model);
        });
    });

    router.post('/', function (req, res) {
        var action = req.body.action;
        if(action === 'delete') {
            //var clipboard = req.session.clipboard;
            var topics = req.body.topics;
            var args = req.body.arguments;
            if(topics) {
                //var topicIds = clipboard['object' + constants.OBJECT_TYPES.topic];
                if( typeof topics === 'string' ) {
                    // single selection
                    topics = [topics];
                }
            }
            if(args) {
                //var argumentIds = clipboard['object' + constants.OBJECT_TYPES.argument];
                if( typeof args === 'string' ) {
                    // single selection
                    args = [args];
                }
            }
            res.redirect(req.originalUrl);
        }
    });
};