'use strict';

//dependencies
var config          = require('./config/config'),
    applications    = require('./models/applications'),
    paths           = require('./models/paths'),
    constants       = require('./models/constants'),
    templates       = require('./models/templates'),
    express         = require('express'),
    cookieParser    = require('cookie-parser'),
    bodyParser      = require('body-parser'),
    session         = require('express-session'),
    mongoStore      = require('connect-mongo')(session),
    passport        = require('passport'),
    mongoose        = require('mongoose'),
    helmet          = require('helmet'),
    cons            = require('consolidate'),
    //csrf            = require('csurf'),
    kraken          = require('kraken-js');

var options, app;

/*
 * Create and configure application. Also exports application instance for use by tests.
 * See https://github.com/krakenjs/kraken-js#options for additional configuration options.
 */
options = {
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
app.db = mongoose.createConnection(config.mongodb.uri);
app.db.on('error', console.error.bind(console, 'mongoose connection error: '));
app.db.once('open', function () {
    //and... we have a data store
});

//config data models
require('./models/models')(app, mongoose);

//settings
app.disable('x-powered-by');
//app.set('port', config.port);
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(config.cryptoKey));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: config.cryptoKey,
    store: new mongoStore({ url: config.mongodb.uri })
}));
app.use(passport.initialize());
app.use(passport.session());
//app.use(csrf({ cookie: { signed: true } }));
helmet(app);

//response locals
app.use(/^[^\.]+$/, function(req, res, next) {
    //res.cookie('_csrfToken', req.csrfToken());

    if(req.user) {
        res.locals.user = {};
        res.locals.user.username = req.user.username;
        res.locals.user.defaultReturnUrl = req.user.defaultReturnUrl();
        res.locals.user.isAdmin = req.user.isAdmin();
        res.locals.user.roles = req.user.roles;
        res.locals.isContributor = req.user.username;
    } else if(res.locals.user) {
        delete res.locals.user;
    }

    // allow templates to access the request query
    res.locals.query = req.query;

    // set the application
    var application = applications.getApplication(req);
    res.locals.application = application;
    if(application) {
        application.resPath = application.id + '/';
        res.locals.projectName = application.navTitle;
        res.locals.titleSlogan = application.slogan;
    }

    next();
});

//global locals
app.locals.projectName = app.config.projectName;
app.locals.titleSlogan = app.config.titleSlogan;
app.locals.copyrightYear = new Date().getFullYear();
//app.locals.copyrightName = app.config.companyName;
app.locals.cacheBreaker = app.config.cacheBreaker;
app.locals.googleAnalyticsTrackingId = app.config.googleAnalyticsTrackingId;
app.locals.paths = paths;
app.locals.templates = templates;
app.locals.constants = constants;

//setup passport
require('./middlewares/passport')(app, passport);

//setup routes
require('./middlewares/routes')(app, passport);

//custom (friendly) error handler
app.use(require('./public/templates/jade/http/index').http500);
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
