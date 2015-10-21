'use strict';

exports = module.exports = function(app, mongoose) {
  //embeddable docs first
  require('./account/Note')(app, mongoose);
  require('./account/Status')(app, mongoose);
  require('./account/StatusLog')(app, mongoose);
  require('./account/Category')(app, mongoose);

  //then regular docs
  require('./account/User')(app, mongoose);
  require('./account/Admin')(app, mongoose);
  require('./account/AdminGroup')(app, mongoose);
  require('./account/Account')(app, mongoose);
  require('./account/LoginAttempt')(app, mongoose);

  // core
  require('./core/Topic')(app, mongoose);
  require('./core/Argument')(app, mongoose);
  require('./core/Question')(app, mongoose);
  require('./core/Content')(app, mongoose);
};
