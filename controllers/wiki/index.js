'use strict';

var utils       = require('../../utils/utils'),
    wikiUtils   = require('../../utils/wikiUtils'),
    mongoose    = require('mongoose'),
    modelTypes  = require('../../models/constants').MODEL_TYPES,
    db          = require('../../app').db.models,
    async       = require('async');

function setTopicModels(req, model, callback) {
    if(req.query.topic) {
        async.series({
            topic: function (callback) {
                db.Topic.findOne({_id: req.query.topic}, function(err, result) {
                    if(result) {
                        model.topic = result;
                        wikiUtils.appendTopicOwnerFlag(req, result, model);
                    }
                    callback();
                });
            },
            parent: function (callback) {
                if(model.topic && model.topic.parentId) {
                    db.Topic.findOne({_id: model.topic.parentId}, function (err, result) {
                        if (result) {
                            model.parent = result;
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            callback();
        });
    } else {
        callback();
    }
}

module.exports = function (router) {

    /*router.get('/', function (req, res) {
        var model = {};
        db.Topic.find({}).limit(100).sort({ title: 1 }).exec(function(err, results) {
            results.forEach(function(result) {
                result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
            });
            model.topics = results;
            res.render('dust/wiki/index', model);
        });
        //res.send('<code><pre>' + JSON.stringify(model, null, 2) + '</pre></code>');
    });*/

    router.get('/', function (req, res) {
        var model = {};
        async.parallel({
            topic: function(callback){
                setTopicModels(req, model, callback);
            },
            topics: function(callback) {
                var query = req.query.topic ? { parentId: req.query.topic } : { parentId: null};
                db.Topic.find(query).limit(100).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.topics = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render('dust/wiki/topics', model);
        });
    });

    router.get('/topic', function (req, res) {
        var model = {};
        setTopicModels(req, model, function() {
            res.render('dust/wiki/topic', model);
        });
    });

    router.get('/topic/create', function (req, res) {
        var model = {};
        async.series({
            topic: function(callback){
                if(req.query.id) {
                    db.Topic.findOne({_id: req.query.id}, function (err, result) {
                        model.topic = result;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            parent: function(callback) {
                if(req.query.topic) {
                    db.Topic.findOne({_id: req.query.topic}, function (err, result) {
                        model.parent = result;
                        callback();
                    });
                } else if(model.topic && model.topic.parentId) {
                    db.Topic.findOne({_id: model.topic.parentId}, function (err, result) {
                        model.parent = result;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            res.render('dust/wiki/topic/create', model);
        });
    });

    router.post('/topic/create', function (req, res) {
        var query = {
            _id: req.query.id ? req.query.id : new mongoose.Types.ObjectId()
        };

        db.Topic.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
            }
            entity.parentId = req.body.parent ? req.body.parent : null;
            db.Topic.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }
                if(result) {
                    res.redirect('/wiki/topic?topic=' + req.query.id);
                } else if(req.query.topic) {
                    res.redirect('/wiki?topic=' + req.query.topic);
                } else {
                    res.redirect('/wiki');
                }
            });
        });
    });

    /* Arguments */

    router.get('/arguments', function (req, res) {
        var model = {};
        if(req.query.topic) {
            setTopicModels(req, model, function () {
                db.Argument.find({ ownerId: model.topic._id, ownerType: modelTypes.topic }).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.arguments = results;
                    res.render('dust/wiki/arguments', model);
                });
            });
        } else {
            // Top Discussions
            db.Argument.find({ ownerType: modelTypes.topic }).limit(100).exec(function(err, results) {
                results.forEach(function(result) {
                    result.topic = {
                        _id: result.ownerId
                    };
                    result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                });
                model.arguments = results;
                res.render('dust/wiki/arguments', model);
            });
        }
    });

    router.get('/argument', function (req, res) {
        var model = {};
        setTopicModels(req, model, function () {
            db.Argument.findOne({_id: req.query.argument}, function(err, result) {
                model.argument = result;
                wikiUtils.appendArgumentOwnerFlag(req, result, model);
                res.render('dust/wiki/argument', model);
            });
        });
    });

    router.get('/argument/create', function (req, res) {
        var model = {};
        setTopicModels(req, model, function () {
            if(req.query.argument) {
                db.Argument.findOne({_id: req.query.argument}, function (err, result) {
                    model.argument = result;
                    res.render('dust/wiki/argument/create', model);
                });
            } else {
                res.render('dust/wiki/argument/create', model);
            }
        });
    });

    router.post('/argument/create', function (req, res) {
        var query = {
            _id: req.query.argument ? req.query.argument : new mongoose.Types.ObjectId()
        };
        db.Argument.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
            }
            if(!entity.ownerId) {
                /*if(req.query.argument) { // parent is an argument
                    entity.ownerId = req.query.argument;
                    entity.ownerType = modelTypes.argument;
                } else*/
                if(req.query.topic) { // parent is a topic
                    entity.ownerId = req.query.topic;
                    entity.ownerType = modelTypes.topic;
                }
            }
            db.Argument.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }
                if(result) {
                    res.redirect('/wiki/argument?topic=' + req.query.topic + '&argument=' + req.query.argument);
                } else {
                    res.redirect('/wiki/arguments?topic=' + req.query.topic);
                }
            });
        });
    });

    /* Questions */

    router.get('/questions', function (req, res) {
        var model = {};
        setTopicModels(req, model, function () {
            if(req.query.argument) {
                db.Argument.findOne({_id: req.query.argument}, function (err, result) {
                    model.argument = result;
                    wikiUtils.appendArgumentOwnerFlag(req, result, model);
                    res.render('dust/wiki/questions', model);
                });
            } else {
                if(!model.topic) {
                    // Show Top Questions
                    // TODO: Filter top 100 based on number of activities
                }
                res.render('dust/wiki/questions', model);
            }
        });
    });

    router.get('/question/create', function (req, res) {
        var model = {};
        setTopicModels(req, model, function () {
            if(req.query.argument) {
                db.Argument.findOne({_id: req.query.argument}, function (err, result) {
                    model.argument = result;
                    res.render('dust/wiki/question/create', model);
                });
            } else {
                res.render('dust/wiki/question/create', model);
            }
        });
    });

    /* Related */

    router.get('/related', function (req, res) {
        var model = {};
        setTopicModels(req, model, function() {
            if(req.query.argument) {
                db.Argument.findOne({_id: req.query.argument}, function (err, result) {
                    model.argument = result;
                    wikiUtils.appendArgumentOwnerFlag(req, result, model);
                    res.render('dust/wiki/related', model);
                });
            } else {
                res.render('dust/wiki/related', model);
            }
        });
    });
};
