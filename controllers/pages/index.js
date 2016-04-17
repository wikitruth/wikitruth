'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    flowUtils   = require('../../utils/flowUtils'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        if(req.user && req.user.id) {
            async.parallel({
                parent: function(callback){
                    if(req.query.parent) {
                        db.Page.findOne({_id: req.query.parent}, function(err, result) {
                            model.page = result;
                            flowUtils.appendOwnerFlag(req, result, model);
                            callback();
                        });
                    } else {
                        callback();
                    }
                },
                pages: function(callback) {
                    var query = req.query.parent ? { createUserId: req.user.id, parentId: req.query.parent } : { createUserId: req.user.id };
                    db.Page.find(query).sort({ title: 1 }).exec(function(err, results) {
                        if(req.query.parent) {
                            model.pages = results;
                        } else {
                            // Return pages with hierarchy
                            var nodes = [];
                            // Build parent pages
                            results.forEach(function(page) {
                                if(!page.parentId) {
                                    nodes.push(page);
                                }
                            });
                            results.forEach(function(page) {
                                if(page.parentId) {
                                    var parents = nodes.filter(function(p) {
                                        return p._id.equals(page.parentId);
                                    });
                                    var parent = parents.length > 0 ? parents[0] : null;
                                    if(parent) {
                                        if(!parent.children) {
                                            parent.children = [];
                                        }
                                        parent.children.push(page);
                                    } else {
                                        // parent not found, add as orphan
                                        nodes.push(page);
                                    }
                                } else {
                                    // no parent, if not existing, add as orphan
                                    var orphans = nodes.filter(function(p) {
                                        return p._id.equals(page._id);
                                    });
                                    var orphan = orphans.length > 0 ? orphans[0] : null;
                                    if(!orphan) {
                                        nodes.push(page);
                                    }
                                }
                            });
                            model.pageNodes = nodes;
                        }
                        callback();
                    });
                }
            }, function (err, results) {
                res.render(templates.pages.index, model);
            });
        } else {
            res.render(templates.pages.index, model);
        }
    });

    router.get('/page', function (req, res) {
        var model = {};
        async.parallel({
            parent: function(callback){
                if(req.query.parent) {
                    db.Page.findOne({_id: req.query.parent}, function(err, result) {
                        model.parent = result;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            page: function(callback) {
                db.Page.findOne({_id: req.query.id}, function(err, result) {
                    model.page = result;
                    flowUtils.appendOwnerFlag(req, result, model);
                    callback();
                });
            }
        }, function (err, results) {
            res.render(templates.pages.page, model);
        });

    });

    router.get('/create', function (req, res) {
        var model = {};
        if(req.user && req.user.id) {
            async.parallel({
                parent: function(callback){
                    if(req.query.parent) {
                        db.Page.findOne({_id: req.query.parent}, function(err, result) {
                            model.parent = result;
                            //flowUtils.appendOwnerFlag(req, result, model);
                            callback();
                        });
                    } else {
                        callback();
                    }
                },
                page: function(callback) {
                    if(req.query.id) {
                        db.Page.findOne({ createUserId: req.user.id, _id: req.query.id}, function (err, result) {
                            model.page = result;
                            callback();
                        });
                    } else {
                        callback();
                    }
                }
            }, function (err, results) {
                res.render(templates.pages.create, model);
            });
        } else {
            res.render(templates.pages.create, model);
        }
    });

    router.post('/create', function (req, res) {
        var query = {
            _id: req.query.id ? req.query.id : new mongoose.Types.ObjectId()
        };
        db.Page.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.id = req.body.id;
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
            }
            if(req.query.parent) {
                entity.parentId = req.query.parent;
            } else if(entity.parentId) {
                entity.parentId = null;
            }

            db.Page.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }
                if(result) {
                    res.redirect(paths.pages.page + '?id=' + req.query.id + (req.query.parent ? '&amp;parent=' + req.query.parent : ''));
                } else {
                    res.redirect(paths.pages.index);
                }
            });
        });
    });
};
