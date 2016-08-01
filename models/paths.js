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
            index:  '/truth/topics',
            entry:  '/truth/topics/entry',
            create: '/truth/topics/create'
        },
        arguments: {
            index:  '/truth/arguments',
            entry:  '/truth/arguments/entry',
            create: '/truth/arguments/create'
        },
        questions: {
            create: '/truth/questions/create',
            index:  '/truth/questions',
            entry:  '/truth/questions/entry'
        },
        outline: {
            link: '/truth/outline/link'
        },
        verdict: {
            update: '/truth/verdict/update'
        },
        related: '/truth/related'
    },
    worldviews: {
        index: '/worldviews',
        entry: '/worldviews/entry',
        create: '/worldviews/create',
        topics: {
            index: '/worldviews/topics',
            entry: '/worldviews/topics/entry',
            create: '/worldviews/topics/create'
        },
        arguments: {
            index: '/worldviews/arguments',
            entry: '/worldviews/arguments/entry',
            create: '/worldviews/arguments/create'
        },
        questions: {
            index: '/worldviews/questions',
            create: '/worldviews/questions/create',
            entry:  '/worldviews/questions/entry'
        },
        related: '/worldviews/related'
    },
    morality: {
        index: '/morality',
        topics: {
            index: '/morality/topics',
            entry: '/morality/topics/entry',
            create: '/morality/topics/create'
        },
        arguments: {
            index: '/morality/arguments',
            entry: '/morality/arguments/entry',
            create: '/morality/arguments/create'
        },
        questions: {
            create: '/morality/questions/create',
            index: '/morality/questions',
            entry: '/morality/questions/entry'
        },
        outline: {
            link: '/morality/outline/link'
        },
        related: '/morality/related'
    }
};
