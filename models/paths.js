'use strict';


module.exports = {
    about: '/topic/the-wikitruth-project',
    contact: '/contact',
    signup: '/signup',
    login: '/login',
    logout: '/logout',
    search: '/search',
    admin: {
        index: '/admin',
        mongoBackup: '/db-backup'
    },
    install: '/install',
    account: {
        index: '/account',
        settings: '/account/settings'
    },
    members: {
        index: '/members',
        reviewers: '/members/reviewers',
        administrators: '/members/administrators',
        profile: {
            index: '/members/profile',
            topics: '/members/profile/topics'
        }
    },
    pages: {
        index: '/pages',
        page: '/pages/page',
        create: '/pages/create'
    },
    truth: {
        index: '/explore',
        topics: {
            index:  '/topics',
            entry:  '/topic',
            create: '/topics/create',
            link: '/topics/link'
        },
        arguments: {
            index:  '/arguments',
            entry:  '/argument',
            create: '/arguments/create',
            link: '/arguments/link'
        },
        questions: {
            create: '/questions/create',
            index:  '/questions',
            entry:  '/question'
        },
        issues: {
            create: '/issues/create',
            index:  '/issues',
            entry:  '/issue'
        },
        opinions: {
            create: '/opinions/create',
            index:  '/opinions',
            entry:  '/opinion'
        },
        outline: {
            link: '/outline/link'
        },
        verdict: {
            update: '/verdict/update'
        },
        related: '/related',
        clipboard: '/clipboard'
    }
};
