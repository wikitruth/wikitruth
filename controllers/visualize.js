'use strict';

var templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    flowUtils   = require('../utils/flowUtils'),
    utils       = require('../utils/utils'),
    db          = require('../app').db.models,
    async       = require('async');


function GET_index(req, res) {
    flowUtils.ensureEntryIdParam(req, 'topic');
    var model = {}, nodes = [], edges = [], node;
    var textSize = 25, nodeSize = 12, rootId = '0', rootLabel = 'Wikitruth'; // from nodeSize = 15 is producing an error
    var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        var topicId = model.topic ? model.topic._id : null;
        var query = {
            parentId: topicId,
            private: false,
            'screening.status': constants.SCREENING_STATUS.status1.code
        };
        if(req.params.username && req.user && req.user.username === req.params.username) {
            query.private = true;
            rootLabel = 'My Diary';
            if(!topicId) {
                query.ownerType = constants.OBJECT_TYPES.user;
                query.ownerId = req.user.id;
            }
        }
        // ownerType: constants.OBJECT_TYPES.user, ownerId: model.member._id
        async.parallel({
            visualize: function (callback) {
                db.Topic
                    .find(query)
                    .sort({title: 1})
                    .lean()
                    .exec(function (err, results) {
                        if(!topicId) {
                            topicId = rootId;
                            nodes.push({id: topicId, label: rootLabel, value: 10, color: '#f0ad4e', font: {size: 16}, current: true });
                        } else {
                            nodes.push({id: topicId, label: utils.getShortText(model.topic.title, textSize), value: 10, color: '#f0ad4e', font: {size: 16}, current: true });

                            // add parent
                            if(model.parentTopic) {
                                nodes.push({id: model.parentTopic._id, label: utils.getShortText(model.parentTopic.title, textSize) + '\n(up level)', value: 6, shapex: 'triangle', color: '#cc317c'});
                                edges.push({from: topicId, to: model.parentTopic._id, width: 4});
                                if(model.grandParentTopic) {
                                    nodes.push({id: model.grandParentTopic._id, label: utils.getShortText(model.grandParentTopic.title, textSize) + '\n(up 2 levels)', value: 4, shapex: 'triangle', color: '#cc317c'});
                                    edges.push({from: model.parentTopic._id, to: model.grandParentTopic._id});
                                } else {
                                    nodes.push({id: rootId, label: rootLabel+ '\n(up 2 levels)', value: 4, shapex: 'triangle', color: '#cc317c'});
                                    edges.push({from: rootId, to: model.parentTopic._id});
                                }
                            } else {
                                nodes.push({id: rootId, label: rootLabel + '\n(up level)', value: 6, shapex: 'triangle', color: '#cc317c'});
                                edges.push({from: rootId, to: topicId, width: 4});
                            }
                        }

                        // add children
                        var resultCounter = 0;
                        async.series({
                            topics: function (callback) {
                                if(results.length > 0) {
                                    async.each(results, function (result, callback) {
                                        resultCounter++;
                                        if (model.topic && resultCounter === nodeSize) {
                                            node = {id: result._id, label: 'more...', value: 6, color: '#FB7E81', more: true};
                                            node.originalLabel = node.label;
                                            node.topicId = model.topic._id;
                                            node.label += ' <i>*' + model.topic.childrenCount.topics.accepted + '</i>';
                                            nodes.push(node);
                                            edges.push({from: topicId, to: result._id, width: 4});
                                            return callback();
                                        }
                                        result.friendlyUrl = utils.urlify(result.title);
                                        result.shortTitle = utils.getShortText(result.contextTitle ? result.contextTitle : result.title, textSize);
                                        nodes.push({id: result._id, label: result.shortTitle, value: 6, color: '#FB7E81'});
                                        edges.push({from: topicId, to: result._id, width: 4});
                                        db.Topic
                                            .find({
                                                parentId: result._id,
                                                'screening.status': constants.SCREENING_STATUS.status1.code
                                            })
                                            .limit(nodeSize)
                                            .sort({title: 1})
                                            .lean()
                                            .exec(function (err, subtopics) {
                                                if (subtopics.length > 0) {
                                                    var subtopicCounter = 0;
                                                    subtopics.forEach(function (subtopic) {
                                                        subtopicCounter++;
                                                        if (subtopicCounter === nodeSize) {
                                                            node = {id: subtopic._id, label: 'more...', value: 4, more: true};
                                                            node.originalLabel = node.label;
                                                            node.topicId = result._id;
                                                            node.label += ' <i>*' + result.childrenCount.topics.accepted + '</i>';
                                                            nodes.push(node);
                                                            edges.push({from: subtopic._id, to: result._id});
                                                            return;
                                                        }
                                                        subtopic.friendlyUrl = utils.urlify(subtopic.title);
                                                        subtopic.shortTitle = utils.getShortText(subtopic.contextTitle ? subtopic.contextTitle : subtopic.title, textSize);
                                                        node = {id: subtopic._id, label: subtopic.shortTitle, value: 4};
                                                        if (subtopic.childrenCount.topics.accepted > 0) {
                                                            node.originalLabel = node.label;
                                                            node.label += ' <i>*' + subtopic.childrenCount.topics.accepted + '</i>';
                                                        }
                                                        nodes.push(node);
                                                        edges.push({from: subtopic._id, to: result._id});
                                                    });
                                                    result.subtopics = subtopics;
                                                }

                                                if(subtopics.length < (nodeSize - 2)) {
                                                    // if subtopics are less than nodeSize, get some arguments
                                                    var nodesNeeded = subtopics.length === 0 ? nodeSize : subtopics.length - 2;
                                                    var query = {
                                                        parentId: null,
                                                        ownerId: result._id,
                                                        ownerType: constants.OBJECT_TYPES.topic,
                                                        'screening.status': constants.SCREENING_STATUS.status1.code
                                                    };
                                                    flowUtils.getArguments(query, nodesNeeded, function (err, subarguments) {
                                                        subarguments.forEach(function (subargument) {
                                                            if (!nodes.find(function (item) {
                                                                    return subargument._id.equals(item.id);
                                                                })) {
                                                                flowUtils.setVerdictModel(subargument);
                                                                subargument.shortTitle = utils.getShortText(subargument.contextTitle ? subargument.contextTitle : subargument.title, textSize);
                                                                nodes.push({
                                                                    id: subargument._id,
                                                                    label: subargument.shortTitle,
                                                                    value: 4,
                                                                    shape: 'square',
                                                                    color: '#7BE141',
                                                                    type: 'argument'
                                                                });
                                                                edges.push({from: subargument._id, to: result._id});
                                                            }
                                                        });
                                                        callback();
                                                    });
                                                } else {
                                                    callback();
                                                }
                                            });
                                    }, function (err) {
                                        callback();
                                    });
                                } else {
                                    callback();
                                }
                            },
                            arguments: function (callback) {
                                if (model.topic && results.length < (nodeSize - 2)) {
                                    // if subtopics are less than nodeSize, get some arguments
                                    var nodesNeeded = results.length === 0 ? nodeSize : results.length - 2;
                                    var query = {
                                        parentId: null,
                                        ownerId: model.topic._id,
                                        ownerType: constants.OBJECT_TYPES.topic,
                                        'screening.status': constants.SCREENING_STATUS.status1.code
                                    };
                                    flowUtils.getArguments(query, nodesNeeded, function (err, subarguments) {
                                        subarguments.forEach(function (subargument) {
                                            if (!nodes.find(function (item) {
                                                    return subargument._id.equals(item.id);
                                                })) {
                                                flowUtils.setVerdictModel(subargument);
                                                subargument.shortTitle = utils.getShortText(subargument.contextTitle ? subargument.contextTitle : subargument.title, textSize);
                                                nodes.push({
                                                    id: subargument._id,
                                                    label: subargument.shortTitle,
                                                    value: 4,
                                                    shape: 'square',
                                                    color: '#7BE141',
                                                    type: 'argument'
                                                });
                                                edges.push({from: subargument._id, to: model.topic._id});
                                            }
                                        });
                                        callback();
                                    });
                                } else {
                                    callback();
                                }
                            }
                        }, function (err, results) {
                            callback();
                        });
                    });
            }
        }, function (err, results) {
            model.visualize = {
                nodes: nodes,
                edges: edges
            };
            flowUtils.setModelOwnerEntry(model);
            flowUtils.setModelContext(req, model);
            res.render(templates.wiki.visualize, model);
        });
    });
}

module.exports = function (router) {

    router.get('(/topic)?(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        GET_index(req, res);
    });
};

module.exports.GET_index = GET_index;