'use strict';

var utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    mongoose    = require('mongoose'),
    constants   = require('../../models/constants'),
    async       = require('async'),
    db          = require('../../app').db.models;

function setItemModel(req, model, callback) {
    if(req.query.id) {
        db.Ideology.findOne({_id: req.query.id}, function (err, result) {
            model.item = result;
            flowUtils.appendOwnerFlag(req, result, model);
            callback();
        });
    } else {
        callback();
    }
}

function setItemModels(req, model, callback) {
    if(req.query.id) {
        async.series({
            item: function (callback) {
                db.Ideology.findOne({_id: req.query.id}, function(err, result) {
                    if(result) {
                        model.item = result;
                        flowUtils.appendOwnerFlag(req, result, model);
                    }
                    callback();
                });
            },
            parent: function (callback) {
                if(model.item && model.item.parentId) {
                    db.Ideology.findOne({_id: model.item.parentId}, function (err, result) {
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

    router.get('/', function (req, res) {
        var model = {};
        async.parallel({
            item: function(callback){
                setItemModels(req, model, callback);
            },
            items: function(callback) {
                var query = req.query.id ? { parentId: req.query.id } : { parentId: null};
                db.Ideology.find(query).limit(100).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.items = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render('dust/ideology/index', model);
        });
    });

    // item details
    router.get('/entry', function (req, res) {
        var model = {};
        async.parallel({
            item: function(callback){
                setItemModels(req, model, callback);
            },
            items: function(callback) {
                var query = { parentId: req.query.id };
                db.Ideology.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.items = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render('dust/ideology/item', model);
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        async.series({
            item: function(callback){
                if(req.query._id) {
                    db.Ideology.findOne({_id: req.query._id}, function (err, result) {
                        model.item = result;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            parent: function(callback) {
                var query = {
                    _id: req.query.id ? req.query.id : model.item && model.item.parentId ? model.item.parentId : null
                };
                if(query._id) {
                    db.Ideology.findOne(query, function (err, result) {
                        model.parent = result;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            res.render('dust/ideology/create', model);
        });
    });

    router.post('/create', function (req, res) {
        var query = {
            _id: req.query._id ? req.query._id : new mongoose.Types.ObjectId()
        };
        db.Ideology.findOne(query, function(err, result) {
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
            db.Ideology.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }
                if(result) {
                    res.redirect('/ideology/entry?id=' + req.query._id);
                } else if(req.query.id) {
                    res.redirect('/ideology?id=' + req.query.id);
                } else {
                    res.redirect('/ideology');
                }
            });
        });
    });

    /* Questions */

    router.get('/questions', function (req, res) {
        var model = {};
        setItemModel(req, model, function() {
            if(!req.query.id) {
                // Top Questions
                // TODO: Filter top 100 based on number of activities
            }
            res.render('dust/ideology/questions', model);
        });
    });

    router.get('/question/create', function (req, res) {
        var model = {};
        setItemModel(req, model, function() {
            res.render('dust/ideology/question/create', model);
        });
    });

    /* Related */

    router.get('/related', function (req, res) {
        var model = {};
        setItemModel(req, model, function() {
            res.render('dust/ideology/related', model);
        });
    });
};
