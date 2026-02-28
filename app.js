'use strict';

if (!/[/\\]dist$/.test(__dirname)) {
    require('ts-node/register/transpile-only');
}

//dependencies
const config = require('./config/config'),
    paths = require('./models/paths'),
    constants = require('./models/constants'),
    contents = require('./models/contents'),
    templates = require('./models/templates'),
    applications = require('./models/applications'),
    express = require('express'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    mongoStore = require('connect-mongo'),
    passport = require('passport'),
    mongoose = require('mongoose'),
    bluebird = require('bluebird'),
    helmet = require('helmet'),
    cons = require('consolidate'),
    csrf = require('csurf'),
    kraken = require('kraken-js');

let options, app;

/*
 * Create and configure application. Also exports application instance for use by tests.
 * See https://github.com/krakenjs/kraken-js#options for additional configuration options.
 */
options = {
    // Ensure kraken resolves basedir to the project root regardless of compiled location
    basedir: process.cwd(),
    onconfig: function (config, next) {
        /*
         * Add any additional config setup or overrides here. `config` is an initialized
         * `confit` (https://github.com/krakenjs/confit/) configuration object.
         */
        next(null, config);
    }
};

app = module.exports = express();
app.use(kraken(options));


/* start of drywell routines */

//keep reference to config
app.config = config;

//setup the web server
//app.server = http.createServer(app);

//setup mongoose
mongoose.Promise = bluebird;
app.db = mongoose.createConnection(config.mongodb.uri, {
    // useNewUrlParser: true,
    // useCreateIndex: true,
    // useUnifiedTopology: true
});
app.db.on('error', console.error.bind(console, 'mongoose connection error: '));
app.db.once('open', function () {
    // and... we have a data store
});
app.db.on('disconnected', () => {
    console.error('MongoDB disconnected. Attempting to reconnect...');
});

//config data models
require('./models/schema/models')(app, mongoose);

//settings
app.disable('x-powered-by');
//app.set('port', config.port);
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
if (config.trustProxy) {
    app.set('trust proxy', config.trustProxy);
}
//app.enable('trust proxy');
app.engine('jade', cons.jade);
app.engine('pug', cons.pug);
app.engine('vash', cons.vash);
app.engine('mst', cons.mustache);
app.engine('hbs', cons.handlebars);

//middleware
app.use(require('morgan')('dev'));
app.use(require('compression')());
//app.use(require('serve-static')(path.join(__dirname, 'public')));
app.use(require('method-override')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser(config.cryptoKey));
app.use(require('./middlewares/requestContext'));

const helmetConfig = config.security && config.security.helmet ? config.security.helmet : { enabled: true };
if (helmetConfig.enabled) {
    app.use(helmet({
        // Keep CSP opt-in for now to avoid breaking legacy dust/jade inline scripts during migration.
        contentSecurityPolicy: helmetConfig.contentSecurityPolicy ? undefined : false,
        crossOriginEmbedderPolicy: helmetConfig.crossOriginEmbedderPolicy,
        crossOriginResourcePolicy: { policy: helmetConfig.crossOriginResourcePolicy || 'cross-origin' },
        referrerPolicy: { policy: helmetConfig.referrerPolicy || 'no-referrer' },
        hsts: helmetConfig.hsts && helmetConfig.hsts.enabled ? {
            maxAge: helmetConfig.hsts.maxAge,
            includeSubDomains: helmetConfig.hsts.includeSubDomains,
            preload: helmetConfig.hsts.preload
        } : false
    }));
}

let sessionStore = mongoStore.create({mongoUrl: config.mongodb.uri});
sessionStore.on('error', function (error) {
    console.error('Mongo session store error:', error);
    // You can implement fallback logic here, like switching to a MemoryStore
});
const sessionConfig = config.session || {};
const sessionCookie = sessionConfig.cookie || {};
app.use(session({
    name: sessionConfig.name || 'sid',
    resave: !!sessionConfig.resave,
    saveUninitialized: !!sessionConfig.saveUninitialized,
    rolling: !!sessionConfig.rolling,
    proxy: !!sessionConfig.proxy,
    secret: config.cryptoKey,
    store: sessionStore,
    cookie: {
        httpOnly: sessionCookie.httpOnly !== false,
        secure: !!sessionCookie.secure,
        sameSite: sessionCookie.sameSite || 'lax',
        maxAge: typeof sessionCookie.maxAgeMs === 'number' && sessionCookie.maxAgeMs > 0 ? sessionCookie.maxAgeMs : undefined
    }
}));

app.use(passport.initialize());
app.use(passport.session());
const csrfConfig = config.csrf || {};
const csrfCookie = csrfConfig.cookie || {};
const csrfProtection = csrf({
    ignoreMethods: Array.isArray(csrfConfig.ignoreMethods) ? csrfConfig.ignoreMethods : ['GET', 'HEAD', 'OPTIONS'],
    cookie: {
        signed: csrfCookie.signed !== false,
        secure: !!csrfCookie.secure,
        sameSite: csrfCookie.sameSite || 'lax'
    }
}); // kraken-js:lusca is already using csrf module
app.use(function (req, res, next) {
    // Runtime error beacons may come from sendBeacon and cannot reliably attach CSRF headers.
    if (/^\/api\/(?:v1\/)?monitoring\/errors\/?$/.test(req.path)) {
        return next();
    }
    return csrfProtection(req, res, next);
});

// setup response locals
require('./middlewares/locals')(app, passport);

//global locals
app.locals.projectName = app.config.projectName;
app.locals.titleSlogan = app.config.titleSlogan;
app.locals.homeUrl = app.config.homeUrl;
app.locals.copyrightYear = new Date().getFullYear();
app.locals.wikitruth = {
    projectName: app.config.projectName,
    homeUrl: app.config.homeUrl
};
//app.locals.copyrightName = app.config.companyName;
app.locals.cacheBreaker = app.config.cacheBreaker;
app.locals.googleAnalyticsTrackingId = app.config.googleAnalyticsTrackingId;
app.locals.grecaptcha = app.config.grecaptcha;
app.locals.paths = paths;
app.locals.applications = applications.getApplications();
app.locals.templates = templates;
app.locals.constants = constants;
app.locals.contents = contents;

//setup passport
require('./middlewares/passport')(app, passport);

//setup routes
require('./middlewares/routes')(app, passport);

const { apiErrorHandler } = require('./middlewares/apiError');
app.use(apiErrorHandler);

//custom (friendly) error handler
//app.use(require('./public/templates/jade/http/index').http500);
// check https://github.com/krakenjs/kraken-js/issues/447

//setup utilities
app.utility = {};
app.utility.sendmail = require('./utils/sendmail');
app.utility.slugify = require('./utils/slugify');
app.utility.workflow = require('./utils/workflow');

//listen up
/*
app.server.listen(app.config.port, function(){
    //and... we're live
    console.log('Server is running on port ' + config.port);
});
*/

app.on('start', function () {
    console.log('Application ready to serve requests.');
    console.log('Environment: %s', app.kraken.get('env:env'));
});
