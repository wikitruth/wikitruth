'use strict';

module.exports = {
    OBJECT_TYPES: {
        topic: 1,
        argument: 2,
        question: 3,
        comment: 4,
        definition: 5,
        issue: 10,
        opinion: 11,

        worldview: 200
    },
    ARGUMENT_LINK_TYPES: {
        prove: 1,
        disprove: 2
    },
    ARGUMENT_TYPES: {
        positive: 1,
        negative: 2
    },
    CORE_GROUPS: {
        truth: 100,
        worldviews: 101,
        morality: 102
    },

    DB: {
        cols: [
            'users',
            'accountcategories',
            'accounts',
            'admingroups',
            'admins',
            'arguments',
            'ideologies',
            'issues',
            'loginattempts',
            'opinions',
            'pages',
            'questions',
            'status',
            'topics',
            'words'
        ],
        colmaps: {
            'accountcategories': 'AccountCategory',
            'accounts': 'Account',
            'admingroups': 'AdminGroup',
            'admins': 'Admin',
            'arguments': 'Argument',
            'categories': 'Category',
            'ideologies': 'Ideology',
            'issues': 'Issue',
            'loginattempts': 'LoginAttempt',
            'opinions': 'Opinion',
            'pages': 'Page',
            'questions': 'Question',
            'sessions': 'Session',
            'status': 'Status',
            'topics': 'Topic',
            'users': 'User',
            'words': 'Word'
        }
    }
};