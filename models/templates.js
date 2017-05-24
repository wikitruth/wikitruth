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
            following: 'dust/members/profile/following',
            pages: {
                index: 'dust/members/profile/pages/index',
                page: 'dust/members/profile/pages/page',
                create: 'dust/members/profile/pages/create'
            }
        }
    },
    wiki: {
        index: 'dust/wiki/explore',
        indexHeader: 'dust/wiki/index-header',
        entryHeader: 'dust/wiki/entry-header',
        topics: {
            index: 'dust/wiki/topics/index',
            create: 'dust/wiki/topics/create',
            entry: 'dust/wiki/topics/entry',
            link: {
                edit: 'dust/wiki/topics/link/edit',
                entry: 'dust/wiki/topics/link/entry'
            }
        },
        arguments: {
            index: 'dust/wiki/arguments/index',
            create: 'dust/wiki/arguments/create',
            entry: 'dust/wiki/arguments/entry',
            link: {
                edit: 'dust/wiki/arguments/link/edit',
                entry: 'dust/wiki/arguments/link/entry'
            }
        },
        questions: {
            index: 'dust/wiki/questions/index',
            create: 'dust/wiki/questions/create',
            entry: 'dust/wiki/questions/entry'
        },
        answers: {
            index: 'dust/wiki/answers/index',
            create: 'dust/wiki/answers/create',
            entry: 'dust/wiki/answers/entry'
        },
        issues: {
            create: 'dust/wiki/issues/create',
            index:  'dust/wiki/issues/index',
            entry:  'dust/wiki/issues/entry'
        },
        opinions: {
            create: 'dust/wiki/opinions/create',
            index:  'dust/wiki/opinions/index',
            entry:  'dust/wiki/opinions/entry'
        },
        outline: {
            create: 'dust/wiki/outline/create',
            linkTo: 'dust/wiki/outline/link-to'
        },
        verdict: {
            update: 'dust/wiki/verdict/update'
        },
        screening: 'dust/wiki/screening',
        visualize: 'dust/wiki/visualize',
        related: 'dust/wiki/related',
        clipboard: 'dust/wiki/clipboard'
    }
};
