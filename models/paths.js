'use strict';


module.exports = {
    about: '/about',
    contact: '/contact',
    signup: '/signup',
    login: '/login',
    logout: '/logout',
    admin: '/admin',
    account: {
        index: '/account',
        settings: '/account/settings'
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
        index: '/truth',
        topics: {
            index: '/truth/topics',
            entry: '/truth/topics/entry',
            create: '/truth/topics/create'
        },
        arguments: {
            index: '/truth/arguments',
            entry: '/truth/arguments/entry',
            create: '/truth/arguments/create'
        },
        questions: {
            create: '/truth/questions/create',
            index: '/truth/questions',
            entry: '/truth/questions/entry'
        },
        outline: {
            link: '/truth/outline/link'
        },
        related: '/truth/related'
    },
    worldviews: {
        index: '/worldviews',
        entry: '/worldviews/entry',
        create: '/worldviews/create',
        questions: {
            index: '/worldviews/questions',
            create: '/worldviews/questions/create'
        },
        related: '/worldviews/related'
    },
    morality: {
        index: '/morality'
    }
};
