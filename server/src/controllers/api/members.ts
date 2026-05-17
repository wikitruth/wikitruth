'use strict';
import type { ConstantsModule, UtilsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse, WikitruthNext } from '../../types/http';
import appModForDb from '../../app';
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
import * as utils from '../../utils/utils';
import constantsMod from '../../models/constants';
const constants = constantsMod as unknown as ConstantsModule;
import jwtMod from 'jsonwebtoken';
const jwt = jwtMod as unknown as { sign(payload: object, secret: string, options?: object): string; verify(token: string, secret: string): unknown };

export = function (router: Router) {
  // Get all contributors (members with public profiles)
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const contributors = await db.User
        .find({ 'preferences.privateProfile': { $ne: true } })
        .select('username name email roles preferences')
        .sort({ name: 1 })
        .lean();

      res.json({ contributors });
    } catch (err) {
      console.error('Error fetching members:', err);
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  });

  // Get screeners
  router.get('/screeners', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const screeners = await db.User
        .find({ 
          'roles.screener': true, 
          'preferences.privateProfile': { $ne: true } 
        })
        .select('username name email roles preferences')
        .sort({ name: 1 })
        .lean();

      res.json({ screeners });
    } catch (err) {
      console.error('Error fetching screeners:', err);
      res.status(500).json({ error: 'Failed to fetch screeners' });
    }
  });

  // Get reviewers
  router.get('/reviewers', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const reviewers = await db.User
        .find({ 
          'roles.reviewer': true, 
          'preferences.privateProfile': { $ne: true } 
        })
        .select('username name email roles preferences')
        .sort({ name: 1 })
        .lean();

      res.json({ reviewers });
    } catch (err) {
      console.error('Error fetching reviewers:', err);
      res.status(500).json({ error: 'Failed to fetch reviewers' });
    }
  });

  // Get administrators
  router.get('/administrators', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const administrators = await db.User
        .find({ 
          'roles.admin': { $exists: true }, 
          'preferences.privateProfile': { $ne: true } 
        })
        .select('username name email roles preferences')
        .sort({ name: 1 })
        .lean();

      res.json({ administrators });
    } catch (err) {
      console.error('Error fetching administrators:', err);
      res.status(500).json({ error: 'Failed to fetch administrators' });
    }
  });

  // Get current member profile
  router.get('/me', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const member = await db.User
        .findById(req.user._id || req.user.id)
        .select('username email roles preferences createdDate')
        .lean();

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      res.json({ member: member });
    } catch (err) {
      console.error('Error fetching current member:', err);
      res.status(500).json({ error: 'Failed to fetch member profile' });
    }
  });

  // Update current member profile preferences
  router.put('/me/preferences', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const privateProfile = Boolean(req.body?.privateProfile);
      const user = await db.User.findById(req.user._id || req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Member not found' });
      }

      user.preferences = {
        ...(user.preferences || {}),
        privateProfile: privateProfile,
      };
      await user.save();

      res.json({
        success: true,
        member: {
          _id: user._id,
          username: user.username,
          email: user.email,
          preferences: user.preferences,
        },
      });
    } catch (err) {
      console.error('Error updating member preferences:', err);
      res.status(500).json({ error: 'Failed to update member preferences' });
    }
  });

  // Get current member fast-switch status
  router.get('/me/fast-switch', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userId = req.user._id || req.user.id;
      const trustedClients = await db.TrustedClient.find({ userId: userId }).select('_id').lean();
      const trustedIds = new Set(trustedClients.map(function (client: Record<string, unknown>) {
        return String(client._id || '');
      }));

      const cookies = Array.isArray(req.cookies.fast_switch) ? req.cookies.fast_switch : [];
      const enabled = cookies.some(function (cookie: Record<string, unknown>) {
        return trustedIds.has(String(cookie?.id || ''));
      });

      return res.json({
        success: true,
        fastSwitch: {
          enabled: Boolean(enabled),
          trustedClients: trustedClients.length,
        },
      });
    } catch (err) {
      console.error('Error fetching fast-switch status:', err);
      return res.status(500).json({ error: 'Failed to fetch fast-switch status' });
    }
  });

  // Update current member fast-switch settings
  router.put('/me/fast-switch', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userId = req.user._id || req.user.id;
      const enabled = Boolean(req.body?.enabled);
      const pin = String(req.body?.pin || '').trim();
      const cookieName = 'fast_switch';
      const trustedClients = await db.TrustedClient.find({ userId: userId }).lean();
      const trustedIds = new Set(trustedClients.map(function (client: Record<string, unknown>) {
        return String(client._id || '');
      }));
      let cookies = Array.isArray(req.cookies.fast_switch) ? [...req.cookies.fast_switch] : [];
      const now = new Date();
      const expiry = new Date(now.getTime());
      expiry.setMonth(expiry.getMonth() + 6);

      if (enabled) {
        if (!/^\d{6}$/.test(pin)) {
          return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
        }

        const appConfig = (req.app as unknown as { config: { jwtSecret: string } }).config;
        const encryptedUserId = jwt.sign({ userId: userId }, `${pin}|${appConfig.jwtSecret}`);
        let updated = false;

        cookies = cookies.map(function (cookie: Record<string, unknown>) {
          if (trustedIds.has(String(cookie?.id || ''))) {
            updated = true;
            return {
              ...cookie,
              data: encryptedUserId,
              created: now,
            };
          }
          return cookie;
        });

        if (!updated) {
          const newClient = new db.TrustedClient({
            userId: userId,
            clientIp: req.ip,
            userAgent: req.headers['user-agent'],
          });
          await newClient.save();
          cookies.push({
            id: newClient._id,
            data: encryptedUserId,
            created: now,
          });
        }

        res.cookie(cookieName, cookies, { expires: expiry });
        return res.json({
          success: true,
          fastSwitch: {
            enabled: true,
            trustedClients: cookies.length,
          },
        });
      }

      const idsToRemove = new Set<string>();
      cookies.forEach(function (cookie: Record<string, unknown>) {
        const cookieId = String(cookie?.id || '');
        if (trustedIds.has(cookieId)) {
          idsToRemove.add(cookieId);
        }
      });

      if (idsToRemove.size > 0) {
        await db.TrustedClient.deleteMany({ _id: { $in: Array.from(idsToRemove) } });
      }

      cookies = cookies.filter(function (cookie: Record<string, unknown>) {
        return !idsToRemove.has(String(cookie?.id || ''));
      });

      if (cookies.length === 0) {
        res.clearCookie(cookieName);
      } else {
        res.cookie(cookieName, cookies, { expires: expiry });
      }

      return res.json({
        success: true,
        fastSwitch: {
          enabled: false,
          trustedClients: 0,
        },
      });
    } catch (err) {
      console.error('Error updating fast-switch settings:', err);
      return res.status(500).json({ error: 'Failed to update fast-switch settings' });
    }
  });

  // Get member journal (private entries authored by the profile owner)
  const getMemberJournal = async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const member = await db.User.findOne({ username: req.params.username }).select('_id username preferences').lean();
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      if (!canViewPrivateEntries(member, req.user)) {
        return res.status(403).json({ error: 'Journal is private' });
      }

      const tab = String(req.query?.tab || 'all').toLowerCase();
      const validTabs = ['all', 'topics', 'arguments', 'questions', 'answers', 'artifacts', 'issues', 'opinions'];
      const normalizedTab = validTabs.includes(tab) ? tab : 'all';
      const limit = normalizedTab === 'all' ? 15 : 100;
      const baseQuery: Record<string, unknown> = { createUserId: member._id, private: true };
      const shouldLoad = function (name: string) {
        return normalizedTab === 'all' || normalizedTab === name;
      };

      const [categories, rootTopics, topics, argumentsList, questions, answers, artifacts, issues, opinions] = await Promise.all([
        db.Topic.find({
          ownerType: constants.OBJECT_TYPES.user,
          ownerId: member._id,
          parentId: null,
        })
          .sort({ title: 1 })
          .limit(50)
          .lean(),
        db.Topic.find({
          ownerType: constants.OBJECT_TYPES.user,
          ownerId: member._id,
          parentId: null,
          private: true,
        })
          .sort({ editDate: -1 })
          .limit(50)
          .lean(),
        shouldLoad('topics') ? db.Topic.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('arguments') ? db.Argument.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('questions') ? db.Question.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('answers') ? db.Answer.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('artifacts') ? db.Artifact.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('issues') ? db.Issue.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('opinions') ? db.Opinion.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
      ]);

      const withFriendlyUrl = function (entry: Record<string, unknown> | null | undefined) {
        if (!entry) {
          return entry;
        }
        return {
          ...entry,
          friendlyUrl: entry.friendlyUrl || utils.urlify(entry.title || ''),
        };
      };

      const model = {
        member: {
          _id: member._id,
          username: member.username,
        },
        tab: normalizedTab,
        results: false,
        categories: categories.map(withFriendlyUrl),
        rootTopics: rootTopics.map(withFriendlyUrl),
        topics: topics.map(withFriendlyUrl),
        arguments: argumentsList.map(withFriendlyUrl),
        questions: questions.map(withFriendlyUrl),
        answers: answers.map(withFriendlyUrl),
        artifacts: artifacts.map(withFriendlyUrl),
        issues: issues.map(withFriendlyUrl),
        opinions: opinions.map(withFriendlyUrl),
        topicsMore: normalizedTab === 'all' && topics.length >= limit,
        argumentsMore: normalizedTab === 'all' && argumentsList.length >= limit,
        questionsMore: normalizedTab === 'all' && questions.length >= limit,
        answersMore: normalizedTab === 'all' && answers.length >= limit,
        artifactsMore: normalizedTab === 'all' && artifacts.length >= limit,
        issuesMore: normalizedTab === 'all' && issues.length >= limit,
        opinionsMore: normalizedTab === 'all' && opinions.length >= limit,
      };

      model.results = Boolean(
        model.topics.length ||
          model.arguments.length ||
          model.questions.length ||
          model.answers.length ||
          model.artifacts.length ||
          model.issues.length ||
          model.opinions.length,
      );

      return res.json(model);
    } catch (err) {
      console.error('Error fetching member journal:', err);
      return res.status(500).json({ error: 'Failed to fetch member journal' });
    }
  };

  router.get('/:username/journal', getMemberJournal);
  router.get('/:username/diary', getMemberJournal);

  // Get topics created by a member
  router.get('/:username/topics', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const member = await db.User
        .findOne({ username: req.params.username })
        .select('_id username preferences')
        .lean();

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      if (!canViewProfile(member, req.user)) {
        return res.status(403).json({ error: 'Profile is private' });
      }

      const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 200);
      const query: Record<string, unknown> = { createUserId: member._id };
      if (!canViewPrivateEntries(member, req.user)) {
        query.private = { $ne: true };
      }

      const topics = await db.Topic
        .find(query)
        .sort({ editDate: -1 })
        .limit(limit)
        .lean();

      res.json({
        member: {
          _id: member._id,
          username: member.username,
        },
        topics: topics.map(function (topic: Record<string, unknown>) {
          return {
            ...topic,
            friendlyUrl: topic.friendlyUrl || utils.urlify(topic.title || ''),
          };
        }),
      });
    } catch (err) {
      console.error('Error fetching member topics:', err);
      res.status(500).json({ error: 'Failed to fetch member topics' });
    }
  });

  // Get member following overview (groups, people, topic interests)
  router.get('/:username/following', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const member = await db.User
        .findOne({ username: req.params.username })
        .select('_id username preferences')
        .lean();

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      if (!canViewProfile(member, req.user)) {
        return res.status(403).json({ error: 'Profile is private' });
      }

      const canViewPrivate = canViewPrivateEntries(member, req.user);

      const groupsQuery: Record<string, unknown> = { 'members.userId': member._id };
      if (!canViewPrivate) {
        groupsQuery.privacyType = 10;
      }

      const groups = await db.Group
        .find(groupsQuery)
        .select('_id title description privacyType members')
        .sort({ editDate: -1 })
        .limit(50)
        .lean();

      const topicIdBuckets = await Promise.all([
        db.Argument.distinct('ownerId', { createUserId: member._id, ownerId: { $ne: null } }),
        db.Question.distinct('ownerId', { createUserId: member._id, ownerId: { $ne: null } }),
        db.Issue.distinct('ownerId', { createUserId: member._id, ownerId: { $ne: null } }),
        db.Opinion.distinct('ownerId', { createUserId: member._id, ownerId: { $ne: null } }),
        db.Artifact.distinct('ownerId', { createUserId: member._id, ownerId: { $ne: null } }),
      ]);
      const topicIds = [...new Set(topicIdBuckets.flat().map((id: Record<string, unknown>) => String(id || '')).filter(Boolean))];

      const topicQuery: Record<string, unknown> = { _id: { $in: topicIds } };
      if (!canViewPrivate) {
        topicQuery.private = { $ne: true };
      }

      const topics = topicIds.length === 0
        ? []
        : await db.Topic.find(topicQuery).select('_id title friendlyUrl private').sort({ editDate: -1 }).limit(50).lean();

      const relatedUserIds = [
        ...new Set(
          groups
            .flatMap(function (group: Record<string, unknown>) {
              const members = (group.members as Array<Record<string, unknown>> | undefined) || [];
              return members.map(function (memberRow: Record<string, unknown>) {
                return String(memberRow?.userId || '');
              });
            })
            .filter(function (id: string) {
              return id && id !== String(member._id);
            }),
        ),
      ];

      const people = relatedUserIds.length === 0
        ? []
        : await db.User
          .find({ _id: { $in: relatedUserIds }, 'preferences.privateProfile': { $ne: true } })
          .select('_id username roles')
          .sort({ username: 1 })
          .lean();

      res.json({
        member: {
          _id: member._id,
          username: member.username,
        },
        following: {
          people: people,
          topics: topics.map(function (topic: Record<string, unknown>) {
            return {
              ...topic,
              friendlyUrl: topic.friendlyUrl || utils.urlify(topic.title || ''),
            };
          }),
          groups: groups.map(function (group: Record<string, unknown>) {
            return {
              _id: group._id,
              title: group.title,
              description: group.description || '',
              privacyType: group.privacyType,
              friendlyUrl: group.friendlyUrl || utils.urlify(group.title || ''),
            };
          }),
        },
      });
    } catch (err) {
      console.error('Error fetching member following:', err);
      res.status(500).json({ error: 'Failed to fetch member following' });
    }
  });

  // Get member contributions across entity types
  router.get('/:username/contributions', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const member = await db.User
        .findOne({ username: req.params.username })
        .select('_id username preferences')
        .lean();

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      if (!canViewProfile(member, req.user)) {
        return res.status(403).json({ error: 'Profile is private' });
      }

      const tab = String(req.query?.tab || 'all').toLowerCase();
      const validTabs = ['all', 'topics', 'arguments', 'questions', 'answers', 'artifacts', 'issues', 'opinions'];
      const normalizedTab = validTabs.includes(tab) ? tab : 'all';
      const limit = normalizedTab === 'all' ? 15 : 100;
      const canViewPrivate = canViewPrivateEntries(member, req.user);
      const baseQuery: Record<string, unknown> = { createUserId: member._id };
      if (!canViewPrivate) {
        baseQuery.private = { $ne: true };
      }

      const shouldLoad = function (name: string) {
        return normalizedTab === 'all' || normalizedTab === name;
      };

      const [
        topics,
        argumentsList,
        questions,
        answers,
        artifacts,
        issues,
        opinions,
        topicsCount,
        argumentsCount,
        questionsCount,
        answersCount,
        artifactsCount,
        issuesCount,
        opinionsCount,
      ] = await Promise.all([
        shouldLoad('topics') ? db.Topic.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('arguments') ? db.Argument.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('questions') ? db.Question.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('answers') ? db.Answer.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('artifacts') ? db.Artifact.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('issues') ? db.Issue.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        shouldLoad('opinions') ? db.Opinion.find(baseQuery).sort({ editDate: -1 }).limit(limit).lean() : [],
        db.Topic.countDocuments(baseQuery),
        db.Argument.countDocuments(baseQuery),
        db.Question.countDocuments(baseQuery),
        db.Answer.countDocuments(baseQuery),
        db.Artifact.countDocuments(baseQuery),
        db.Issue.countDocuments(baseQuery),
        db.Opinion.countDocuments(baseQuery),
      ]);

      const withFriendlyUrl = function (entry: Record<string, unknown> | null | undefined) {
        if (!entry) {
          return entry;
        }
        return {
          ...entry,
          friendlyUrl: entry.friendlyUrl || utils.urlify(entry.title || ''),
        };
      };

      const model = {
        member: {
          _id: member._id,
          username: member.username,
        },
        tab: normalizedTab,
        results: false,
        topics: topics.map(withFriendlyUrl),
        arguments: argumentsList.map(withFriendlyUrl),
        questions: questions.map(withFriendlyUrl),
        answers: answers.map(withFriendlyUrl),
        artifacts: artifacts.map(withFriendlyUrl),
        issues: issues.map(withFriendlyUrl),
        opinions: opinions.map(withFriendlyUrl),
        counts: {
          topics: topicsCount,
          arguments: argumentsCount,
          questions: questionsCount,
          answers: answersCount,
          artifacts: artifactsCount,
          issues: issuesCount,
          opinions: opinionsCount,
          all:
            Number(topicsCount || 0) +
            Number(argumentsCount || 0) +
            Number(questionsCount || 0) +
            Number(answersCount || 0) +
            Number(artifactsCount || 0) +
            Number(issuesCount || 0) +
            Number(opinionsCount || 0),
        },
        topicsMore: normalizedTab === 'all' && topics.length >= limit,
        argumentsMore: normalizedTab === 'all' && argumentsList.length >= limit,
        questionsMore: normalizedTab === 'all' && questions.length >= limit,
        answersMore: normalizedTab === 'all' && answers.length >= limit,
        artifactsMore: normalizedTab === 'all' && artifacts.length >= limit,
        issuesMore: normalizedTab === 'all' && issues.length >= limit,
        opinionsMore: normalizedTab === 'all' && opinions.length >= limit,
      };

      model.results = Boolean(
        model.topics.length ||
          model.arguments.length ||
          model.questions.length ||
          model.answers.length ||
          model.artifacts.length ||
          model.issues.length ||
          model.opinions.length,
      );

      return res.json(model);
    } catch (err) {
      console.error('Error fetching member contributions:', err);
      return res.status(500).json({ error: 'Failed to fetch member contributions' });
    }
  });

  // Get member custom pages
  router.get('/:username/pages', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const member = await db.User.findOne({ username: req.params.username }).select('_id username').lean();
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const pages = await db.Page
        .find({ createUserId: member._id })
        .sort({ editDate: -1 })
        .lean();

      res.json({
        member: {
          _id: member._id,
          username: member.username,
        },
        pages: pages.map(function (page: Record<string, unknown>) {
          return {
            ...page,
            friendlyUrl: page.friendlyUrl || utils.urlify(page.title || ''),
          };
        }),
      });
    } catch (err) {
      console.error('Error fetching member pages:', err);
      res.status(500).json({ error: 'Failed to fetch member pages' });
    }
  });

  // Create member custom page
  router.post('/:username/pages', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const canManageProfile = req.user.username === req.params.username || req.user.canPlayRoleOf?.('admin');
      if (!canManageProfile) {
        return res.status(403).json({ error: 'Not allowed to create pages for this profile' });
      }

      const member = await db.User.findOne({ username: req.params.username }).select('_id username').lean();
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const title = String(req.body?.title || '').trim();
      const content = String(req.body?.content || '').trim();
      if (!title || title.length < 3) {
        return res.status(400).json({ error: 'Title must be at least 3 characters' });
      }
      if (!content || content.length < 10) {
        return res.status(400).json({ error: 'Content must be at least 10 characters' });
      }

      const now = new Date();
      const page = await db.Page.create({
        title: title,
        content: content,
        friendlyUrl: utils.urlify(title),
        createDate: now,
        editDate: now,
        createUserId: member._id,
        editUserId: req.user._id || req.user.id,
      });

      res.status(201).json({
        success: true,
        page: {
          _id: page._id,
          title: page.title,
          content: page.content,
          friendlyUrl: page.friendlyUrl || utils.urlify(page.title),
          createDate: page.createDate,
          editDate: page.editDate,
          createUserId: page.createUserId,
        },
      });
    } catch (err) {
      console.error('Error creating member page:', err);
      res.status(500).json({ error: 'Failed to create member page' });
    }
  });

  // Get member custom page
  router.get('/:username/pages/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const member = await db.User.findOne({ username: req.params.username }).select('_id username').lean();
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const page = await db.Page.findOne({ _id: req.params.id, createUserId: member._id }).lean();
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      res.json({
        member: {
          _id: member._id,
          username: member.username,
        },
        page: {
          ...page,
          friendlyUrl: page.friendlyUrl || utils.urlify(page.title || ''),
        },
      });
    } catch (err) {
      console.error('Error fetching member page:', err);
      res.status(500).json({ error: 'Failed to fetch member page' });
    }
  });

  // Update member custom page
  router.put('/:username/pages/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const canManageProfile = req.user.username === req.params.username || req.user.canPlayRoleOf?.('admin');
      if (!canManageProfile) {
        return res.status(403).json({ error: 'Not allowed to update pages for this profile' });
      }

      const member = await db.User.findOne({ username: req.params.username }).select('_id username').lean();
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const page = await db.Page.findOne({ _id: req.params.id, createUserId: member._id });
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      if (typeof req.body?.title !== 'undefined') {
        const title = String(req.body.title || '').trim();
        if (!title || title.length < 3) {
          return res.status(400).json({ error: 'Title must be at least 3 characters' });
        }
        page.title = title;
        page.friendlyUrl = utils.urlify(title);
      }

      if (typeof req.body?.content !== 'undefined') {
        const content = String(req.body.content || '').trim();
        if (!content || content.length < 10) {
          return res.status(400).json({ error: 'Content must be at least 10 characters' });
        }
        page.content = content;
      }

      page.editDate = new Date();
      page.editUserId = req.user._id || req.user.id;
      await page.save();

      res.json({
        success: true,
        page: {
          _id: page._id,
          title: page.title,
          content: page.content,
          friendlyUrl: page.friendlyUrl || utils.urlify(page.title),
          createDate: page.createDate,
          editDate: page.editDate,
          createUserId: page.createUserId,
        },
      });
    } catch (err) {
      console.error('Error updating member page:', err);
      res.status(500).json({ error: 'Failed to update member page' });
    }
  });

  // Get single member profile
  router.get('/:username', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const member = await db.User
        .findOne({ username: req.params.username })
        .select('username name email roles preferences createdDate')
        .lean();

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (!canViewProfile(member, req.user)) {
        return res.status(403).json({ error: 'Profile is private' });
      }

      res.json(member);
    } catch (err) {
      console.error('Error fetching member:', err);
      res.status(500).json({ error: 'Failed to fetch member' });
    }
  });
};

type ProfileLike = { username?: unknown; preferences?: { privateProfile?: unknown }; canPlayRoleOf?: (role: string) => boolean } | null | undefined;

function canViewProfile(member: ProfileLike, currentUser: ProfileLike): boolean {
  if (!member) {
    return false;
  }
  if (!member.preferences?.privateProfile) {
    return true;
  }
  if (!currentUser) {
    return false;
  }
  if (currentUser.username === member.username) {
    return true;
  }
  return Boolean(currentUser.canPlayRoleOf?.('admin'));
}

function canViewPrivateEntries(member: ProfileLike, currentUser: ProfileLike): boolean {
  if (!currentUser || !member) {
    return false;
  }
  if (currentUser.username === member.username) {
    return true;
  }
  return Boolean(currentUser.canPlayRoleOf?.('admin'));
}
