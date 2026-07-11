'use strict';

import type { LegacyControllerFactory } from '../../../server/src/types/legacyControllers';

import mongoose from 'mongoose';
import async from 'async';

import templates from '../models/templates';
import paths from '../models/paths';
import flowUtils from '../utils/flowUtils';
import utils from '../utils/utils';
import constants from '../models/constants';
import app from '../app';

const db = app.db.models;

const mountGroupsController: LegacyControllerFactory = function (router) {

    const prefix = '/:groupTitleUrl/:group/posts';

    router.get('/', async function (req, res) {
        const model = {}
        let results = await db.Group
            .find({})
            .sort({title: 1})
            .lean();
        results.forEach(function (result) {
            result.friendlyUrl = utils.urlify(result.title);
        })
        if (req.user) {
            model.privateGroups = results.filter(function (group) {
                return group.privacyType !== constants.GROUP_PRIVACY_TYPES.type10.code
                    && group.members && group.members.some(function (member) {
                        const memberUserId = member.userId && member.userId._id ? member.userId._id : member.userId;
                        return String(memberUserId || '') === String(req.user.id || req.user._id || '');
                    });
            })
        }
        model.publicGroups = results.filter(function (group) {
            return group.privacyType === constants.GROUP_PRIVACY_TYPES.type10.code;
        })
        res.render(templates.groups.index, model)
    });

    router.get('/create', async function (req, res) {
        const model = {};
        model.cancelUrl = flowUtils.buildReturnUrl(req, paths.groups.index);
        if (req.query.id) req.query.group = req.query.id;
        await flowUtils.setGroupModel(req, model);
        res.render(templates.groups.create, model);
    });

    router.post('/create', function (req, res) {
        POST_create(req, res);
    });

    router.get('/:friendlyUrl/:id', async function (req, res) {
        const model = {};
        req.query.group = req.params.id;
        await flowUtils.setGroupModel(req, model);
        const groupFilter = {
            $or: [
                {ownerId: model.group._id, ownerType: constants.OBJECT_TYPES.group},
                {groupId: model.group._id}
            ]
        };
        await flowUtils.countEntries(model, groupFilter);
        model.url = flowUtils.buildGroupUrl(model.group) + paths.groups.group.posts;
        model.contributions = model.totalCount;
        res.render(templates.groups.group.index, model);
    });

    router.get('/:friendlyUrl/:id/members', async function (req, res) {
        const model = {};
        req.query.group = req.params.id;
        await flowUtils.setGroupModel(req, model);
        res.render(templates.groups.group.members, model);
    });

    /* All Posts */
    router.get(prefix, function (req, res) {
        GET_posts(req, res);
    });

    flowUtils.setupEntryRouters(router, prefix);
};

export default mountGroupsController;

function POST_create(req, res) {
    var query = {_id: req.query.id || new mongoose.Types.ObjectId()};
    db.Group.findOne(query, function (err, result) {
        var dateNow = Date.now();
        var titleChanged = !result || result.title !== req.body.title;
        var entity = result ? result : {};
        entity.title = req.body.title;
        entity.description = flowUtils.getEditorContent(req.body.description);
        entity.contentPreview = flowUtils.createContentPreview(entity.description);
        entity.friendlyUrl = utils.urlify(req.body.title);
        entity.privacyType = req.body.privacyType;
        entity.editUserId = req.user.id;
        entity.editDate = dateNow;
        if (!result) {
            entity.createUserId = req.user.id;
            entity.createDate = dateNow;
        }
        if (!entity.members || entity.members.length === 0) {
            entity.members = [
                {
                    userId: req.user.id,
                    roleType: constants.GROUP_ROLE_TYPES.type20.code
                }
            ];
        }
        db.Group.findOneAndUpdate(query, entity, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }, function (err, updatedEntity) {
            // clear cache
            if (!result || titleChanged) delete req.session.myGroups;
            var url = paths.groups.index + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
            res.redirect(url);
        });
    });
}
async function GET_posts(req, res) {
    const LIMIT = req.query.tab ? 25 : 15;
    const allTabs = !req.query.tab;
    const tab = req.query.tab ? req.query.tab : 'all';
    const baseUrl = new URL(req.originalUrl, 'http://legacy.local');
    const model = {
        tab: tab,
        url: baseUrl.pathname,
        group: res.locals.group
    };

    if (!model.group) {
        req.query.group = req.params.group || req.params.id;
        await flowUtils.setGroupModel(req, model);
    }
    if (!model.group) {
        return res.status(404).render(templates.errors.http404);
    }

    const groupId = model.group._id;
    const groupQuery = {
        $or: [
            {groupId: groupId},
            {ownerType: constants.OBJECT_TYPES.group, ownerId: groupId}
        ]
    };

    model.categories = await db.Topic
        .find({parentId: null, ownerType: constants.OBJECT_TYPES.group, ownerId: groupId})
        .sort({title: 1})
        .lean();
    for (const category of model.categories) {
        category.friendlyUrl = utils.urlify(category.title);
        const subtopics = await flowUtils.getTopics({parentId: category._id}, {
            limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE,
            req: req,
            shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN
        });
        if (subtopics.length > 0) category.subtopics = subtopics;
        if (subtopics.length < constants.SETTINGS.SUBCATEGORY_LIST_SIZE) {
            const subarguments = await flowUtils.getArguments({
                parentId: null,
                ownerId: category._id,
                ownerType: constants.OBJECT_TYPES.topic
            }, {
                limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE - subtopics.length,
                req: req,
                shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN
            });
            subarguments.forEach((entry) => flowUtils.setVerdictModel(entry));
            flowUtils.sortArguments(subarguments);
            category.subarguments = subarguments;
        }
    }

    model.rootTopics = await flowUtils.getTopics({
        parentId: null,
        ownerType: constants.OBJECT_TYPES.group,
        ownerId: groupId
    }, {limit: 0, req: req});

    flowUtils.setModelContext(req, res, model);
    flowUtils.setClipboardModel(req, model);

    const loadEntries = async (key, objectType, query = groupQuery) => {
        if (!allTabs && model.tab !== key) return;
        const entries = await db[objectType.model]
            .find(query)
            .sort({editDate: -1})
            .limit(LIMIT)
            .lean();
        await flowUtils.setEditorsUsername(entries);
        await flowUtils.setEntryParents(entries, objectType.code);
        entries.forEach((entry) => flowUtils.appendEntryExtras(entry, objectType.code, req));
        model[key] = entries;
        if (entries.length > 0) {
            if (allTabs && entries.length >= LIMIT) model[`${key}More`] = true;
            model.results = true;
        }
    };

    await Promise.all([
        loadEntries('topics', {model: 'Topic', code: constants.OBJECT_TYPES.topic}),
        loadEntries('arguments', {model: 'Argument', code: constants.OBJECT_TYPES.argument}),
        loadEntries('questions', {model: 'Question', code: constants.OBJECT_TYPES.question}),
        loadEntries('answers', {model: 'Answer', code: constants.OBJECT_TYPES.answer}),
        loadEntries('artifacts', {model: 'Artifact', code: constants.OBJECT_TYPES.artifact}),
        loadEntries('issues', {model: 'Issue', code: constants.OBJECT_TYPES.issue}),
        loadEntries('opinions', {model: 'Opinion', code: constants.OBJECT_TYPES.opinion})
    ]);

    if (model.arguments) {
        model.arguments.forEach((entry) => flowUtils.setVerdictModel(entry));
        flowUtils.sortArguments(model.arguments);
    }
    if (model.issues) {
        model.issues.forEach((entry) => {
            entry.issueType = constants.ISSUE_TYPES[`type${entry.issueType}`];
        });
    }

    flowUtils.createEntrySet(model);
    res.render(templates.groups.group.posts, model);
}
