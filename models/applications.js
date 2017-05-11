'use strict';

var wikitruthDomains = [
    'wikitruth.co',
    'www.wikitruth.co'
];

var APPLICATIONS = [
    {
        id: 'fixtheph',
        title: 'Fix The Philippines',
        navTitle: 'fixtheph',
        slogan: 'Fix the Philippines, help citizens identify, raise and fix issues in their society and the government',
        logoIcon: '/img/fixtheph/logo-64x64.png',
        aboutUrl: '/topic/fixthephilippines-org',
        exploreUrl: '/topic/republic-of-the-philippines',
        domains: [
            'fixthephilippines.org',
            /*'localhost',*/
            'www.fixthephilippines.org'
        ],
        googleAnalyticsTrackingId: 'UA-66543450-2',
        jumbotron: {
            title: "Let's Fix The Philippines",
            description: 'A system to promote transparency and accountability, help citizens identify, raise and fix issues in the Philippine society and government.'
        },
        sections: [
            {
                title: 'People',
                iconClass: 'fa fa-user',
                url: '/topic/philippine-popular-figures',
                description: 'Government officials, politicians, media personnel, businessmen, influential leaders and every key people that shape the society.'
            },
            {
                title: 'Incidents',
                iconClass: 'fa fa-bolt',
                url: '/topic/incidents-in-the-philippines',
                description: 'Natural calamities, disasters, accidents, rallies, good cause, immoral and malicious acts that impact the society and people.'
            },
            {
                title: 'Projects',
                iconClass: 'fa fa-truck',
                url: '/topic/projects-in-the-philippines',
                description: 'Major projects done by the government or private organizations as long as it impacts the people negatively or positively.'
            },
            {
                title: 'Organizations',
                iconClass: 'fa fa-bank',
                url: '/topic/organizations-in-the-philippines',
                description: 'The Government of the Philippines, public or private businesses, charities, nonprofit, religions or any movement or group that impact us.'
            }
        ]
    }
];

function getApplications() {
    return APPLICATIONS;
}

function getApplication(req) {
    var domainName = req.hostname, application = null;
    if(wikitruthDomains.indexOf(domainName) === -1) {
        APPLICATIONS.some(function (app) {
            if(app.domains.indexOf(domainName) > -1) {
                application = app;
                return true;
            }
        });
    }
    return application;
}


module.exports = {
    getApplications: getApplications,
    getApplication: getApplication
};
