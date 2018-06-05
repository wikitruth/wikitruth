'use strict';

var db          = require('../app').db.models,
    utils       = require('./utils'),
    constants   = require('../models/constants'),
    paths       = require('../models/paths'),
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
        if(!model) {
            model = item;
        }
        model.isItemOwner = true;
    }
}

function isCategoryTopic(entry) {
    return entry.tags.indexOf(constants.TOPIC_TAGS.tag510.code) > -1;
}

function appendListExtras(item, objectType, shortTitleLength) {
    if(item.title) {
        item.friendlyUrl = utils.urlify(item.title);
        item.shortTitle = utils.getShortText(item.contextTitle || item.title, shortTitleLength || constants.SETTINGS.TILE_MAX_ENTRY_LEN);
    }
    if(objectType) {
        item.objectType = objectType;
        item.objectName = getObjectName(objectType);
    } else if(item.getType) {
        objectType = item.getType();
        item.objectType = objectType;
        item.objectName = getObjectName(objectType);
    }
    if(item.content && item.contentPreview && item.content.length > constants.SETTINGS.contentPreviewLength && item.contentPreview !== item.content) {
        item.showMore = true;
    }
}

function appendEntryExtras(item, objectType, req, shortTitleLength) {
    appendListExtras(item, objectType, shortTitleLength);
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
    if(item.childrenCount) {
        var hasChildren = function(objectName) {
            return item.childrenCount[objectName] && item.childrenCount[objectName].accepted > 0;
        };
        if(hasChildren('topics')
            || hasChildren('arguments')
            || hasChildren('questions')
            || hasChildren('answers')
            || hasChildren('issues')
            || hasChildren('opinions')) {
            item.hasChildren = true;
        }
    }

    if(req) {
        appendOwnerFlag(req, item);
    }
}

/*
    items: items to which to set the parents
    typeId: the typeId of the items
 */
function setEntryParents(items, typeId, callback) {
    if(!items || items.length === 0) { return callback(); }

    var topicIds = [], topicLinkIds = [], argumentIds = [], argumentLinkIds = [], artifactIds = [], questionIds = [], answerIds =[], issueIds = [], opinionIds = [];
    var topics = {}, topicLinks = {}, args = {}, argumentLinks = {}, artifacts={}, questions = {}, answers = {}, issues = {}, opinions = {};
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
        case constants.OBJECT_TYPES.artifact:
            items.forEach(function (item) {
                if(item.parentId && !artifactIds[item.parentId.valueOf()]) {
                    artifactIds.push(item.parentId.valueOf());
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
                    case constants.OBJECT_TYPES.artifact:
                        artifactIds.push(item.ownerId.valueOf());
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
                            appendListExtras(result);
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
                                    appendListExtras(result);
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
                            appendListExtras(result);
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
                                    appendListExtras(result);
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
                            appendListExtras(result);
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
                            appendListExtras(result);
                            answers[result._id.valueOf()] = result;
                        });
                        callback();
                    });
            } else {
                callback();
            }
        },
        artifacts: function (callback) {
            if(artifactIds.length > 0) {
                var query = {_id: {$in: artifactIds}};
                db.Artifact
                    .find(query)
                    .exec(function (err, results) {
                        results.forEach(function (result) {
                            appendListExtras(result);
                            artifacts[result._id.valueOf()] = result;
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
                            appendListExtras(result);
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
                            appendListExtras(result);
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
            case constants.OBJECT_TYPES.artifact:
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
                        case constants.OBJECT_TYPES.artifact:
                            item.parentArtifact = artifacts[item.ownerId.valueOf()];
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

function buildGroupUrl(group) {
    return paths.groups.index + '/' + group.friendlyUrl + '/' + group._id;
}

function setGroupModel(req, model, callback) {
    if(req.query.group) {
        db.Group.findOne({_id: req.query.group}, function (err, result) {
            model.group = result;
            setUsername(result, callback);
        });
    } else {
        callback();
    }
}

function setArtifactModel(req, model, callback) {
    if(req.query.artifact) {
        db.Artifact.findOne({_id: req.query.artifact}, function (err, result) {
            model.artifact = result;
            result.setThumbnailPath(req.params.username);
            appendEntryExtras(result);
            if(isEntryOwner(req, result)) {
                model.isArtifactOwner = true;
            }
            setUsername(result, callback);
        });
    } else {
        callback();
    }
}

function setQuestionModel(req, model, callback) {
    if(req.query.question) {
        db.Question.findOne({_id: req.query.question}, function (err, result) {
            model.question = result;
            appendEntryExtras(result);
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
            appendEntryExtras(result);
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
            appendEntryExtras(result);
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
                    appendEntryExtras(result);
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
                            appendEntryExtras(result);
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
                            appendEntryExtras(result);
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
                    appendEntryExtras(result);
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
                            appendEntryExtras(result);
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
                    appendEntryExtras(result);
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
                            appendEntryExtras(result);
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
                            appendEntryExtras(result);
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
                            model.topicLink.topic = result;
                            model.topicLink.references = result.references;
                            model.topicLink.referenceDate = result.referenceDate;
                            model.topicLink.title2 = model.topicLink.title ? model.topicLink.title : result.title;
                            model.topicLink.content2 = result.content;
                            appendEntryExtras(result);
                            appendEntryExtras(model.topicLink);
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
                    appendEntryExtras(result);
                    if(isEntryOwner(req, result)) {
                        model.isTopicOwner = true;
                    }
                    setUsername(result, callback);
                });
            },
            topicChildren: function (callback) {
                if(model.topic) {
                    db.Topic
                        .find({parentId: model.topic._id, private: model.topic.private, 'screening.status': constants.SCREENING_STATUS.status1.code})
                        .limit(8)
                        .sort({ title: 1 })
                        .lean()
                        .exec(function(err, results) {
                            if(results.length == 8) {
                                results.splice(6);
                                model.topicChildrenMore = true;
                            }
                            setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
                                });
                                model.topicChildren = results;
                                callback();
                            });
                        });
                } else {
                    callback();
                }
            },
            topicSiblings: function (callback) {
                if(model.topic) {
                    query = { parentId: model.topic.parentId, _id: { $ne: model.topic._id }, private: model.topic.private, groupId: model.topic.groupId, 'screening.status': constants.SCREENING_STATUS.status1.code };
                    if(!model.topic.parentId && model.topic.private){
                        query.createUserId = model.topic.createUserId;
                    }
                    db.Topic
                        .find(query)
                        .limit(8)
                        .sort({ title: 1 })
                        .lean()
                        .exec(function(err, results) {
                            if(results.length == 8) {
                                results.splice(6);
                                model.topicSiblingsMore = true;
                            }
                            setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
                                });
                                model.topicSiblings = results;
                                callback();
                            });
                        });
                } else {
                    callback();
                }
            },
            parentTopic: function (callback) {
                if(model.topic && model.topic.parentId) {
                    db.Topic.findOne({_id: model.topic.parentId}, function (err, result) {
                        if (result) {
                            appendEntryExtras(result);
                            model.parentTopic = result;
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            },
            parentSiblings: function (callback) {
                if(model.parentTopic) {
                    query = { parentId: model.parentTopic.parentId, _id: {$ne: model.parentTopic._id}, private: model.parentTopic.private, groupId: model.parentTopic.groupId, 'screening.status': constants.SCREENING_STATUS.status1.code};
                    if(!model.parentTopic.parentId && model.parentTopic.private) {
                        query.createUserId = model.parentTopic.createUserId;
                    }
                    db.Topic
                        .find(query)
                        .limit(8)
                        .sort({ title: 1 })
                        .lean()
                        .exec(function(err, results) {
                            if(results.length == 8) {
                                results.splice(6);
                                model.parentSiblingsMore = true;
                            }
                            setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
                                });
                                model.parentSiblings = results;
                                callback();
                            });
                        });
                } else {
                    callback();
                }
            },
            grandParentTopic: function (callback) {
                if(model.parentTopic && model.parentTopic.parentId) {
                    db.Topic.findOne({_id: model.parentTopic.parentId}, function (err, result) {
                        if (result) {
                            appendEntryExtras(result);
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
    } else if(query.ownerType === constants.OBJECT_TYPES.artifact) {
        req.query.artifact = query.ownerId;
        setArtifactModel(req, model, function () {
            setEntryModels(model.artifact, req, model, callback);
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

function setupClipboard(req, type) {
    var clipboard = req.session.clipboard;
    if(!clipboard) {
        clipboard = {};
        clipboard['object' + constants.OBJECT_TYPES.topic] = [];
        clipboard['object' + constants.OBJECT_TYPES.argument] = [];
    }
    if(!clipboard['object' + type]) {
        clipboard['object' + type] = [];
    }
    return clipboard;
}

function getClipboard(req) {
    var clipboard = req.session.clipboard;
    if(clipboard && !clipboard['object' + constants.OBJECT_TYPES.artifact]) {
        clipboard['object' + constants.OBJECT_TYPES.artifact] = [];
    }
    return clipboard;
}

function setClipboardModel(req, model, entryType) {
    model.clipboard = {};
    var clipboard = getClipboard(req);
    if(clipboard) {
        var topics = clipboard['object' + constants.OBJECT_TYPES.topic];
        var args = clipboard['object' + constants.OBJECT_TYPES.argument];
        var artifacts = clipboard['object' + constants.OBJECT_TYPES.artifact];
        var count = topics.length + args.length + artifacts.length;
        if (count > 0) {
            model.clipboard.count = count;
            var marked = false;
            if(entryType) {
                if (
                    (entryType === constants.OBJECT_TYPES.topic && model.topic && topics.indexOf(model.topic._id.toString()) > -1) ||
                    (entryType === constants.OBJECT_TYPES.argument && model.argument && args.indexOf(model.argument._id.toString()) > -1) ||
                    (entryType === constants.OBJECT_TYPES.artifact && model.artifact && artifacts.indexOf(model.artifact._id.toString()) > -1)
                ) {
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

function getTopics(query, options, callback) {
    var children = [], topicLinks = [];
    //limit, shortTitleLength, req
    if(!options) options = {};
    async.series({
        children: function (callback) {
            db.Topic
                .find(query)
                .limit(options.limit)
                .sort({ title: 1 })
                .lean()
                .exec(function(err, results) {
                    setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            appendEntryExtras(result, constants.OBJECT_TYPES.topic, options.req, options.shortTitleLength);
                        });
                        children = results;
                        callback();
                    });
            });
        },
        links: function (callback) {
            if(options.limit > 0 && options.limit == children.length) return callback();

            var newLimit = options.limit > 0 ? options.limit - children.length : options.limit;
            db.TopicLink
                .find(query)
                .limit(newLimit)
                .lean()
                .exec(function(err, links) {
                    if(links.length > 0) {
                        var ids = links.map(function (link) {
                            return link.topicId;
                        });
                        var query = { _id: { $in: ids } };
                        // query the actual topics being linked to
                        db.Topic
                            .find(query)
                            .limit(newLimit)
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
                                    // query the parents of the actual topics
                                    db.Topic
                                        .find(query)
                                        .lean()
                                        .exec(function (err, linkParents) {
                                            setEditorsUsername(results, function () {
                                                results.forEach(function (result) {
                                                    appendEntryExtras(result, constants.OBJECT_TYPES.topic, options.req, options.shortTitleLength);
                                                    var link = links.find(function (link) {
                                                        return link.topicId.equals(result._id);
                                                    });
                                                    if (link) {
                                                        var linkParent = linkParents.find(function (linkParent) {
                                                            return linkParent._id.equals(result.parentId);
                                                        });
                                                        if(linkParent) {
                                                            appendListExtras(linkParent, constants.OBJECT_TYPES.topic, options.req, options.shortTitleLength);
                                                        }
                                                        appendListExtras(link, constants.OBJECT_TYPES.topicLink, options.req, options.shortTitleLength);
                                                        result.parentTopic = linkParent;
                                                        result.link = link;
                                                    }
                                                });
                                                topicLinks = results;
                                                callback();
                                            });
                                        });
                                } else {
                                    topicLinks = results;
                                    callback();
                                }
                            });
                    } else {
                        callback();
                    }
            });
        }
    }, function (err, results) {
        var topics = children.concat(topicLinks).sort(utils.titleCompare);
        callback(null, topics);
    });
}

function getArguments(query, options, callback) {
    var children = [], argumentLinks = [];
    if(!options) options = {};
    async.series({
        children: function (callback) {
            db.Argument
                .find(query)
                .limit(options.limit)
                .sort({ title: 1 })
                .lean()
                .exec(function(err, results) {
                    setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            appendEntryExtras(result, constants.OBJECT_TYPES.argument, options.req, options.shortTitleLength);
                            //result.against = false;
                        });
                        children = results;
                        callback();
                    });
            });
        },
        links: function (callback) {
            if(options.limit > 0 && options.limit == children.length) return callback();

            var newLimit = options.limit > 0 ? options.limit - children.length : options.limit;
            db.ArgumentLink
                .find(query)
                .limit(newLimit)
                .lean()
                .exec(function(err, links) {
                    if(links.length > 0) {
                        var ids = links.map(function (link) {
                            return link.argumentId;
                        });
                        var query = { _id: { $in: ids } };
                        // get actual arguments from links
                        db.Argument
                            .find(query)
                            .limit(newLimit)
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
                                            // get the topics of actual arguments
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
                                                appendEntryExtras(result, constants.OBJECT_TYPES.argument, options.req, options.shortTitleLength);
                                                var link = links.find(function (link) {
                                                    return link.argumentId.equals(result._id);
                                                });
                                                if (link) {
                                                    if(result.parentId) {
                                                        var parentArgument = linkParents.parentArguments.find(function (linkParent) {
                                                            return linkParent._id.equals(result.parentId);
                                                        });
                                                        if(parentArgument) {
                                                            appendListExtras(parentArgument);
                                                        }
                                                        result.parentArgument = parentArgument;
                                                    } else if(result.ownerType === constants.OBJECT_TYPES.topic && result.ownerId) {
                                                        var linkParent = linkParents.parentTopics.find(function (linkParent) {
                                                            return linkParent._id.equals(result.ownerId);
                                                        });
                                                        if(linkParent) {
                                                            appendListExtras(linkParent, constants.OBJECT_TYPES.argument, options.req, options.shortTitleLength);
                                                        }
                                                        result.parentTopic = linkParent;
                                                    }
                                                    appendEntryExtras(link, constants.OBJECT_TYPES.argumentLink, options.req, options.shortTitleLength);
                                                    result.link = link;
                                                    result.against = link.against;
                                                }
                                            });
                                            argumentLinks = results;
                                            callback();
                                        });
                                    });
                                } else {
                                    argumentLinks = results;
                                    callback();
                                }
                            });
                    } else {
                        callback();
                    }
            });
        }
    }, function (err, results) {
        var args = children.concat(argumentLinks).sort(utils.titleCompare);
        callback(null, args);
    });
}

function getTopQuestions(query, model, req, callback) {
    db.Question
        .find(query)
        .limit(15)
        .lean()
        .exec(function(err, results) {
            setEditorsUsername(results, function() {
                results.forEach(function (result) {
                    appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                });
                model.questions = results;
                callback();
            });
    });
}

function getTopArtifacts(query, model, req, callback) {
    db.Artifact
        .find(query)
        .limit(15)
        //.lean()
        .sort({ title: 1 })
        .exec(function(err, results) {
            setEditorsUsername(results, function() {
                results.forEach(function (result) {
                    result.setThumbnailPath(req.params.username);
                    appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
                });
                model.artifacts = results;
                callback();
            });
        });
}

function getTopIssues(query, model, req, callback) {
    db.Issue
        .find(query)
        .limit(15)
        .lean()
        .sort({ title: 1 })
        .exec(function(err, results) {
            setEditorsUsername(results, function() {
                results.forEach(function (result) {
                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                    appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
                });
                model.issues = results;
                callback();
            });
        });
}

function getTopOpinions(query, model, req, callback) {
    db.Opinion
        .find(query)
        .limit(15)
        .sort({ title: 1 })
        .lean()
        .exec(function(err, results) {
            setEditorsUsername(results, function() {
                results.forEach(function (result) {
                    appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
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
    var updateArtifacts = function (callback) {
        if(!specificEntryType || specificEntryType === constants.OBJECT_TYPES.artifact) {
            var artifacts = countNode.childrenCount.artifacts;
            var q = { ownerId: model.artifact ? model.artifact.ownerId : entryId, parentId: model.artifact ? model.artifact._id : null };
            async.parallel({
                accepted: function(callback) {
                    var query = { ownerId: q.ownerId, parentId: q.parentId, 'screening.status': constants.SCREENING_STATUS.status1.code };
                    db.Artifact.count(query, function (err, count) {
                        artifacts.accepted = count;
                        callback();
                    });
                },
                pending: function(callback) {
                    var query = { ownerId: q.ownerId, parentId: q.parentId, 'screening.status': constants.SCREENING_STATUS.status0.code };
                    db.Artifact.count(query, function (err, count) {
                        artifacts.pending = count;
                        callback();
                    });
                },
                rejected: function(callback) {
                    var query = { ownerId: q.ownerId, parentId: q.parentId, 'screening.status': constants.SCREENING_STATUS.status2.code };
                    db.Artifact.count(query, function (err, count) {
                        artifacts.rejected = count;
                        callback();
                    });
                }
            }, function (err, results) {
                artifacts.total = artifacts.accepted + artifacts.pending + artifacts.rejected;
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
                    artifacts: updateArtifacts,
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

        case constants.OBJECT_TYPES.artifact:
            req = { query: { artifact: entryId } };
            setEntryModels(createOwnerQueryFromQuery(req), req, model, function () {
                countNode = { childrenCount: model.artifact.childrenCount };
                async.parallel({
                    artifacts: updateArtifacts,
                    arguments: updateArguments,
                    questions: updateQuestions,
                    issues: updateIssues,
                    opinions: updateOpinions
                }, function (err, results) {
                    db.Artifact.update({_id: entryId}, {
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

// SUMMARY: updates the children of parent including the categoryId, does not touch the parent
function syncChildren(parent, options, callback) {

    var syncChildTopics = function (callback) {
        db.Topic.find( { parentId: parent._id }, function (err, children) {
            if(children.length === 0) return callback();
            async.each(children, function (child, callback) {
                var categoryChanged = false, oldCategoryId = child.categoryId;
                async.series({
                    syncCategoryId: function (callback) {
                        syncCategoryId(child, { entryType: constants.OBJECT_TYPES.topic }, callback);
                    },
                    update: function (callback) {
                        categoryChanged = oldCategoryId !== child.categoryId;
                        if(categoryChanged) {
                            return db.Topic.update({_id: child._id}, child, { upsert: true }, function (err, writeResult) {
                                callback();
                            });
                        }
                        callback();
                    },
                    syncChildren: function (callback) {
                        if(categoryChanged) {
                            return syncChildren(child, { entryType: constants.OBJECT_TYPES.topic }, callback);
                        }
                        callback();
                    }
                }, function (err, results) {
                    callback();
                });
            }, function () {
                callback();
            });
        });
    };

    var syncChildTopicLinks = function (callback) {
        db.TopicLink.find( { parentId: parent._id }, function (err, children) {
            if(children.length === 0) return callback();
            async.each(children, function (child, callback) {
                var categoryChanged = false, oldCategoryId = child.categoryId;
                async.series({
                    syncCategoryId: function (callback) {
                        syncCategoryId(child, { entryType: constants.OBJECT_TYPES.topicLink }, callback);
                    },
                    update: function (callback) {
                        categoryChanged = oldCategoryId !== child.categoryId;
                        if(categoryChanged) {
                            return db.TopicLink.update({_id: child._id}, child, { upsert: true }, function (err, writeResult) {
                                callback();
                            });
                        }
                        callback();
                    },
                    syncChildren: function (callback) {
                        if(categoryChanged) {
                            return syncChildren(child, { entryType: constants.OBJECT_TYPES.topicLink }, callback);
                        }
                        callback();
                    }
                }, function (err, results) {
                    callback();
                });
            }, function () {
                callback();
            });
        });
    };

    var syncChildArguments = function (callback) {
        var parentIsTopic = options.entryType === constants.OBJECT_TYPES.topic;
        var query = parentIsTopic ? { ownerId: parent._id, ownerType: constants.OBJECT_TYPES.topic } : { parentId: parent._id };
        db.Argument.find(query, function (err, children) {
            if(children.length === 0) return callback();
            async.each(children, function (child, callback) {
                var categoryChanged = false, oldCategoryId = child.categoryId;
                if(!parentIsTopic) {
                    child.ownerId = parent.ownerId;
                    child.ownerType = parent.ownerType;
                    child.threadId = parent.parentId ? parent.threadId : parent._id;
                }
                async.series({
                    syncCategoryId: function (callback) {
                        syncCategoryId(child, { entryType: constants.OBJECT_TYPES.argument }, callback);
                    },
                    update: function (callback) {
                        categoryChanged = oldCategoryId !== child.categoryId;
                        if(categoryChanged || !parentIsTopic) {
                            return db.Argument.update({_id: child._id}, child, {upsert: true}, function (err, writeResult) {
                                callback();
                            });
                        }
                        callback();
                    },
                    syncChildren: function (callback) {
                        if(categoryChanged || !parentIsTopic) {
                            return syncChildren(child, {entryType: constants.OBJECT_TYPES.argument}, callback);
                        }
                        callback();
                    }
                }, function (err, results) {
                    callback();
                });
            }, function () {
                callback();
            });
        });
    };

    var syncChildArtifacts = function (callback) {
        var parentIsTopic = options.entryType === constants.OBJECT_TYPES.topic;
        var query = parentIsTopic ? { ownerId: parent._id, ownerType: constants.OBJECT_TYPES.topic } : { parentId: parent._id };
        db.Artifact.find(query, function (err, children) {
            if(children.length === 0) return callback();
            async.each(children, function (child, callback) {
                var categoryChanged = false, oldCategoryId = child.categoryId;
                if(!parentIsTopic) {
                    child.ownerId = parent.ownerId;
                    child.ownerType = parent.ownerType;
                }
                async.series({
                    syncCategoryId: function (callback) {
                        syncCategoryId(child, { entryType: constants.OBJECT_TYPES.artifact }, callback);
                    },
                    update: function (callback) {
                        categoryChanged = oldCategoryId !== child.categoryId;
                        if(categoryChanged || !parentIsTopic) {
                            return db.Artifact.update({_id: child._id}, child, {upsert: true}, function (err, writeResult) {
                                callback();
                            });
                        }
                        callback();
                    },
                    syncChildren: function (callback) {
                        if(categoryChanged || !parentIsTopic) {
                            return syncChildren(child, {entryType: constants.OBJECT_TYPES.artifact}, callback);
                        }
                        callback();
                    }
                }, function (err, results) {
                    callback();
                });
            }, function () {
                callback();
            });
        });
    };

    var syncChildArgumentLinks = function (callback) {
        db.ArgumentLink.find({ ownerId: parent._id, ownerType: options.entryType }, function (err, children) {
            if(children.length === 0) return callback();
            async.each(children, function (child, callback) {
                var categoryChanged = false, oldCategoryId = child.categoryId;
                /*
                child.ownerId = parent.ownerId;
                child.ownerType = parent.ownerType;
                child.threadId = parent.parentId ? parent.threadId : parent._id;
                */
                async.series({
                    syncCategoryId: function (callback) {
                        syncCategoryId(child, { entryType: constants.OBJECT_TYPES.argumentLink }, callback);
                    },
                    update: function (callback) {
                        categoryChanged = oldCategoryId !== child.categoryId;
                        if(categoryChanged) {
                            return db.ArgumentLink.update({_id: child._id}, child, {upsert: true}, function (err, writeResult) {
                                callback();
                            });
                        }
                        callback();
                    },
                    syncChildren: function (callback) {
                        if(categoryChanged) {
                            return syncChildren(child, {entryType: constants.OBJECT_TYPES.argumentLink}, callback);
                        }
                        callback();
                    }
                }, function (err, results) {
                    callback();
                });
            }, function () {
                callback();
            });
        });
    };

    var syncChildAnswers = function (callback) {
        db.Answer.find( { questionId: parent._id }, function (err, children) {
            if(children.length === 0) return callback();
            async.each(children, function (child, callback) {
                var categoryChanged = false, oldCategoryId = child.categoryId;
                async.series({
                    syncCategoryId: function (callback) {
                        syncCategoryId(child, { entryType: constants.OBJECT_TYPES.answer }, callback);
                    },
                    update: function (callback) {
                        categoryChanged = oldCategoryId !== child.categoryId;
                        if(categoryChanged) {
                            return db.Answer.update({_id: child._id}, child, {upsert: true}, function (err, writeResult) {
                                callback();
                            });
                        }
                        callback();
                    },
                    syncChildren: function (callback) {
                        if(categoryChanged) {
                            return syncChildren(child, {entryType: constants.OBJECT_TYPES.answer}, callback);
                        }
                        callback();
                    }
                }, function (err, results) {
                    callback();
                });
            }, function () {
                callback();
            });
        });
    };

    var syncOwnerChildren = function (childrenEntryType, callback) {
        var dbModel = getDbModelByObjectType(childrenEntryType);
        dbModel.find({ ownerId: parent._id, ownerType: options.entryType }, function (err, children) {
            if(children.length === 0) return callback();
            async.each(children, function (child, callback) {
                var categoryChanged = false, oldCategoryId = child.categoryId;
                async.series({
                    syncCategoryId: function (callback) {
                        syncCategoryId(child, { entryType: childrenEntryType }, callback);
                    },
                    update: function (callback) {
                        categoryChanged = oldCategoryId !== child.categoryId;
                        if(categoryChanged) {
                            return dbModel.update({_id: child._id}, child, {upsert: true}, function (err, writeResult) {
                                callback();
                            });
                        }
                        callback();
                    },
                    syncChildren: function (callback) {
                        if(categoryChanged) {
                            return syncChildren(child, { entryType: childrenEntryType }, callback);
                        }
                        callback();
                    }
                }, function (err, results) {
                    callback();
                });
            }, function () {
                callback();
            });
        });
    };

    switch (options.entryType) { // type of the parent

        case constants.OBJECT_TYPES.topic:
            async.parallel({
                topics: function(callback) {
                    syncChildTopics(callback);
                },
                topicLinks: function(callback) {
                    syncChildTopicLinks(callback);
                },
                arguments: function(callback) {
                    syncChildArguments(callback);
                },
                argumentLinks: function(callback) {
                    syncChildArgumentLinks(callback);
                },
                artifacts: function(callback) {
                    syncChildArtifacts(callback);
                },
                questions: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.question, callback);
                },
                issues: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.issue, callback);
                },
                opinions: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.opinion, callback);
                }
            }, function (err, results) {
                callback();
            });
            break;

        case constants.OBJECT_TYPES.argument:
            async.parallel({
                arguments: function(callback) {
                    syncChildArguments(callback);
                },
                argumentLinks: function(callback) {
                    syncChildArgumentLinks(callback);
                },
                questions: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.question, callback);
                },
                issues: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.issue, callback);
                },
                opinions: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.opinion, callback);
                }
            }, function (err, results) {
                callback();
            });
            break;

        case constants.OBJECT_TYPES.artifact:
            async.parallel({
                artifacts: function(callback) {
                    syncChildArtifacts(callback);
                },
                arguments: function(callback) {
                    syncChildArguments(callback);
                },
                argumentLinks: function(callback) {
                    syncChildArgumentLinks(callback);
                },
                questions: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.question, callback);
                },
                issues: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.issue, callback);
                },
                opinions: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.opinion, callback);
                }
            }, function (err, results) {
                callback();
            });
            break;

        case constants.OBJECT_TYPES.question:
            async.parallel({
                answers: function(callback) {
                    syncChildAnswers(callback);
                },
                issues: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.issue, callback);
                },
                opinions: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.opinion, callback);
                }
            }, function (err, results) {
                callback();
            });
            break;

        case constants.OBJECT_TYPES.answer:
            async.parallel({
                issues: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.issue, callback);
                },
                opinions: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.opinion, callback);
                }
            }, function (err, results) {
                callback();
            });
            break;

        case constants.OBJECT_TYPES.topicLink:
        case constants.OBJECT_TYPES.argumentLink:
        case constants.OBJECT_TYPES.issue:
        case constants.OBJECT_TYPES.opinion:
            async.parallel({
                issues: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.issue, callback);
                },
                opinions: function(callback) {
                    syncOwnerChildren(constants.OBJECT_TYPES.opinion, callback);
                }
            }, function (err, results) {
                callback();
            });
            break;

        default:
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
    switch (options.entryType) { // type of the entry

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
            break;

        case constants.OBJECT_TYPES.topicLink:
            db.Topic.findOne({_id: entry.parentId}, function (err, parent) {
                if(!parent.parentId || isCategoryTopic(parent)) {
                    entry.categoryId = parent._id;
                } else {
                    entry.categoryId = parent.categoryId;
                }
                entry.private = parent.private;
                entry.groupId = parent.groupId;
                callback();
            });
            break;

        case constants.OBJECT_TYPES.answer:
            db.Question.findOne({_id: entry.questionId}, function (err, question) {
                entry.categoryId = question.categoryId;
                entry.private = question.private;
                entry.groupId = question.groupId;
                callback();
            });
            break;

        case constants.OBJECT_TYPES.artifact:
        case constants.OBJECT_TYPES.argument:
        case constants.OBJECT_TYPES.argumentLink:
        case constants.OBJECT_TYPES.question:
        case constants.OBJECT_TYPES.issue:
        case constants.OBJECT_TYPES.opinion:
            getDbModelByObjectType(entry.ownerType).findOne({_id: entry.ownerId}, function (err, owner) {
                if(entry.ownerType === constants.OBJECT_TYPES.topic && (!owner.parentId || isCategoryTopic(owner))) {
                    // owner is a root or category topic
                    entry.categoryId = owner._id;
                } else {
                    entry.categoryId = owner.categoryId;
                }
                entry.private = owner.private;
                entry.groupId = owner.groupId;
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
    } else if(req.query.artifact) {
        return {
            ownerType: constants.OBJECT_TYPES.artifact,
            ownerId: req.query.artifact
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

function setModelOwnerEntry(req, res, model, options) {
    if(!options) options = {};

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
        model.issueType = constants.ISSUE_TYPES['type' + model.issue.issueType];
        if(!options.hideClipboard) {
            setClipboardModel(req, model, constants.OBJECT_TYPES.issue);
        }
    } else if(model.answer) {
        model.entry = model.answer;
        model.entryType = constants.OBJECT_TYPES.answer;
        model.isEntryOwner = model.isAnswerOwner;
        if(!options.hideClipboard) {
            setClipboardModel(req, model, constants.OBJECT_TYPES.answer);
        }
    } else if(model.question) {
        model.entry = model.question;
        model.entryType = constants.OBJECT_TYPES.question;
        model.isEntryOwner = model.isQuestionOwner;
        if(!options.hideClipboard) {
            setClipboardModel(req, model, constants.OBJECT_TYPES.question);
        }
    } else if(model.artifact) {
        model.entry = model.artifact;
        model.entryType = constants.OBJECT_TYPES.artifact;
        model.isEntryOwner = model.isArtifactOwner;
        if(!options.hideClipboard) {
            setClipboardModel(req, model, constants.OBJECT_TYPES.artifact);
        }
    } else if(model.argumentLink) {
        model.entry = model.argumentLink;
        model.entryType = constants.OBJECT_TYPES.argumentLink;
        model.isEntryOwner = model.isArgumentLinkOwner;
        if(!options.hideClipboard) {
            setClipboardModel(req, model, constants.OBJECT_TYPES.argumentLink);
        }
        setVerdictModel(model.argumentLink);
    } else if(model.argument) {
        model.entry = model.argument;
        model.entryType = constants.OBJECT_TYPES.argument;
        model.isEntryOwner = model.isArgumentOwner;
        if(!options.hideClipboard) {
            setClipboardModel(req, model, constants.OBJECT_TYPES.argument);
        }
        setVerdictModel(model.argument);
        // Argument Tags
        var tags = model.argument.tags;
        if(tags && tags.length > 0) {
            var tagLabels = [];
            if(model.argument.ethicalStatus.hasValue) {
                tagLabels.push(constants.ARGUMENT_TAGS.tag10);
                model.hasValue = true;
            }
            tags.forEach(function (tag) {
                tagLabels.push(constants.ARGUMENT_TAGS['tag' + tag]);
                if(!model.hasValue && tag === constants.ARGUMENT_TAGS.tag10.code) {
                    model.hasValue = true;
                }
            });
            model.tagLabels = tagLabels;
        }
        if(!model.hasValue && (model.argument.ethicalStatus.hasValue || model.argument.typeId === constants.ARGUMENT_TYPES.ethical)) {
            model.hasValue = true;
        }
    } else if(model.topicLink) {
        model.entry = model.topicLink;
        model.entryType = constants.OBJECT_TYPES.topicLink;
        model.isEntryOwner = model.isTopicLinkOwner;
        if(!options.hideClipboard) {
            setClipboardModel(req, model, constants.OBJECT_TYPES.topicLink);
        }
        setVerdictModel(model.topicLink);
        // Topic Tags
        var topicLinkTags = model.topicLink.topic.tags;
        if(topicLinkTags && topicLinkTags.length > 0) {
            var topicLinkTagLabels = [];
            if(model.topicLink.topic.ethicalStatus.hasValue) {
                topicLinkTagLabels.push(constants.TOPIC_TAGS.tag10);
                model.hasValue = true;
            }
            topicLinkTags.forEach(function (tag) {
                topicLinkTagLabels.push(constants.TOPIC_TAGS['tag' + tag]);
                if(tag === constants.TOPIC_TAGS.tag520.code) {
                    model.mainTopic = true;
                }
                if(!model.hasValue && tag === constants.ARGUMENT_TAGS.tag10.code) {
                    model.hasValue = true;
                }
            });
            model.tagLabels = topicLinkTagLabels;
        } else if(model.topicLink.topic.ethicalStatus.hasValue) {
            model.hasValue = true;
        }
    } else if(model.topic) {
        model.entry = model.topic;
        model.entryType = constants.OBJECT_TYPES.topic;
        model.isEntryOwner = model.isTopicOwner;
        if(!options.hideClipboard) setClipboardModel(req, model, constants.OBJECT_TYPES.topic);
        setVerdictModel(model.topic);
        // Topic Tags
        var topicTags = model.topic.tags;
        if(topicTags && topicTags.length > 0) {
            var topicTagLabels = [];
            if(model.topic.ethicalStatus.hasValue) {
                topicTagLabels.push(constants.TOPIC_TAGS.tag10);
                model.hasValue = true;
            }
            topicTags.forEach(function (tag) {
                topicTagLabels.push(constants.TOPIC_TAGS['tag' + tag]);
                if(tag === constants.TOPIC_TAGS.tag520.code) {
                    model.mainTopic = true;
                }
                if(!model.hasValue && tag === constants.ARGUMENT_TAGS.tag10.code) {
                    model.hasValue = true;
                }
            });
            model.tagLabels = topicTagLabels;
        } else if(model.topic.ethicalStatus.hasValue) {
            model.hasValue = true;
        }
    }

    setModelContext(req, res, model);
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
        case constants.OBJECT_TYPES.artifact:
            return db.Artifact;
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

function getObjectName(type) {
    switch (type) {
        case constants.OBJECT_TYPES.topic:
            return 'topic';
        case constants.OBJECT_TYPES.topicLink:
            return 'topicLink';
        case constants.OBJECT_TYPES.argument:
            return 'argument';
        case constants.OBJECT_TYPES.argumentLink:
            return 'argumentLink';
        case constants.OBJECT_TYPES.artifact:
            return 'artifact';
        case constants.OBJECT_TYPES.question:
            return 'question';
        case constants.OBJECT_TYPES.answer:
            return 'answer';
        case constants.OBJECT_TYPES.issue:
            return 'issue';
        case constants.OBJECT_TYPES.opinion:
            return 'opinion';
    }
    return '';
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
    } else if(model.artifact) {
        return {
            ownerType: constants.OBJECT_TYPES.artifact,
            ownerId: model.artifact._id
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

/**
 *
 * @param req
 * @param model
 * @param mixedMode The place this is called may display both public and private entries (e.g. clipboard)
 */
function setModelContext(req, res, model, mixedMode) {
    if(res.locals.group) {
        model.group = res.locals.group;
        model.wikiBaseUrl = buildGroupUrl(model.group) + paths.groups.group.posts;
    } else if(req.params.username || (mixedMode && req.user && req.user.username) || (model.entry && model.entry.private)) {
        model.username = req.params.username || req.user.username;
        model.profileBaseUrl = paths.members.index + '/' + model.username;
        model.wikiBaseUrl = model.profileBaseUrl + paths.members.profile.diary;
    } else {
        model.username = '';
        model.profileBaseUrl = '';
        model.wikiBaseUrl = '';
    }
}

function getEditorContent(content) {
    if(!content) return "";
    var c = content.trim();
    if(c == "<p><br></p>") {
        c = "";
    }
    return c;
}

function buildEntryUrl(baseUrl, entry) {
    return baseUrl + '/' + entry.friendlyUrl + '/' + entry._id;
}

function getDiaryBaseUrl(username) {
    return paths.members.index + '/' + username + paths.members.profile.diary;
}

function buildReturnUrl(req, defaultBaseUrl) {
    var nextUrl = url.parse(req.originalUrl);
    var nextQuery = querystring.parse(nextUrl.query);
    delete nextQuery.id;
    if(nextQuery.source) {
        nextUrl.pathname = nextQuery.source;
        delete nextQuery.source;
    } else if(defaultBaseUrl) {
        nextUrl.pathname = defaultBaseUrl;
    }
    nextUrl.query = nextQuery;
    nextUrl.search = null; // important, ensures new 'query' to take effect
    return url.format(nextUrl);
}

function buildTopicReturnUrl(model, cancelBaseUrl, entry, parent) {
    var returnUrl = entry ? buildEntryUrl(cancelBaseUrl, entry) :
        parent ? buildEntryUrl(cancelBaseUrl, parent) :
            (model.username || model.group) ? model.wikiBaseUrl : '/';
    return returnUrl;
}

function buildParentUrl(req, entry) {
    var getBaseUrl = function (entry) {
        return entry.private ? paths.members.index + '/' + req.user.username + paths.members.profile.diary : '';
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

        case constants.OBJECT_TYPES.artifact:
            return entry.parentId ? getBaseUrl(entry) + '/artifact/' + entry.parentId : buildRedirectUrl(entry);

        case constants.OBJECT_TYPES.answer:
            return getBaseUrl(entry) + '/question/' + entry.questionId;

        case constants.OBJECT_TYPES.question:
        case constants.OBJECT_TYPES.issue:
        case constants.OBJECT_TYPES.opinion:
            return buildRedirectUrl(entry);
    }

    return '/';
}

function buildEntryReturnUrl(req, model) {
    switch (model.entryType) {
        case constants.OBJECT_TYPES.topic:
            return model.wikiBaseUrl + paths.wiki.topics.entry + '/' + utils.urlify(model.entry.title) + '/' + model.entry._id;
        case constants.OBJECT_TYPES.topicLink:
            return model.wikiBaseUrl + paths.wiki.topics.entry + '/' + utils.urlify(model.entry.topic.title) + '/link/' + model.entry._id;
        case constants.OBJECT_TYPES.argument:
            return model.wikiBaseUrl + paths.wiki.arguments.entry + '/' + utils.urlify(model.entry.title) + '/' + req.query.argument;
        case constants.OBJECT_TYPES.argumentLink:
            return model.wikiBaseUrl + paths.wiki.arguments.entry + '/' + utils.urlify(model.entry.argument.title) + '/link/' + req.query.argument;
        default:
            return model.wikiBaseUrl + paths.wiki[constants.OBJECT_NAMES_MAP[model.ownerType]].entry + '/' + utils.urlify(model.entry.title) + '/' + model.entry._id;
    }
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
        case constants.OBJECT_TYPES.artifact:
            if(entity.parentId) {
                return {
                    entryId: entity.parentId,
                    entryType: constants.OBJECT_TYPES.artifact
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

function isEntryOnIntendedUrl(req, res, entry) {
    return !entry.private && !req.params.username || entry.private && (res.locals.group || req.params.username && entry.createUserId.equals(req.user.id));
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

function getCategories(model, topicId, req, callback) {
    getTopics({parentId: topicId, private: false, 'screening.status': constants.SCREENING_STATUS.status1.code }, { limit: 0, shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN, req: req }, function (err, results) {
            async.each(results, function(result, callback) {
                getTopics({ parentId: result._id }, { limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE, shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN, req: req }, function (err, subtopics) {
                    result.subtopics = subtopics;
                    if(subtopics.length < constants.SETTINGS.SUBCATEGORY_LIST_SIZE) {
                        // if subtopics are less than 3, get some arguments
                        var query = {
                            parentId: null,
                            ownerId: result._id,
                            ownerType: constants.OBJECT_TYPES.topic,
                            'screening.status': constants.SCREENING_STATUS.status1.code
                        };
                        getArguments(query, { limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE, rq: req, shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN }, function (err, subarguments) {
                            subarguments.forEach(function (subargument) {
                                setVerdictModel(subargument);
                            });
                            sortArguments(subarguments);
                            result.subarguments = subarguments;
                            callback();
                        });
                    } else {
                        callback();
                    }
                });
            }, function(err) {
                model.categories = results;
                callback();
            });
        });
}

function getDiaryCategories(req, callback) {
    db.Topic
        .find({ parentId: null, ownerType: constants.OBJECT_TYPES.user, ownerId: req.user.id })
        .sort({title: 1})
        .lean()
        .exec(function (err, results) {
            async.each(results, function(result, callback) {
                result.friendlyUrl = utils.urlify(result.title);
                callback();
            }, function() {
                callback(err, results);
            });
        });
}

function getUserGroups(req, callback) {
    db.Group
        .find({ "members.userId": req.user.id })
        .sort({title: 1})
        .lean()
        .exec(function (err, results) {
            callback(err, results);
        });
}

function createEntrySet(model) {
    var entries = []
        .concat(model.topics)
        .concat(model.arguments)
        .concat(model.questions)
        .concat(model.answers)
        .concat(model.issues)
        .concat(model.opinions)
        .concat(model.artifacts)
        .sort(function (a,b) {
            if (a.editDate < b.editDate) {
                return 1;
            }
            if (a.editDate > b.editDate) {
                return -1;
            }
            return 0;
        });
    if(entries.length > 1) {
        var midIndex = Math.floor(entries.length / 2);
        model.entrySet = [{entries: entries.slice(0, midIndex - 1)}];
        model.entrySet.push({entries: entries.slice(midIndex)});
    } else {
        model.entrySet = [{entries: entries}];
    }
}

function countEntries(model, groupFilter, callback) {
    async.parallel({
        topics: function(callback) {
            db.Topic
                .find(groupFilter)
                .count(function(err, count) {
                    model.topics = count;
                    callback();
                });
        },
        artifacts: function(callback) {
            db.Artifact
                .find(groupFilter)
                .count(function(err, count) {
                    model.artifacts = count;
                    callback();
                });
        },
        arguments: function(callback) {
            db.Argument
                .find(groupFilter)
                .count(function(err, count) {
                    model.arguments = count;
                    callback();
                });
        },
        questions: function (callback) {
            db.Question
                .find(groupFilter)
                .count(function(err, count) {
                    model.questions = count;
                    callback();
                });
        },
        answers: function (callback) {
            db.Answer
                .find(groupFilter)
                .count(function(err, count) {
                    model.answers = count;
                    callback();
                });
        },
        issues: function (callback) {
            db.Issue
                .find(groupFilter)
                .count(function(err, count) {
                    model.issues = count;
                    callback();
                });
        },
        opinions: function (callback) {
            db.Opinion
                .find(groupFilter)
                .count(function(err, count) {
                    model.opinions = count;
                    callback();
                });
        }
    }, function (err, results) {
        model.totalCount = model.topics + model.arguments + model.questions + model.answers + model.issues + model.opinions;
        callback();
    });
}

function setupEntryRouters(router, prefix) {

    var topicController     = require('../controllers/topics'),
        argumentController  = require('../controllers/arguments'),
        artifactController  = require('../controllers/artifacts'),
        questionController  = require('../controllers/questions'),
        answerController    = require('../controllers/answers'),
        issueController     = require('../controllers/issues'),
        opinionController   = require('../controllers/opinions'),
        visualizeController = require('../controllers/visualize');

    /* Visualize */
    router.get(prefix + '/visualize(/topic)?(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        visualizeController.GET_index(req, res);
    });

    /* Topics */

    router.get(prefix + '/topics', function (req, res) {
        topicController.GET_index(req, res);
    });

    router.get(prefix + '/topics/create', function (req, res) {
        topicController.GET_create(req, res);
    });

    router.post(prefix + '/topics/create', function (req, res) {
        topicController.POST_create(req, res);
    });

    router.get(prefix + '/topics/link/edit', function (req, res) {
        topicController.GET_link_edit(req, res);
    });

    router.post(prefix + '/topics/link/edit', function (req, res) {
        topicController.POST_link_edit(req, res);
    });

    router.get(prefix + '/topics/:friendlyUrl/:id', function (req, res) {
        topicController.GET_index(req, res);
    });

    router.get(prefix + '/topic/:friendlyUrl/link/:id', function (req, res) {
        topicController.GET_link_entry(req, res);
    });

    router.get(prefix + '/topic(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        topicController.GET_entry(req, res);
    });


    /* Arguments */

    router.get(prefix + '/arguments', function (req, res) {
        argumentController.GET_index(req, res);
    });

    router.get(prefix + '/arguments/create', function (req, res) {
        argumentController.GET_create(req, res);
    });

    router.post(prefix + '/arguments/create', function (req, res) {
        argumentController.POST_create(req, res);
    });

    router.get(prefix + '/arguments/link/edit', function (req, res) {
        argumentController.GET_link_edit(req, res);
    });

    router.post(prefix + '/arguments/link/edit', function (req, res) {
        argumentController.POST_link_edit(req, res);
    });

    router.get(prefix + '/argument/:friendlyUrl/link/:id', function (req, res) {
        argumentController.GET_link_entry(req, res);
    });

    router.get(prefix + '/argument(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        argumentController.GET_entry(req, res);
    });


    /* Artifacts */

    router.get(prefix + '/artifacts', function (req, res) {
        artifactController.GET_index(req, res);
    });

    router.get(prefix + '/artifacts/create', function (req, res) {
        artifactController.GET_create(req, res);
    });

    router.post(prefix + '/artifacts/create', function (req, res) {
        artifactController.POST_create(req, res);
    });

    router.get(prefix + '/artifact(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        artifactController.GET_entry(req, res);
    });


    /* Questions */

    router.get(prefix + '/questions', function (req, res) {
        questionController.GET_index(req, res);
    });

    router.get(prefix + '/questions/create', function (req, res) {
        questionController.GET_create(req, res);
    });

    router.post(prefix + '/questions/create', function (req, res) {
        questionController.POST_create(req, res);
    });

    router.get(prefix + '/question(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        questionController.GET_entry(req, res);
    });


    /* Answers */

    router.get(prefix + '/answers', function (req, res) {
        answerController.GET_index(req, res);
    });

    router.get(prefix + '/answers/create', function (req, res) {
        answerController.GET_create(req, res);
    });

    router.post(prefix + '/answers/create', function (req, res) {
        answerController.POST_create(req, res);
    });

    router.get(prefix + '/answer(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        answerController.GET_entry(req, res);
    });


    /* Issues */

    router.get(prefix + '/issues', function (req, res) {
        issueController.GET_index(req, res);
    });

    router.get(prefix + '/issues/create', function (req, res) {
        issueController.GET_create(req, res);
    });

    router.post(prefix + '/issues/create', function (req, res) {
        issueController.POST_create(req, res);
    });

    router.get(prefix + '/issue(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        issueController.GET_entry(req, res);
    });


    /* Opinions */

    router.get(prefix + '/opinions', function (req, res) {
        opinionController.GET_index(req, res);
    });

    router.get(prefix + '/opinions/create', function (req, res) {
        opinionController.GET_create(req, res);
    });

    router.post(prefix + '/opinions/create', function (req, res) {
        opinionController.POST_create(req, res);
    });

    router.get(prefix + '/opinion(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        opinionController.GET_entry(req, res);
    });
}

module.exports = {
    getBackupDir: getBackupDir,
    createContentPreview: createContentPreview,
    isEntryOwner: isEntryOwner,
    isEntryOnIntendedUrl: isEntryOnIntendedUrl,
    isCategoryTopic: isCategoryTopic,
    appendOwnerFlag: appendOwnerFlag,
    appendEntryExtras: appendEntryExtras,

    setArgumentModels: setArgumentModels,
    setTopicModels: setTopicModels,
    setQuestionModel: setQuestionModel,
    setIssueModel: setIssueModel,
    setOpinionModel: setOpinionModel,
    setEntryModels: setEntryModels,
    setGroupModel: setGroupModel,
    setEntryParents: setEntryParents,
    setEditorsUsername: setEditorsUsername,
    setClipboardModel: setClipboardModel,
    setupClipboard: setupClipboard,
    getClipboard: getClipboard,

    getTopics: getTopics,
    getArguments: getArguments,
    getTopQuestions: getTopQuestions,
    getTopArtifacts: getTopArtifacts,
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

    getEditorContent: getEditorContent,
    buildEntryUrl: buildEntryUrl,
    buildTopicReturnUrl: buildTopicReturnUrl,
    buildReturnUrl: buildReturnUrl,
    buildParentUrl: buildParentUrl,
    buildEntryReturnUrl: buildEntryReturnUrl,
    buildGroupUrl: buildGroupUrl,
    getDiaryBaseUrl: getDiaryBaseUrl,
    getDbModelByObjectType: getDbModelByObjectType,
    getObjectName: getObjectName,
    getParent: getParent,
    getCategories: getCategories,
    getDiaryCategories: getDiaryCategories,
    getUserGroups: getUserGroups,
    createEntrySet: createEntrySet,
    countEntries: countEntries,

    setupEntryRouters: setupEntryRouters
};