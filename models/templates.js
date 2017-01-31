'use strict';


module.exports = {
    index: 'dust/index',
    help: 'dust/help-us',
    admin: {
        mongoBackup: 'dust/admin/db-backup'
    },
    install: 'dust/install/index',
    about: {
        index: 'dust/about/page'
    },
    search: 'dust/search',
    members: {
        contributors: 'dust/members/contributors',
        screeners: 'dust/members/screeners',
        reviewers: 'dust/members/reviewers',
        administrators: 'dust/members/administrators',
        profile: {
            index: 'dust/members/profile/profile',
            topics: 'dust/members/profile/topics',
            contributions: 'dust/members/profile/contributions',
            pages: {
                index: 'dust/members/profile/pages/index',
                page: 'dust/members/profile/pages/page',
                create: 'dust/members/profile/pages/create'
            }
        }
    },
    truth: {
        index: 'dust/truth/explore',
        indexHeader: 'dust/truth/index-header',
        entryHeader: 'dust/truth/entry-header',
        topics: {
            index: 'dust/truth/topics/index',
            create: 'dust/truth/topics/create',
            entry: 'dust/truth/topics/entry',
            link: 'dust/truth/topics/link'
        },
        arguments: {
            index: 'dust/truth/arguments/index',
            create: 'dust/truth/arguments/create',
            entry: 'dust/truth/arguments/entry',
            link: 'dust/truth/arguments/link'
        },
        questions: {
            index: 'dust/truth/questions/index',
            create: 'dust/truth/questions/create',
            entry: 'dust/truth/questions/entry'
        },
        answers: {
            index: 'dust/truth/answers/index',
            create: 'dust/truth/answers/create',
            entry: 'dust/truth/answers/entry'
        },
        issues: {
            create: 'dust/truth/issues/create',
            index:  'dust/truth/issues/index',
            entry:  'dust/truth/issues/entry'
        },
        opinions: {
            create: 'dust/truth/opinions/create',
            index:  'dust/truth/opinions/index',
            entry:  'dust//truth/opinions/entry'
        },
        outline: {
            create: 'dust/truth/outline/create',
            linkTo: 'dust/truth/outline/link-to'
        },
        verdict: {
            update: 'dust/truth/verdict/update'
        },
        related: 'dust/truth/related',
        clipboard: 'dust/truth/clipboard'
    }
};
