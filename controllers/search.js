'use strict';

var templates = require('../models/templates'),
    constants = require('../models/constants'),
    flowUtils = require('../utils/flowUtils'),
    db = require('../app').db.models,
    async = require('async');

module.exports = function (router) {

    router.get('/', async function (req, res) {
        const MAX_RESULT = 15;
        const keyword = req.query.q;
        const allTabs = !req.query.tab;
        const searchContent = (req.query.content ? req.query.content : 'all').toLowerCase();
        const limit = allTabs ? MAX_RESULT : 0;
        const tab = req.query.tab ? req.query.tab : 'all';
        const model = {
            tab: tab,
            keyword: keyword,
            content: searchContent,
            results: !allTabs // this is to allow the user to switch to other tabs if the current is empty
        };
        if (!keyword) {
            return res.render(templates.search, model);
        }
        let privacyFilter = [{private: false}];
        switch (searchContent) {
            case 'wiki':
                privacyFilter = [{private: false}];
                break;
            case 'diary':
                privacyFilter = req.user ? [{private: true, createUserId: req.user.id}] : [{private: false}];
                break;
            //case 'all':
            default:
                privacyFilter = req.user ? [{private: false}, {
                    private: true,
                    createUserId: req.user.id
                }] : [{private: false}];
        }
        if (req.user) {
            req.params.username = req.user.username;
        }
        flowUtils.setModelContext(req, res, model);
        await async.parallel({
            topics: async function (callback) {
                if (!allTabs && tab !== 'topics') {
                    return callback();
                }
                let results = await db.Topic
                    .find({$text: {$search: keyword}, $or: privacyFilter}, {score: {$meta: "textScore"}})
                    .sort({score: {$meta: "textScore"}})
                    .limit(limit)
                    .lean()
                    .exec();
                if (!results) {
                    return callback()
                }
                await flowUtils.setEditorsUsername(results)
                await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
                results.forEach(function (result) {
                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
                    //result.link = false;
                });
                model.topics = results;
                if (results.length > 0) {
                    if (allTabs && results.length >= MAX_RESULT) {
                        model.topicsMore = true;
                    }
                    model.results = true;
                }
                callback();
            },
            arguments: async function (callback) {
                if (!allTabs && tab !== 'arguments') {
                    return callback();
                }
                let results = await db.Argument
                    .find({$text: {$search: keyword}, $or: privacyFilter}, {score: {$meta: "textScore"}})
                    .sort({score: {$meta: "textScore"}})
                    .limit(limit)
                    .lean()
                    .exec()
                await flowUtils.setEditorsUsername(results)
                await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument)
                results.forEach(function (result) {
                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
                    flowUtils.setVerdictModel(result);
                });
                flowUtils.sortArguments(results);
                model.arguments = results;
                if (results.length > 0) {
                    if (allTabs && results.length >= MAX_RESULT) {
                        model.argumentsMore = true;
                    }
                    model.results = true;
                }
                callback();
            },
            questions: async function (callback) {
                if (!allTabs && tab !== 'questions') {
                    return callback();
                }
                let results = await db.Question
                    .find({$text: {$search: keyword}, $or: privacyFilter}, {score: {$meta: "textScore"}})
                    .sort({score: {$meta: "textScore"}})
                    .limit(limit)
                    .lean()
                    .exec()
                await flowUtils.setEditorsUsername(results)
                await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question)
                results.forEach(function (result) {
                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                });
                model.questions = results;
                if (results.length > 0) {
                    if (allTabs && results.length >= MAX_RESULT) {
                        model.questionsMore = true;
                    }
                    model.results = true;
                }
                callback();
            },
            answers: async function (callback) {
                if (!allTabs && tab !== 'answers') {
                    return callback();
                }
                let results = await db.Answer
                    .find({$text: {$search: keyword}, $or: privacyFilter}, {score: {$meta: "textScore"}})
                    .sort({score: {$meta: "textScore"}})
                    .limit(limit)
                    .lean()
                    .exec()
                await flowUtils.setEditorsUsername(results)
                await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer)
                results.forEach(function (result) {
                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
                });
                model.answers = results;
                if (results.length > 0) {
                    if (allTabs && results.length >= MAX_RESULT) {
                        model.answersMore = true;
                    }
                    model.results = true;
                }
                callback();
            },
            artifacts: async function (callback) {
                if (!allTabs && tab !== 'artifacts') {
                    return callback();
                }
                let results = await db.Artifact
                    .find({$text: {$search: keyword}, $or: privacyFilter}, {score: {$meta: "textScore"}})
                    .sort({score: {$meta: "textScore"}})
                    .limit(limit)
                    //.lean()
                    .exec()
                await flowUtils.setEditorsUsername(results)
                await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact)
                results.forEach(function (result) {
                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
                    result.setThumbnailPath(req.params.username);
                });
                model.artifacts = results;
                if (results.length > 0) {
                    if (allTabs && results.length >= MAX_RESULT) {
                        model.artifactsMore = true;
                    }
                    model.results = true;
                }
                callback();
            },
            issues: async function (callback) {
                if (!allTabs && tab !== 'issues') {
                    return callback();
                }
                let results = await db.Issue
                    .find({$text: {$search: keyword}, $or: privacyFilter}, {score: {$meta: "textScore"}})
                    .sort({score: {$meta: "textScore"}})
                    .limit(limit)
                    .lean()
                    .exec();
                await flowUtils.setEditorsUsername(results);
                await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
                results.forEach(function (result) {
                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
                });
                model.issues = results;
                if (results.length > 0) {
                    if (allTabs && results.length >= MAX_RESULT) {
                        model.issuesMore = true;
                    }
                    model.results = true;
                }
                callback();
            },
            opinions: async function (callback) {
                if (!allTabs && tab !== 'opinions') {
                    return callback();
                }
                let results = await db.Opinion
                    .find({$text: {$search: keyword}, $or: privacyFilter}, {score: {$meta: "textScore"}})
                    .sort({score: {$meta: "textScore"}})
                    .limit(limit)
                    .lean()
                    .exec();
                await flowUtils.setEditorsUsername(results);
                await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
                results.forEach(function (result) {
                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
                });
                model.opinions = results;
                if (results.length > 0) {
                    if (allTabs && results.length >= MAX_RESULT) {
                        model.opinionsMore = true;
                    }
                    model.results = true;
                }
                callback();
            }
        }, function (err, results) {
            res.render(templates.search, model);
        });
    });

};
