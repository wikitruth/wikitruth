'use strict';


module.exports = {
    about: '/about',
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
        contributors: '/members/contributors',
        reviewers: '/members/reviewers',
        administrators: '/members/administrators',
        profile: '/members/profile'
    },
    pages: {
        index: '/pages',
        page: '/pages/page',
        create: '/pages/create'
    },
    discuss: {
        index: '/discuss',
        category: '/discuss/category',
        topic: '/discuss/category/topic'
    },
    truth: {
        index: '/explore',
        topics: {
            index:  '/topics',
            entry:  '/topics/entry',
            create: '/topics/create',
            link: '/topics/link'
        },
        arguments: {
            index:  '/arguments',
            entry:  '/arguments/entry',
            create: '/arguments/create',
            link: '/arguments/link'
        },
        questions: {
            create: '/questions/create',
            index:  '/questions',
            entry:  '/questions/entry'
        },
        issues: {
            create: '/issues/create',
            index:  '/issues',
            entry:  '/issues/entry'
        },
        opinions: {
            create: '/opinions/create',
            index:  '/opinions',
            entry:  '/opinions/entry'
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
