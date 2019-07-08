'use strict';

(function () {
    var exports = {
        about: '/topic/the-wikitruth-project',
        contact: '/contact',
        signup: '/signup',
        login: '/login',
        logout: '/logout',
        logoutSwitch: '/logout-switch',
        fastSwitch: '/fast-switch',
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
        groups: {
            index: '/groups',
            create: '/groups/create',
            group: {
                posts: '/posts',
                members: '/members'
            }
        },
        members: {
            index: '/members',
            screeners: '/members/screeners',
            reviewers: '/members/reviewers',
            administrators: '/members/administrators',
            profile: {
                index: '/members/profile',
                pages: {
                    index: '/pages',
                    page: '/pages/page',
                    create: '/pages/create'
                },
                diary: '/diary'
            }
        },
        wiki: {
            index: '/explore',
            topics: {
                index: '/topics',
                entry: '/topic',
                create: '/topics/create',
                link: {
                    edit: '/topics/link/edit'
                }
            },
            arguments: {
                index: '/arguments',
                entry: '/argument',
                create: '/arguments/create',
                link: {
                    edit: '/arguments/link/edit'
                }
            },
            artifacts: {
                index: '/artifacts',
                entry: '/artifact',
                create: '/artifacts/create'
            },
            questions: {
                create: '/questions/create',
                index: '/questions',
                entry: '/question'
            },
            answers: {
                create: '/answers/create',
                index: '/answers',
                entry: '/answer'
            },
            issues: {
                create: '/issues/create',
                index: '/issues',
                entry: '/issue'
            },
            opinions: {
                create: '/opinions/create',
                index: '/opinions',
                entry: '/opinion'
            },
            outline: {
                link: '/outline/link'
            },
            verdict: {
                update: '/verdict/update'
            },
            screening: '/screening',
            visualize: '/visualize',
            related: '/related',
            clipboard: '/clipboard',
            convert: '/convert'
        }
    };

    if (typeof module != 'undefined') {
        module.exports = exports;
    } else if (typeof window != 'undefined') {
        window.WT_PATHS = exports;
    }
})();