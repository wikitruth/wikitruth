'use strict';

var db          = require('../app').db.models,
    utils       = require('./utils'),
    constants   = require('../models/constants'),
    config      = require('../config/config'),
    url         = require('url'),
    querystring = require('querystring'),
    htmlToText  = require('html-to-text'),
    moment      = require('moment'),
    async       = require('async');

var mn = " 12:00 AM";

function getBackupDir(isPrivate) {
    var backupRoot = isPrivate && config.mongodb.privateBackupRoot ? config.mongodb.privateBackupRoot : config.mongodb.backupRoot;
    if(backupRoot) {
        if(backupRoot.startsWith('~')) {
            return __dirname + '/..' + backupRoot.substring(1);
        }
        return backupRoot;
    }
    return __dirname + '/../config/mongodb' + (isPrivate ? '/users' : '');
}

function isEntryOwner(req, item) {
    return item && item.createUserId && req.user && req.user.id && item.createUserId.equals(req.user.id);
}

function appendOwnerFlag(req, item, model) {
    if(isEntryOwner(req, item)) {
        model.isItemOwner = true;
    }
}

function isCategoryTopic(entry) {
    return entry.tags.indexOf(constants.TOPIC_TAGS.tag510.code) > -1;
}

function appendListExtra(item) {
    if(item.title) {
        item.friendlyUrl = utils.urlify(item.title);
        item.shortTitle = utils.getShortText(item.title);
    }
}

function appendEntryExtra(item) {
    appendListExtra(item);
    item.comments = utils.randomInt(0,999);
    item.points = utils.randomInt(0,9999);

    //var editDateString = result.editDate.toUTCString();
    item.editDateString = utils.timeSince(item.editDate, true) + ' ago';
    item.createDateString = utils.timeSince(item.createDate, true) + ' ago';

    item.sameEditor = item.createUserId.toString() === item.editUserId.toString();
    item.sameEditDate = item.createDate.valueOf() === item.editDate.valueOf();

    if(item.referenceDate) {
        var refDate = moment(item.referenceDate);
        item.referenceDateString = item.referenceDate.toLocaleString(); // FIXME: using this on front-end might produce an issue when the locale of the server does not match the locale of the client.
        item.referenceDateUTC = item.referenceDate.toUTCString();
        //item.referenceDateSimple = item.referenceDate.toLocaleString(); // toDateString(): Tue Dec 27 2016, toLocaleString(): 12/27/2016, 8:50:00 PM, toISOString(): 2016-12-27T12:50:00.000Z
        item.referenceDateSimple = refDate.format('lll'); // see https://momentjs.com/docs/#/displaying/format/
        if(item.referenceDateSimple.endsWith(mn)) {
            item.referenceDateSimple = item.referenceDateSimple.substring(0, item.referenceDateSimple.length - mn.length);
        }
    }
}

function setEntryParents(items, typeId, callback) {
    if(!items || items.length === 0) { return callback(); }

    var topicIds = [], topicLinkIds = [], argumentIds = [], argumentLinkIds = [], questionIds = [], answerIds =[], issueIds = [], opinionIds = [];
    var topics = {}, topicLinks = {}, args = {}, argumentLinks = {}, questions = {}, answers = {}, issues = {}, opinions = {};
    switch (typeId) {
        case constants.OBJECT_TYPES.topic:
            items.forEach(function (item) {
                if(item.parentId && !topicIds[item.parentId.valueOf()]) {
                    topicIds.push(item.parentId.valueOf());
                }
            });
            break;
        case constants.OBJECT_TYPES.argument:
            items.forEach(function (item) {
                if(item.parentId && !argumentIds[item.parentId.valueOf()]) {
                    argumentIds.push(item.parentId.valueOf());
                } else if(!topicIds[item.ownerId.valueOf()]){
                    topicIds.push(item.ownerId.valueOf());
                }
            });
            break;
        case constants.OBJECT_TYPES.answer:
            items.forEach(function (item) {
                questionIds.push(item.questionId.valueOf());
            });
            break;
        case constants.OBJECT_TYPES.question:
        case constants.OBJECT_TYPES.issue:
        case constants.OBJECT_TYPES.opinion:
            items.forEach(function (item) {
                switch (item.ownerType) {
                    case constants.OBJECT_TYPES.topic:
                        topicIds.push(item.ownerId.valueOf());
                        break;
                    case constants.OBJECT_TYPES.topicLink:
                        topicLinkIds.push(item.ownerId.valueOf());
                        break;
                    case constants.OBJECT_TYPES.argument:
                        argumentIds.push(item.ownerId.valueOf());
                        break;
                    case constants.OBJECT_TYPES.argumentLink:
                        argumentLinkIds.push(item.ownerId.valueOf());
                        break;
                    case constants.OBJECT_TYPES.question:
                        questionIds.push(item.ownerId.valueOf());
                        break;
                    case constants.OBJECT_TYPES.answer:
                        answerIds.push(item.ownerId.valueOf());
                        break;
                    case constants.OBJECT_TYPES.issue:
                        issueIds.push(item.ownerId.valueOf());
                        break;
                    case constants.OBJECT_TYPES.opinion:
                        opinionIds.push(item.ownerId.valueOf());
                        break;
                }
            });
            break;
    }

    async.parallel({
        topics: function (callback) {
            if(topicIds.length > 0) {
                db.Topic
                    .find({ _id: { $in: topicIds }})
                    .exec(function (err, results) {
                        results.forEach(function (result) {
                            appendListExtra(result);
                            topics[result._id.valueOf()] = result;
                        });
                        callback();
                    });
            } else {
                callback();
            }
        },
        topicLinks: function (callback) {
            if(topicLinkIds.length > 0) {
                db.TopicLink
                    .find({ _id: { $in: topicLinkIds }})
                    .exec(function (err, linkResults) {
                        var topicIds2 = [], topics2 = {};
                        linkResults.forEach(function (result) {
                            topicIds2.push(result.topicId.valueOf());
                        });
                        db.Topic
                            .find({ _id: { $in: topicIds2 }})
                            .exec(function (err, topicResults) {
                                topicResults.forEach(function (result) {
                                    appendListExtra(result);
                                    topics2[result._id.valueOf()] = result;
                                });
                                linkResults.forEach(function (result) {
                                    result.topic = topics2[result.topicId.valueOf()];
                                    result.title2 = result.title ? result.title : result.topic.title;
                                    topicLinks[result._id.valueOf()] = result;
                                });
                                callback();
                            });
                    });
            } else {
                callback();
            }
        },
        arguments: function (callback) {
            if(argumentIds.length > 0) {
                var query = {_id: {$in: argumentIds}};
                db.Argument
                    .find(query)
                    .exec(function (err, results) {
                        results.forEach(function (result) {
                            appendListExtra(result);
                            args[result._id.valueOf()] = result;
                        });
                        callback();
                    });
            } else {
                callback();
            }
        },
        argumentLinks: function (callback) {
            if(argumentLinkIds.length > 0) {
                db.ArgumentLink
                    .find({ _id: { $in: argumentLinkIds }})
                    .exec(function (err, results) {
                        var argumentIds2 = [], arguments2 = {};
                        results.forEach(function (result) {
                            argumentIds2.push(result.argumentId.valueOf());
                        });
                        db.Argument
                            .find({ _id: { $in: argumentIds2 }})
                            .exec(function (err, results2) {
                                results2.forEach(function (result) {
                                    appendListExtra(result);
                                    arguments2[result._id.valueOf()] = result;
                                });
                                results.forEach(function (result) {
                                    result.argument = arguments2[result.argumentId.valueOf()];
                                    result.title2 = result.title ? result.title : result.argument.title;
                                    argumentLinks[result._id.valueOf()] = result;
                                });
                                callback();
                        });
                    });
            } else {
                callback();
            }
        },
        questions: function (callback) {
            if(questionIds.length > 0) {
                var query = {_id: {$in: questionIds}};
                db.Question
                    .find(query)
                    .exec(function (err, results) {
                        results.forEach(function (result) {
                            appendListExtra(result);
                            questions[result._id.valueOf()] = result;
                        });
                        callback();
                    });
            } else {
                callback();
            }
        },
        answers: function (callback) {
            if(answerIds.length > 0) {
                var query = {_id: {$in: answerIds}};
                db.Answer
                    .find(query)
                    .exec(function (err, results) {
                        results.forEach(function (result) {
                            appendListExtra(result);
                            answers[result._id.valueOf()] = result;
                        });
                        callback();
                    });
            } else {
                callback();
            }
        },
        issues: function (callback) {
            if(issueIds.length > 0) {
                var query = {_id: {$in: issueIds}};
                db.Issue
                    .find(query)
                    .exec(function (err, results) {
                        results.forEach(function (result) {
                            appendListExtra(result);
                            issues[result._id.valueOf()] = result;
                        });
                        callback();
                    });
            } else {
                callback();
            }
        },
        opinions: function (callback) {
            if(opinionIds.length > 0) {
                var query = {_id: {$in: opinionIds}};
                db.Opinion
                    .find(query)
                    .exec(function (err, results) {
                        results.forEach(function (result) {
                            appendListExtra(result);
                            opinions[result._id.valueOf()] = result;
                        });
                        callback();
                    });
            } else {
                callback();
            }
        }
    }, function (err, results) {

        switch (typeId) {
            case constants.OBJECT_TYPES.topic:
                items.forEach(function (item) {
                    if(item.parentId) {
                        item.parentTopic = topics[item.parentId.valueOf()];
                    }
                });
                break;
            case constants.OBJECT_TYPES.argument:
                items.forEach(function (item) {
                    if(item.parentId) {
                        item.parentArgument = args[item.parentId.valueOf()];
                    } else {
                        item.parentTopic = topics[item.ownerId.valueOf()];
                    }
                });
                break;
            case constants.OBJECT_TYPES.answer:
                items.forEach(function (item) {
                    item.parentQuestion = questions[item.questionId.valueOf()];
                });
                break;
            case constants.OBJECT_TYPES.question:
            case constants.OBJECT_TYPES.issue:
            case constants.OBJECT_TYPES.opinion:
                items.forEach(function (item) {
                    switch (item.ownerType) {
                        case constants.OBJECT_TYPES.topic:
                            item.parentTopic = topics[item.ownerId.valueOf()];
                            break;
                        case constants.OBJECT_TYPES.topicLink:
                            item.parentTopicLink = topicLinks[item.ownerId.valueOf()];
                            break;
                        case constants.OBJECT_TYPES.argument:
                            item.parentArgument = args[item.ownerId.valueOf()];
                            break;
                        case constants.OBJECT_TYPES.argumentLink:
                            item.parentArgumentLink = argumentLinks[item.ownerId.valueOf()];
                            break;
                        case constants.OBJECT_TYPES.question:
                            item.parentQuestion = questions[item.ownerId.valueOf()];
                            break;
                        case constants.OBJECT_TYPES.answer:
                            item.parentAnswer = answers[item.ownerId.valueOf()];
                            break;
                        case constants.OBJECT_TYPES.issue:
                            item.parentIssue = issues[item.ownerId.valueOf()];
                            break;
                        case constants.OBJECT_TYPES.opinion:
                            item.parentOpinion = opinions[item.ownerId.valueOf()];
                            break;
                    }
                });
                break;
        }

        callback();
    });
}

function setEditorsUsername(items, callback) {
    if(items && items.length > 0) {
        var seen = {};
        var userIds = items
            .filter(function (item) {
                var id = item.editUserId ? item.editUserId.valueOf() : null;
                if (!id || seen[id]) {
                    return;
                }
                seen[id] = true;
                return item;
                //return !!item.editUserId;
            }).map(function (item) {
                return item.editUserId;
            }
        );

        var query = {
            _id: {
                $in: userIds
            }
        };

        db.User.find(query, {username: 1}, function (err, results) {
            var userNames = {};
            results.forEach(function (result) {
                userNames[result._id.valueOf()] = result.username;
            });
            items.forEach(function (item) {
                if (item.editUserId) {
                    item.editUsername = userNames[item.editUserId.valueOf()];
                }
            });
            callback();
        });
    } else {
        callback();
    }
}

function setCreateUsername(item, callback) {
    db.User.findOne({_id: item.createUserId}, function (err, user) {
        item.createUsername = user.username;
        callback(err);
    });
}

function setEditUsername(item, callback) {
    db.User.findOne({_id: item.editUserId}, function (err, user) {
        item.editUsername = user.username;
        callback(err);
    });
}

function setUsername(item, callback) {
    setCreateUsername(item, function (err) {
        if(item.createUserId === item.editUserId) {
            item.editUsername = item.createUsername;
            callback(err);
        } else {
            setEditUsername(item, callback);
        }
    });
}

function setQuestionModel(req, model, callback) {
    if(req.query.question) {
        db.Question.findOne({_id: req.query.question}, function (err, result) {
            model.question = result;
            appendEntryExtra(result);
            if(isEntryOwner(req, result)) {
                model.isQuestionOwner = true;
            }
            setUsername(result, callback);
        });
    } else {
        callback();
    }
}

function setAnswerModel(req, model, callback) {
    if(req.query.answer) {
        db.Answer.findOne({_id: req.query.answer}, function (err, result) {
            model.answer = result;
            appendEntryExtra(result);
            if(isEntryOwner(req, result)) {
                model.isAnswerOwner = true;
            }
            setUsername(result, callback);
        });
    } else {
        callback();
    }
}

function setIssueModel(req, model, callback) {
    if(req.query.issue) {
        db.Issue.findOne({_id: req.query.issue}, function (err, result) {
            model.issue = result;
            appendEntryExtra(result);
            if(isEntryOwner(req, result)) {
                model.isIssueOwner = true;
            }
            setUsername(result, callback);
        });
    } else {
        callback();
    }
}

function setOpinionModel(req, model, callback) {
    if(req.query.opinion) {
        async.series({
            opinion: function (callback) {
                db.Opinion.findOne({_id: req.query.opinion}, function (err, result) {
                    if(err || !result) {
                        return callback(err);
                    }
                    if(model.opinion) {
                        model.opinion2 = result;
                    } else {
                        model.opinion = result;
                    }
                    appendEntryExtra(result);
                    if (isEntryOwner(req, result)) {
                        if(model.opinion2) {
                            model.isOpinionOwner2 = true;
                        } else {
                            model.isOpinionOwner = true;
                        }
                    }
                    setUsername(result, callback);
                });
            },
            parentOpinion: function (callback) {
                var opinion = model.opinion2 || model.opinion;
                if(opinion && opinion.parentId) {
                    db.Opinion.findOne({_id: opinion.parentId}, function (err, result) {
                        if (result) {
                            appendEntryExtra(result);
                            if(model.opinion2) {
                                model.parentOpinion2 = result;
                            } else {
                                model.parentOpinion = result;
                            }
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            },
            grandParentOpinion: function (callback) {
                var parentOpinion = model.parentOpinion2 || model.parentOpinion;
                if(parentOpinion && parentOpinion.parentId) {
                    db.Opinion.findOne({_id: parentOpinion.parentId}, function (err, result) {
                        if (result) {
                            appendEntryExtra(result);
                            if(model.opinion2) {
                                model.grandParentOpinion2 = result;
                            } else {
                                model.grandParentOpinion = result;
                            }
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

function setArgumentLinkModel(req, model, callback) {
    if(req.query.argumentLink) {
        async.series({
            argumentLink: function (callback) {
                db.ArgumentLink.findOne({_id: req.query.argumentLink}, function(err, result) {
                    model.argumentLink = result;
                    appendEntryExtra(result);
                    if(isEntryOwner(req, result)) {
                        model.isArgumentLinkOwner = true;
                    }
                    setUsername(result, callback);
                });
            },
            argument: function (callback) {
                if(model.argumentLink) {
                    db.Argument.findOne({_id: model.argumentLink.argumentId}, function (err, result) {
                        if (result) {
                            appendEntryExtra(result);
                            model.argumentLink.argument = result;
                            model.argumentLink.references = result.references;
                            model.argumentLink.title2 = model.argumentLink.title ? model.argumentLink.title : result.title;
                            model.argumentLink.content2 = result.content;
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

function setArgumentModels(req, model, callback) {
    if(req.query.argument) {
        async.series({
            argument: function (callback) {
                db.Argument.findOne({_id: req.query.argument}, function (err, result) {
                    if(err || !result) {
                        return callback(err);
                    }
                    model.argument = result;
                    appendEntryExtra(result);
                    if (isEntryOwner(req, result)) {
                        model.isArgumentOwner = true;
                    }
                    setUsername(result, callback);
                });
            },
            parentArgument: function (callback) {
                if(model.argument && model.argument.parentId) {
                    db.Argument.findOne({_id: model.argument.parentId}, function (err, result) {
                        if (result) {
                            appendEntryExtra(result);
                            model.parentArgument = result;
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            },
            grandParentArgument: function (callback) {
                if(model.parentArgument && model.parentArgument.parentId) {
                    db.Argument.findOne({_id: model.parentArgument.parentId}, function (err, result) {
                        if (result) {
                            appendEntryExtra(result);
                            model.grandParentArgument = result;
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

function setTopicLinkModel(req, model, callback) {
    if(req.query.topicLink) {
        async.series({
            topicLink: function (callback) {
                db.TopicLink.findOne({_id: req.query.topicLink}, function(err, result) {
                    model.topicLink = result;
                    appendEntryExtra(result);
                    if(isEntryOwner(req, result)) {
                        model.isTopicLinkOwner = true;
                    }
                    setUsername(result, callback);
                });
            },
            topic: function (callback) {
                if(model.topicLink) {
                    db.Topic.findOne({_id: model.topicLink.topicId}, function (err, result) {
                        if (result) {
                            appendEntryExtra(result);
                            model.topicLink.topic = result;
                            model.topicLink.references = result.references;
                            model.topicLink.title2 = model.topicLink.title ? model.topicLink.title : result.title;
                            model.topicLink.content2 = result.content;
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

function setTopicModels(req, model, callback) {
    var query = { _id: model.argument ? model.argument.ownerId : req.query.topic ? req.query.topic : null };
    if(!query._id && req.query.friendlyUrl) {
        delete query._id;
        query.friendlyUrl = req.query.friendlyUrl;
    }
    if(query._id || query.friendlyUrl) {
        async.series({
            topic: function (callback) {
                db.Topic.findOne(query, function(err, result) {
                    if(err || !result) {
                        return callback(err);
                    }
                    model.topic = result;
                    appendEntryExtra(result);
                    if(isEntryOwner(req, result)) {
                        model.isTopicOwner = true;
                    }
                    setUsername(result, callback);
                });
            },
            parentTopic: function (callback) {
                if(model.topic && model.topic.parentId) {
                    db.Topic.findOne({_id: model.topic.parentId}, function (err, result) {
                        if (result) {
                            appendEntryExtra(result);
                            model.parentTopic = result;
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            },
            grandParentTopic: function (callback) {
                if(model.parentTopic && model.parentTopic.parentId) {
                    db.Topic.findOne({_id: model.parentTopic.parentId}, function (err, result) {
                        if (result) {
                            appendEntryExtra(result);
                            model.grandParentTopic = result;
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

/**
 * Retrieves the entry from query.ownerId, query.ownerType
 * @param query: ownerId and ownerType is required
 * @param req: only used by specific setters (setTopicModels, setArgumentModels, etc)
 * @param model
 * @param callback
 * @returns void
 */
function setEntryModels(query, req, model, callback) {
    if(!query.ownerType || query.ownerType === -1) { // if the query or entry does not follow owner id/type concept.
        return callback();
    }

    if(query.ownerType === constants.OBJECT_TYPES.topic) {
        req.query.topic = query.ownerId;
        setTopicModels(req, model, callback);
    } else if(query.ownerType === constants.OBJECT_TYPES.topicLink) {
        req.query.topicLink = query.ownerId;
        setTopicLinkModel(req, model, function () {
            var q = { ownerType: constants.OBJECT_TYPES.topic, ownerId: model.topicLink.parentId };
            setEntryModels(q, req, model, callback);
        });
    } else if(query.ownerType === constants.OBJECT_TYPES.argument) {
        req.query.argument = query.ownerId;
        setArgumentModels(req, model, function () {
            setTopicModels(req, model, callback);
        });
    } else if(query.ownerType === constants.OBJECT_TYPES.argumentLink) {
        req.query.argumentLink = query.ownerId;
        setArgumentLinkModel(req, model, function () {
            var q = model.argumentLink.parentId ? { ownerType: constants.OBJECT_TYPES.argument, ownerId: model.argumentLink.parentId } : model.argumentLink;
            setEntryModels(q, req, model, callback);
        });
    } else if(query.ownerType === constants.OBJECT_TYPES.question) {
        req.query.question = query.ownerId;
        setQuestionModel(req, model, function () {
            setEntryModels(model.question, req, model, callback);
        });
    } else if(query.ownerType === constants.OBJECT_TYPES.answer) {
        req.query.answer = query.ownerId;
        setAnswerModel(req, model, function () {
            var q = { ownerType: constants.OBJECT_TYPES.question, ownerId: model.answer.questionId };
            setEntryModels(q, req, model, callback);
        });
    } else if(query.ownerType === constants.OBJECT_TYPES.issue) {
        req.query.issue = query.ownerId;
        setIssueModel(req, model, function () {
            setEntryModels(model.issue, req, model, callback);
        });
    } else if(query.ownerType === constants.OBJECT_TYPES.opinion) {
        req.query.opinion = query.ownerId;
        setOpinionModel(req, model, function () {
            setEntryModels(model.opinion2 || model.opinion, req, model, callback);
        });
    } else {
        callback();
    }
}

function setClipboardModel(req, model, entryType) {
    model.clipboard = {};
    var clipboard = req.session.clipboard;
    if(clipboard) {
        var topics = clipboard['object' + constants.OBJECT_TYPES.topic];
        var args = clipboard['object' + constants.OBJECT_TYPES.argument];
        var count = topics.length + args.length;
        if (count > 0) {
            model.clipboard.count = count;
            var marked = false;
            if(entryType) {
                if ((entryType === constants.OBJECT_TYPES.topic && model.topic && topics.indexOf(model.topic._id.toString()) > -1) ||
                    (entryType === constants.OBJECT_TYPES.argument && model.argument && args.indexOf(model.argument._id.toString()) > -1)) {
                    model.clipboard.marked = true;
                    marked = true;
                }
            }
            if(!(count === 1 && marked)) {
                model.clipboard.canPaste = true;
            }
        }
    }

    if(model.entry || model.clipboard.count) {
        model.clipboard.visible = true;
    }
}

function getTopics(query, limit, callback) {
    async.parallel({
        children: function (callback) {
            db.Topic
                .find(query)
                .limit(limit)
                .sort({ title: 1 })
                .lean()
                .exec(function(err, results) {
                    setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            appendEntryExtra(result);
                            //result.link = false;
                        });
                        callback(null, results);
                    });
            });
        },
        links: function (callback) {
            db.TopicLink
                .find(query)
                .limit(limit)
                .lean()
                .exec(function(err, links) {
                    if(links.length > 0) {
                        var ids = links.map(function (link) {
                            return link.topicId;
                        });
                        var query = { _id: { $in: ids } };
                        db.Topic
                            .find(query)
                            .limit(limit)
                            .sort({title: 1})
                            .lean()
                            .exec(function (err, results) {
                                if(results.length > 0) {
                                    // Get parents for rendering the subtitle
                                    var parentIds = results.filter(function (result) {
                                            return !!result.parentId;
                                        }).map(function (result) {
                                            return result.parentId;
                                        });
                                    query = { _id: { $in: parentIds } };
                                    db.Topic
                                        .find(query)
                                        .lean()
                                        .exec(function (err, linkParents) {
                                            setEditorsUsername(results, function () {
                                                results.forEach(function (result) {
                                                    appendEntryExtra(result);
                                                    var link = links.find(function (link) {
                                                        return link.topicId.equals(result._id);
                                                    });
                                                    if (link) {
                                                        var linkParent = linkParents.find(function (linkParent) {
                                                            return linkParent._id.equals(result.parentId);
                                                        });
                                                        if(linkParent) {
                                                            appendListExtra(linkParent);
                                                        }
                                                        result.parentTopic = linkParent;
                                                        result.link = link;
                                                    }
                                                });
                                                callback(null, results);
                                            });
                                        });
                                } else {
                                    callback(null, results);
                                }
                            });
                    } else {
                        callback(null, []);
                    }
            });
        }
    }, function (err, results) {
        var topics = results.children.concat(results.links).sort(utils.titleCompare);
        callback(null, topics);
    });
}

function getArguments(query, limit, callback) {
    async.parallel({
        children: function (callback) {
            db.Argument
                .find(query)
                .limit(limit)
                .sort({ title: 1 })
                .lean()
                .exec(function(err, results) {
                    setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            appendEntryExtra(result);
                            //result.link = false;
                            //result.against = false;
                        });
                        callback(null, results);
                    });
            });
        },
        links: function (callback) {
            db.ArgumentLink
                .find(query)
                .limit(limit)
                .lean()
                .exec(function(err, links) {
                    if(links.length > 0) {
                        var ids = links.map(function (link) {
                            return link.argumentId;
                        });
                        var query = { _id: { $in: ids } };
                        db.Argument
                            .find(query)
                            .limit(limit)
                            .sort({title: 1})
                            .lean()
                            .exec(function (err, results) {
                                if(results.length > 0) {
                                    async.parallel({
                                        parentTopics: function (callback) {
                                            var topicIds = results.filter(function (result) {
                                                return !result.parentId && result.ownerId;
                                            }).map(function (result) {
                                                return result.ownerId;
                                            });
                                            db.Topic
                                                .find({ _id: { $in: topicIds } })
                                                .lean()
                                                .exec(function (err, parentTopics) {
                                                    callback(null, parentTopics);
                                                });
                                        },
                                        parentArguments: function (callback) {
                                            var parentIds = results.filter(function (result) {
                                                return !!result.parentId;
                                            }).map(function (result) {
                                                return result.parentId;
                                            });
                                            query = { _id: { $in: parentIds } };
                                            db.Argument
                                                .find(query)
                                                .lean()
                                                .exec(function (err, parentArguments) {
                                                    callback(null, parentArguments);
                                                });
                                        }
                                    }, function (err, linkParents) {
                                        setEditorsUsername(results, function () {
                                            results.forEach(function (result) {
                                                appendEntryExtra(result);
                                                var link = links.find(function (link) {
                                                    return link.argumentId.equals(result._id);
                                                });
                                                if (link) {
                                                    if(result.parentId) {
                                                        var parentArgument = linkParents.parentArguments.find(function (linkParent) {
                                                            return linkParent._id.equals(result.parentId);
                                                        });
                                                        if(parentArgument) {
                                                            appendListExtra(parentArgument);
                                                        }
                                                        result.parentArgument = parentArgument;
                                                    } else if(result.ownerType === constants.OBJECT_TYPES.topic && result.ownerId) {
                                                        var linkParent = linkParents.parentTopics.find(function (linkParent) {
                                                            return linkParent._id.equals(result.ownerId);
                                                        });
                                                        if(linkParent) {
                                                            appendListExtra(linkParent);
                                                        }
                                                        result.parentTopic = linkParent;
                                                    }
                                                    result.link = link;
                                                    result.against = link.against;
                                                }
                                            });
                                            callback(null, results);
                                        });
                                    });
                                } else {
                                    callback(null, results);
                                }
                            });
                    } else {
                        callback(null, []);
                    }
            });
        }
    }, function (err, results) {
        var args = results.children.concat(results.links).sort(utils.titleCompare);
        callback(null, args);
    });
}

function getTopIssues(query, model, callback) {
    db.Issue
        .find(query)
        .limit(15)
        .lean()
        .sort({ title: 1 })
        .exec(function(err, results) {
            setEditorsUsername(results, function() {
                results.forEach(function (result) {
                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                    appendEntryExtra(result);
                });
                model.issues = results;
                callback();
            });
        });
}

function getTopOpinions(query, model, callback) {
    db.Opinion
        .find(query)
        .limit(15)
        .sort({ title: 1 })
        .lean()
        .exec(function(err, results) {
            setEditorsUsername(results, function() {
                results.forEach(function (result) {
                    appendEntryExtra(result);
                });
                model.opinions = results;
                callback();
            });
        });
}

/**
 * Updates the childrenCount property of the specified entry
 * @param entryId: parent entryId
 * @param entryType: parent entryType
 * @param specificEntryType: specific child entries to update
 * @param callback
 */
function updateChildrenCount(entryId, entryType, specificEntryType, callback) {
    var countNode = {};
    var model = {}, req = {};

    var updateTopics = function (callback) {
        if(!specificEntryType || specificEntryType === constants.OBJECT_TYPES.topic) {
            var topics = countNode.childrenCount.topics;
            async.parallel({
                accepted: function(callback) {
                    var query = {parentId: entryId, 'screening.status': constants.SCREENING_STATUS.status1.code };
                    db.Topic.count(query, function (err, count) {
                        db.TopicLink.count(query, function (err, linkCount) {
                            topics.accepted = count + linkCount;
                            callback();
                        });
                    });
                },
                pending: function(callback) {
                    var query = {parentId: entryId, 'screening.status': constants.SCREENING_STATUS.status0.code };
                    db.Topic.count(query, function (err, count) {
                        db.TopicLink.count(query, function (err, linkCount) {
                            topics.pending = count + linkCount;
                            callback();
                        });
                    });
                },
                rejected: function(callback) {
                    var query = {parentId: entryId, 'screening.status': constants.SCREENING_STATUS.status2.code };
                    db.Topic.count(query, function (err, count) {
                        db.TopicLink.count(query, function (err, linkCount) {
                            topics.rejected = count + linkCount;
                            callback();
                        });
                    });
                }
            }, function (err, results) {
                topics.total = topics.accepted + topics.pending + topics.rejected;
                callback();
            });
        } else {
            callback();
        }
    };
    var updateArguments = function (callback) {
        if(!specificEntryType || specificEntryType === constants.OBJECT_TYPES.argument) {
            var args = countNode.childrenCount['arguments'];
            var q = { ownerId: model.argument ? model.argument.ownerId : entryId, parentId: model.argument ? model.argument._id : null };
            async.parallel({
                accepted: function(callback) {
                    var query = { ownerId: q.ownerId, parentId: q.parentId, 'screening.status': constants.SCREENING_STATUS.status1.code };
                    db.Argument.count(query, function (err, count) {
                        db.ArgumentLink.count(query, function (err, linkCount) {
                            args.accepted = count + linkCount;
                            callback();
                        });
                    });
                },
                pending: function(callback) {
                    var query = { ownerId: q.ownerId, parentId: q.parentId, 'screening.status': constants.SCREENING_STATUS.status0.code };
                    db.Argument.count(query, function (err, count) {
                        db.ArgumentLink.count(query, function (err, linkCount) {
                            args.pending = count + linkCount;
                            callback();
                        });
                    });
                },
                rejected: function(callback) {
                    var query = { ownerId: q.ownerId, parentId: q.parentId, 'screening.status': constants.SCREENING_STATUS.status2.code };
                    db.Argument.count(query, function (err, count) {
                        db.ArgumentLink.count(query, function (err, linkCount) {
                            args.rejected = count + linkCount;
                            callback();
                        });
                    });
                }
            }, function (err, results) {
                args.total = args.accepted + args.pending + args.rejected;
                callback();
            });
        } else {
            callback();
        }
    };
    var updateQuestions = function (callback) {
        if(!specificEntryType || specificEntryType === constants.OBJECT_TYPES.question) {
            var questions = countNode.childrenCount.questions;
            async.parallel({
                accepted: function(callback) {
                    db.Question.count({ ownerId: entryId, 'screening.status': constants.SCREENING_STATUS.status1.code }, function (err, count) {
                        questions.accepted = count;
                        callback();
                    });
                },
                pending: function(callback) {
                    db.Question.count({ ownerId: entryId, 'screening.status': constants.SCREENING_STATUS.status0.code }, function (err, count) {
                        questions.pending = count;
                        callback();
                    });
                },
                rejected: function(callback) {
                    db.Question.count({ ownerId: entryId, 'screening.status': constants.SCREENING_STATUS.status2.code }, function (err, count) {
                        questions.rejected = count;
                        callback();
                    });
                }
            }, function (err, results) {
                questions.total = questions.accepted + questions.pending + questions.rejected;
                callback();
            });
        } else {
            callback();
        }
    };
    var updateAnswers = function (callback) {
        if(!specificEntryType || specificEntryType === constants.OBJECT_TYPES.answer) {
            var answers = countNode.childrenCount.answers;
            async.parallel({
                accepted: function(callback) {
                    db.Answer.count({ questionId: entryId, 'screening.status': constants.SCREENING_STATUS.status1.code }, function (err, count) {
                        answers.accepted = count;
                        callback();
                    });
                },
                pending: function(callback) {
                    db.Answer.count({ questionId: entryId, 'screening.status': constants.SCREENING_STATUS.status0.code }, function (err, count) {
                        answers.pending = count;
                        callback();
                    });
                },
                rejected: function(callback) {
                    db.Answer.count({ questionId: entryId, 'screening.status': constants.SCREENING_STATUS.status2.code }, function (err, count) {
                        answers.rejected = count;
                        callback();
                    });
                }
            }, function (err, results) {
                answers.total = answers.accepted + answers.pending + answers.rejected;
                callback();
            });
        } else {
            callback();
        }
    };
    var updateIssues = function (callback) {
        if(!specificEntryType || specificEntryType === constants.OBJECT_TYPES.issue) {
            var issues = countNode.childrenCount.issues;
            async.parallel({
                accepted: function(callback) {
                    db.Issue.count({ ownerId: entryId, 'screening.status': constants.SCREENING_STATUS.status1.code }, function (err, count) {
                        issues.accepted = count;
                        callback();
                    });
                },
                pending: function(callback) {
                    db.Issue.count({ ownerId: entryId, 'screening.status': constants.SCREENING_STATUS.status0.code }, function (err, count) {
                        issues.pending = count;
                        callback();
                    });
                },
                rejected: function(callback) {
                    db.Issue.count({ ownerId: entryId, 'screening.status': constants.SCREENING_STATUS.status2.code }, function (err, count) {
                        issues.rejected = count;
                        callback();
                    });
                }
            }, function (err, results) {
                issues.total = issues.accepted + issues.pending + issues.rejected;
                callback();
            });
        } else {
            callback();
        }
    };
    var updateOpinions = function (callback) {
        if(!specificEntryType || specificEntryType === constants.OBJECT_TYPES.opinion) {
            var opinions = countNode.childrenCount.opinions;
            async.parallel({
                accepted: function(callback) {
                    db.Opinion.count({ ownerId: entryId, 'screening.status': constants.SCREENING_STATUS.status1.code }, function (err, count) {
                        opinions.accepted = count;
                        callback();
                    });
                },
                pending: function(callback) {
                    db.Opinion.count({ ownerId: entryId, 'screening.status': constants.SCREENING_STATUS.status0.code }, function (err, count) {
                        opinions.pending = count;
                        callback();
                    });
                },
                rejected: function(callback) {
                    db.Opinion.count({ ownerId: entryId, 'screening.status': constants.SCREENING_STATUS.status2.code }, function (err, count) {
                        opinions.rejected = count;
                        callback();
                    });
                }
            }, function (err, results) {
                opinions.total = opinions.accepted + opinions.pending + opinions.rejected;
                callback();
            });
        } else {
            callback();
        }
    };

    switch (entryType) {
        case constants.OBJECT_TYPES.topic:
            req = {query: {topic: entryId}};
            setEntryModels(createOwnerQueryFromQuery(req), req, model, function () {
                countNode = {childrenCount: model.topic.childrenCount};
                async.parallel({
                    topics: updateTopics,
                    arguments: updateArguments,
                    questions: updateQuestions,
                    issues: updateIssues,
                    opinions: updateOpinions
                }, function (err, results) {
                    db.Topic.update({_id: entryId}, {
                        $set: countNode
                    }, function (err, num) {
                        callback();
                    });
                });
            });
            break;

        case constants.OBJECT_TYPES.topicLink:
            req = { query: { topicLink: entryId } };
            setEntryModels(createOwnerQueryFromQuery(req), req, model, function () {
                countNode = { childrenCount: model.topicLink.childrenCount };
                async.parallel({
                    issues: updateIssues,
                    opinions: updateOpinions
                }, function (err, results) {
                    db.TopicLink.update({_id: entryId}, {
                        $set: countNode
                    }, function (err, num) {
                        callback();
                    });
                });
            });
            break;

        case constants.OBJECT_TYPES.argument:
            req = { query: { argument: entryId } };
            setEntryModels(createOwnerQueryFromQuery(req), req, model, function () {
                countNode = { childrenCount: model.argument.childrenCount };
                async.parallel({
                    arguments: updateArguments,
                    questions: updateQuestions,
                    issues: updateIssues,
                    opinions: updateOpinions
                }, function (err, results) {
                    db.Argument.update({_id: entryId}, {
                        $set: countNode
                    }, function (err, num) {
                        callback();
                    });
                });
            });
            break;

        case constants.OBJECT_TYPES.argumentLink:
            req = { query: { argumentLink: entryId } };
            setEntryModels(createOwnerQueryFromQuery(req), req, model, function () {
                countNode = { childrenCount: model.argumentLink.childrenCount };
                async.parallel({
                    issues: updateIssues,
                    opinions: updateOpinions
                }, function (err, results) {
                    db.ArgumentLink.update({_id: entryId}, {
                        $set: countNode
                    }, function (err, num) {
                        callback();
                    });
                });
            });
            break;

        case constants.OBJECT_TYPES.question:
            req = { query: { question: entryId } };
            setEntryModels(createOwnerQueryFromQuery(req), req, model, function () {
                countNode = { childrenCount: model.question.childrenCount };
                async.parallel({
                    answers: updateAnswers,
                    issues: updateIssues,
                    opinions: updateOpinions
                }, function (err, results) {
                    db.Question.update({_id: entryId}, {
                        $set: countNode
                    }, function (err, num) {
                        callback();
                    });
                });
            });
            break;

        case constants.OBJECT_TYPES.answer:
            req = { query: { answer: entryId } };
            setEntryModels(createOwnerQueryFromQuery(req), req, model, function () {
                countNode = { childrenCount: model.answer.childrenCount };
                async.parallel({
                    issues: updateIssues,
                    opinions: updateOpinions
                }, function (err, results) {
                    db.Answer.update({_id: entryId}, {
                        $set: countNode
                    }, function (err, num) {
                        callback();
                    });
                });
            });
            break;

        case constants.OBJECT_TYPES.issue:
            req = { query: { issue: entryId } };
            setEntryModels(createOwnerQueryFromQuery(req), req, model, function () {
                countNode = { childrenCount: model.issue.childrenCount };
                async.parallel({
                    opinions: updateOpinions
                }, function (err, results) {
                    db.Issue.update({_id: entryId}, {
                        $set: countNode
                    }, function (err, num) {
                        callback();
                    });
                });
            });
            break;

        case constants.OBJECT_TYPES.opinion:
            req = { query: { opinion: entryId } };
            setEntryModels(createOwnerQueryFromQuery(req), req, model, function () {
                countNode = { childrenCount: model.opinion.childrenCount };
                async.parallel({
                    issues: updateIssues,
                    opinions: updateOpinions
                }, function (err, results) {
                    db.Opinion.update({_id: entryId}, {
                        $set: countNode
                    }, function (err, num) {
                        callback();
                    });
                });
            });
            break;

        default:
            callback();
    }
}

function syncChildren(parentIds, entryType, callback) {
    if(entryType === constants.OBJECT_TYPES.topic) {
        callback();
    } else if(entryType === constants.OBJECT_TYPES.argument) {
        var processArgumentsRecursive = function (parent, callback) {
            db.Argument.find({parentId: parent._id}, function (err, children) {
                if(children.length > 0) {
                    async.each(children, function (child, callback) {
                        child.ownerId = parent.ownerId;
                        child.ownerType = parent.ownerType;
                        child.threadId = parent.parentId ? parent.threadId : parent._id;
                        db.Argument.update({_id: child._id}, child, {upsert: true}, function(err, writeResult) {
                            processArgumentsRecursive(child, callback);
                        });
                    }, function (err) {
                        callback();
                    });
                } else {
                    callback();
                }
            });
        };

        async.each(parentIds, function (parentId, callback) {
            db.Argument.findOne({_id: parentId}, function (err, parent) {
                processArgumentsRecursive(parent, callback);
            });
        }, function () {
            callback();
        });
    } else {
        callback();
    }
}

// Set or update categoryId
function syncCategoryId(entry, options, callback) {
    /*if(!options) {
        options = {
            update: false,
            recursive: false
        };
    }*/
    switch (options.entryType) {
        case constants.OBJECT_TYPES.topic:
            if(!entry.parentId) { // A root category, set category to null
                entry.categoryId = null;
                callback();
            } else {
                db.Topic.findOne({_id: entry.parentId}, function (err, parent) {
                    if(!parent.parentId || isCategoryTopic(parent)) {
                        entry.categoryId = parent._id;
                    } else {
                        // this applies regardless entry is a category or not
                        entry.categoryId = parent.categoryId;
                    }
                    callback();
                });
            }

            /*db.Opinion.update({_id: entryId}, {
                $set: countNode
            }, function (err, num) {
                callback();
            });
            db.Topic.findOneAndUpdate(query, entity, { new: true }, function(err, updatedEntity) {
                var updateRedirect = function () {
                    var model = {};
                    flowUtils.setModelContext(req, model);
                    var url = model.wikiBaseUrl + paths.wiki.topics.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
                    res.redirect(url);
                };
                if(entity.parentId && !result) { // update parent count on create only
                    flowUtils.updateChildrenCount(updatedEntity.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, function () {
                        updateRedirect();
                    });
                }
            });*/
            break;
        case constants.OBJECT_TYPES.topicLink:
            db.Topic.findOne({_id: entry.parentId}, function (err, parent) {
                if(!parent.parentId || isCategoryTopic(parent)) {
                    entry.categoryId = parent._id;
                } else {
                    entry.categoryId = entry.categoryId;
                }
                callback();
            });
            break;
        case constants.OBJECT_TYPES.argument:
        case constants.OBJECT_TYPES.argumentLink:
        case constants.OBJECT_TYPES.question:
        case constants.OBJECT_TYPES.answer:
        case constants.OBJECT_TYPES.issue:
        case constants.OBJECT_TYPES.opinion:
            db.Topic.findOne({_id: entry.ownerId}, function (err, owner) {
                if(!owner.parentId || isCategoryTopic(owner)) {
                    entry.categoryId = owner._id;
                } else {
                    entry.categoryId = owner.categoryId;
                }
                callback();
            });
            break;
        default:
            callback();
    }
}

function setVerdictModel(result) {
    if(!result.verdict || !result.verdict.status) {
        result.verdict = {
            status: constants.VERDICT_STATUS.pending
        };
    }
    var status = result.verdict.status;
    var theme = constants.VERDICT_STATUS.getTheme(status);
    var category = constants.VERDICT_STATUS.getCategory(status);
    switch (category) {
        case constants.VERDICT_STATUS.categories.true:
            result.verdict.true = true;
            break;
        case constants.VERDICT_STATUS.categories.false:
            result.verdict.false = true;
            break;
        case constants.VERDICT_STATUS.categories.pending:
            result.verdict.pending = true;
            break;
    }
    result.verdict.category = category;
    result.verdict.label = constants.VERDICT_STATUS.getLabel(status);
    result.verdict.theme = theme.theme;
    result.verdict.icon = theme.icon;

    if( typeof result.typeId !== 'undefined' && result.typeId !== constants.ARGUMENT_TYPES.factual) {
        result.typeUX = constants.ARGUMENT_TYPES.getUXInfo(result.typeId);
    }
}

function sortArguments(results) {
    results.sort(function (a, b) {
        if(a.typeId === constants.ARGUMENT_TYPES.artifact && b.typeId !== constants.ARGUMENT_TYPES.artifact) { return 1; }
        if(a.typeId !== constants.ARGUMENT_TYPES.artifact && b.typeId === constants.ARGUMENT_TYPES.artifact) { return -1; }
        if(a.verdict.category > b.verdict.category) { return -1; }
        if(a.verdict.category < b.verdict.category) { return 1; }
        if(a.title > b.title) { return 1; }
        if(a.title < b.title) { return -1;}
        return 0;
    });
}

function getVerdictCount(args) {
    var verdictCount = {
        true: 0,
        false: 0,
        pending: 0
    };
    args.forEach(function(arg) {
        var varg = arg.verdict && arg.verdict.status ? arg.verdict.status : constants.VERDICT_STATUS.pending;
        var category = constants.VERDICT_STATUS.getCategory(varg);
        switch (category) {
            case constants.VERDICT_STATUS.categories.true:
                verdictCount.true++;
                break;
            case constants.VERDICT_STATUS.categories.false:
                verdictCount.false++;
                break;
            case constants.VERDICT_STATUS.categories.pending:
                verdictCount.pending++;
                break;
        }
    });
    if(verdictCount.true === 0) {
        delete verdictCount.true;
    }
    if(verdictCount.false === 0) {
        delete verdictCount.false;
    }
    if(verdictCount.pending === 0) {
        delete verdictCount.pending;
    }
    return verdictCount;
}

function ensureEntryIdParam(req, entry) {
    if(!req.query[entry]) {
        if(req.params.id) {
            req.query[entry] = req.params.id;
        } else {
            var friendlyId = req.params.friendlyUrl;
            if(friendlyId) {
                if(utils.isObjectIdString(friendlyId)) {
                    req.query[entry] = friendlyId;
                } else {
                    req.query.friendlyUrl = friendlyId;
                }
            }
        }
    }
}

function createOwnerQueryFromQuery(req) {
    if(req.query.opinion) {
        return {
            ownerType: constants.OBJECT_TYPES.opinion,
            ownerId: req.query.opinion
        };
    } else if(req.query.issue) {
        return {
            ownerType: constants.OBJECT_TYPES.issue,
            ownerId: req.query.issue
        };
    } else if(req.query.answer) {
        return {
            ownerType: constants.OBJECT_TYPES.answer,
            ownerId: req.query.answer
        };
    } else if(req.query.question) {
        return {
            ownerType: constants.OBJECT_TYPES.question,
            ownerId: req.query.question
        };
    } else if(req.query.argumentLink) {
        return {
            ownerType: constants.OBJECT_TYPES.argumentLink,
            ownerId: req.query.argumentLink
        };
    } else if(req.query.argument) {
        return {
            ownerType: constants.OBJECT_TYPES.argument,
            ownerId: req.query.argument
        };
    } else if(req.query.topicLink) {
        return {
            ownerType: constants.OBJECT_TYPES.topicLink,
            ownerId: req.query.topicLink
        };
    } else if(req.query.topic) {
        return {
            ownerType: constants.OBJECT_TYPES.topic,
            ownerId: req.query.topic
        };
    }
    return {};
}

function setModelOwnerEntry(model) {
    if(model.opinion && (!model.issue || model.opinion.ownerType === constants.OBJECT_TYPES.issue)) {
        model.entry = model.opinion;
        model.entryType = constants.OBJECT_TYPES.opinion;
        model.isEntryOwner = model.isOpinionOwner;
        model.isOpinionEntry = true;
    } else if(model.parentOpinion && (!model.issue || model.parentOpinion.ownerType === constants.OBJECT_TYPES.issue)) {
        model.entry = model.parentOpinion;
        model.entryType = constants.OBJECT_TYPES.opinion;
        model.isEntryOwner = model.isOpinionOwner;
        model.isOpinionEntry = true;
    } else if(model.issue) {
        model.entry = model.issue;
        model.entryType = constants.OBJECT_TYPES.issue;
        model.isEntryOwner = model.isIssueOwner;
        model.isIssueEntry = true;
    } else if(model.answer) {
        model.entry = model.answer;
        model.entryType = constants.OBJECT_TYPES.answer;
        model.isEntryOwner = model.isAnswerOwner;
    } else if(model.question) {
        model.entry = model.question;
        model.entryType = constants.OBJECT_TYPES.question;
        model.isEntryOwner = model.isQuestionOwner;
    } else if(model.argumentLink) {
        model.entry = model.argumentLink;
        model.entryType = constants.OBJECT_TYPES.argumentLink;
        model.isEntryOwner = model.isArgumentLinkOwner;
    } else if(model.argument) {
        model.entry = model.argument;
        model.entryType = constants.OBJECT_TYPES.argument;
        model.isEntryOwner = model.isArgumentOwner;
    } else if(model.topicLink) {
        model.entry = model.topicLink;
        model.entryType = constants.OBJECT_TYPES.topicLink;
        model.isEntryOwner = model.isTopicLinkOwner;
    } else if(model.topic) {
        model.entry = model.topic;
        model.entryType = constants.OBJECT_TYPES.topic;
        model.isEntryOwner = model.isTopicOwner;
    }
}

function getDbModelByObjectType(type) {
    switch (type) {
        case constants.OBJECT_TYPES.topic:
            return db.Topic;
        case constants.OBJECT_TYPES.topicLink:
            return db.TopicLink;
        case constants.OBJECT_TYPES.argument:
            return db.Argument;
        case constants.OBJECT_TYPES.argumentLink:
            return db.ArgumentLink;
        case constants.OBJECT_TYPES.question:
            return db.Question;
        case constants.OBJECT_TYPES.answer:
            return db.Answer;
        case constants.OBJECT_TYPES.issue:
            return db.Issue;
        case constants.OBJECT_TYPES.opinion:
            return db.Opinion;
    }
    return null;
}

function createOwnerQueryFromModel(model) {
    if(model.issue) {
        return {
            ownerType: constants.OBJECT_TYPES.issue,
            ownerId: model.issue._id
        };
    } else if(model.opinion) {
        return {
            ownerType: constants.OBJECT_TYPES.opinion,
            ownerId: model.opinion._id
        };
    } else if(model.question) {
        return {
            ownerType: constants.OBJECT_TYPES.question,
            ownerId: model.question._id
        };
    } else if(model.argumentLink) {
        return {
            ownerType: constants.OBJECT_TYPES.argumentLink,
            ownerId: model.argumentLink._id
        };
    } else if(model.argument) {
        return {
            ownerType: constants.OBJECT_TYPES.argument,
            ownerId: model.argument._id
        };
    } else if(model.topicLink) {
        return {
            ownerType: constants.OBJECT_TYPES.topicLink,
            ownerId: model.topicLink._id
        };
    } else if(model.topic) {
        return {
            ownerType: constants.OBJECT_TYPES.topic,
            ownerId: model.topic._id
        };
    }
    return {};
}

function setModelContext(req, model) {
    if(req.params.username) {
        model.username = req.params.username;
        model.profileBaseUrl = "/members/" + model.username;
        model.wikiBaseUrl = model.profileBaseUrl + "/diary";
    } else {
        model.username = "";
        model.profileBaseUrl = "";
        model.wikiBaseUrl = "";
    }
}

function buildEntryUrl(baseUrl, entry) {
    return baseUrl + '/' + entry.friendlyUrl + '/' + entry._id;
}

function buildCancelUrl(model, cancelBaseUrl, entry, parent) {
    var cancelUrl = entry ? buildEntryUrl(cancelBaseUrl, entry) :
        parent ? buildEntryUrl(cancelBaseUrl, parent) :
            model.username ? model.wikiBaseUrl : '/';
    return cancelUrl;
}

function buildParentUrl(req, entry) {
    var getBaseUrl = function (entry) {
        return entry.private ? '/members/' + req.user.username + '/diary' : '';
    };
    var buildRedirectUrl = function (entry) {
        var wikiBaseUrl = getBaseUrl(entry);
        switch (entry.ownerType) {
            case constants.OBJECT_TYPES.topicLink:
                return wikiBaseUrl + '/topic/link/' + entry.ownerId;
            case constants.OBJECT_TYPES.argumentLink:
                return wikiBaseUrl + '/argument/link/' + entry.ownerId;
            default:
                return wikiBaseUrl + '/' + constants.OBJECT_ID_NAME_MAP[entry.ownerType] + '/' + entry.ownerId;
        }
    };

    switch (entry.getType()) {
        case constants.OBJECT_TYPES.topic:
            return getBaseUrl(entry) + (entry.parentId ? '/topic/' + entry.parentId : '/');

        case constants.OBJECT_TYPES.topicLink:
            return getBaseUrl(entry) + '/topic/' + entry.parentId;

        case constants.OBJECT_TYPES.argument:
        case constants.OBJECT_TYPES.argumentLink:
            return entry.parentId ? getBaseUrl(entry) + '/argument/' + entry.parentId : buildRedirectUrl(entry);

        case constants.OBJECT_TYPES.answer:
            return getBaseUrl(entry) + '/question/' + entry.questionId;

        case constants.OBJECT_TYPES.question:
        case constants.OBJECT_TYPES.issue:
        case constants.OBJECT_TYPES.opinion:
            return buildRedirectUrl(entry);
    }

    return '/';
}

function setScreeningModel(req, model) {
    if(!model.screening) {
        model.screening = {};
    }

    var baseUrl = url.parse(req.originalUrl);
    var newQuery = querystring.parse(baseUrl.query);
    baseUrl.search = null; // important, ensures new 'query' to take effect

    newQuery.screening = 'pending';
    baseUrl.query = newQuery;
    model.screening.pendingUrl = url.format(baseUrl);

    newQuery.screening = 'approved';
    baseUrl.query = newQuery;
    model.screening.approvedUrl = url.format(baseUrl);

    newQuery.screening = 'rejected';
    baseUrl.query = newQuery;
    model.screening.rejectedUrl = url.format(baseUrl);

    newQuery.screening = 'archived';
    baseUrl.query = newQuery;
    model.screening.archivedUrl = url.format(baseUrl);

    if(req.query.screening) {
        if(req.query.screening === 'pending'){
            model.screening.pending = true;
            model.screening.status = constants.SCREENING_STATUS.status0.code;
            return;
        } else if (req.query.screening === 'rejected') {
            model.screening.rejected = true;
            model.screening.status = constants.SCREENING_STATUS.status2.code;
            return;
        } else if (req.query.screening === 'archived') {
            model.screening.archived = true;
            model.screening.status = constants.SCREENING_STATUS.status3.code;
            return;
        }
    }
    model.screening.approved = true;
    model.screening.status = constants.SCREENING_STATUS.status1.code;
}

function initScreeningStatus(req, entity) {
    if(req.user.roles.reviewer || req.params.username || req.body.username) { /* req.body.username is used by clipboard */
        entity.screening = {
            status: constants.SCREENING_STATUS.status1.code,
            history: []
        };
    }
}

function setScreeningModelCount(model, childrenCount) {
    model.childrenCount = childrenCount;
    if(model.childrenCount.pending === 0 && model.childrenCount.rejected === 0) {
        model.screening.hidden = true;
    } else {
        model.childrenCount.archived = utils.randomInt(1,9);
    }
}

function getParent(entity, type) {
    switch (type) {
        case constants.OBJECT_TYPES.topic:
            if(entity.parentId) {
                return {
                    entryId: entity.parentId,
                    entryType: constants.OBJECT_TYPES.topic
                };
            } else if(entity.ownerId) {
                return {
                    entryId: entity.ownerId,
                    entryType: entity.ownerType
                };
            }
            break;
        case constants.OBJECT_TYPES.topicLink:
            if(entity.parentId) {
                return {
                    entryId: entity.parentId,
                    entryType: constants.OBJECT_TYPES.topic
                };
            } else if(entity.ownerId) {
                return {
                    entryId: entity.ownerId,
                    entryType: entity.ownerType
                };
            }
            break;
        case constants.OBJECT_TYPES.argument:
            if(entity.parentId) {
                return {
                    entryId: entity.parentId,
                    entryType: constants.OBJECT_TYPES.argument
                };
            } else if(entity.ownerId) {
                return {
                    entryId: entity.ownerId,
                    entryType: entity.ownerType
                };
            }
            break;
        case constants.OBJECT_TYPES.argumentLink:
            if(entity.parentId) {
                return {
                    entryId: entity.parentId,
                    entryType: constants.OBJECT_TYPES.argument
                };
            } else if(entity.ownerId) {
                return {
                    entryId: entity.ownerId,
                    entryType: entity.ownerType
                };
            }
            break;
        case constants.OBJECT_TYPES.question:
        case constants.OBJECT_TYPES.issue:
            return {
                entryId: entity.ownerId,
                entryType: entity.ownerType
            };
        case constants.OBJECT_TYPES.answer:
            return {
                entryId: entity.questionId,
                entryType: constants.OBJECT_TYPES.question
            };
        case constants.OBJECT_TYPES.opinion:
            if(entity.parentId) {
                return {
                    entryId: entity.parentId,
                    entryType: constants.OBJECT_TYPES.opinion
                };
            } else if(entity.ownerId) {
                return {
                    entryId: entity.ownerId,
                    entryType: entity.ownerType
                };
            }
            break;
    }
    return null;
}

function setMemberFullname(member) {
    if(member.roles.account) {
        var fullname = member.roles.account.name.full;
        if(fullname && fullname !== member.username) {
            member.fullname = fullname;
        }
    }
}

function isEntryOnIntendedUrl(req, entry) {
    return !entry.private && !req.params.username || entry.private && req.params.username && entry.createUserId.equals(req.user.id);
}

function createContentPreview(content) {
    return utils.getShortText(
        htmlToText.fromString(content,
            {
                wordwrap: false,
                hideLinkHrefIfSameAsText: true,
                ignoreImage: true,
                ignoreHref: true
            }),
        constants.SETTINGS.contentPreviewLength
    );
}

function getCategories(model, topicId, callback) {
    db.Topic
        .find({parentId: topicId, private: false, 'screening.status': constants.SCREENING_STATUS.status1.code })
        .sort({title: 1})
        .lean()
        .exec(function (err, results) {
            async.each(results, function(result, callback) {
                result.friendlyUrl = utils.urlify(result.title);
                result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                db.Topic
                    .find( { parentId: result._id } )
                    .limit(3)
                    .sort({ title: 1 })
                    .lean()
                    .exec(function(err, subtopics) {
                        if(subtopics.length > 0) {
                            subtopics.forEach(function (subtopic) {
                                subtopic.friendlyUrl = utils.urlify(subtopic.title);
                                subtopic.shortTitle = utils.getShortText(subtopic.contextTitle ? subtopic.contextTitle : subtopic.title, constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN);
                            });
                            result.subtopics = subtopics;
                            callback();
                        } else {
                            // if subtopics are less than 3, get some arguments
                            var query = {
                                parentId: null,
                                ownerId: result._id,
                                ownerType: constants.OBJECT_TYPES.topic,
                                'screening.status': constants.SCREENING_STATUS.status1.code
                            };
                            getArguments(query, 3, function (err, subarguments) {
                                subarguments.forEach(function (subargument) {
                                    setVerdictModel(subargument);
                                    subargument.shortTitle = utils.getShortText(subargument.contextTitle ? subargument.contextTitle : subargument.title, constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN);
                                });
                                sortArguments(subarguments);
                                result.subarguments = subarguments;
                                callback();
                            });
                        }
                    });
            }, function(err) {
                model.categories = results;
                callback();
            });
        });
}

module.exports = {
    getBackupDir: getBackupDir,
    createContentPreview: createContentPreview,
    isEntryOwner: isEntryOwner,
    isEntryOnIntendedUrl: isEntryOnIntendedUrl,
    isCategoryTopic: isCategoryTopic,
    appendOwnerFlag: appendOwnerFlag,
    appendEntryExtra: appendEntryExtra,

    setArgumentModels: setArgumentModels,
    setTopicModels: setTopicModels,
    setQuestionModel: setQuestionModel,
    setIssueModel: setIssueModel,
    setOpinionModel: setOpinionModel,
    setEntryModels: setEntryModels,
    setEntryParents: setEntryParents,
    setEditorsUsername: setEditorsUsername,
    setClipboardModel: setClipboardModel,

    getTopics: getTopics,
    getArguments: getArguments,
    getTopIssues: getTopIssues,
    getTopOpinions: getTopOpinions,

    sortArguments: sortArguments,
    updateChildrenCount: updateChildrenCount,
    syncCategoryId: syncCategoryId,
    syncChildren: syncChildren,
    initScreeningStatus: initScreeningStatus,
    setScreeningModelCount: setScreeningModelCount,
    setScreeningModel: setScreeningModel,
    setModelOwnerEntry: setModelOwnerEntry,
    setModelContext: setModelContext,
    setVerdictModel: setVerdictModel,
    getVerdictCount: getVerdictCount,
    setMemberFullname: setMemberFullname,
    createOwnerQueryFromQuery: createOwnerQueryFromQuery,
    createOwnerQueryFromModel: createOwnerQueryFromModel,
    ensureEntryIdParam: ensureEntryIdParam,

    buildEntryUrl: buildEntryUrl,
    buildCancelUrl: buildCancelUrl,
    buildParentUrl: buildParentUrl,
    getDbModelByObjectType: getDbModelByObjectType,
    getParent: getParent,
    getCategories: getCategories
};