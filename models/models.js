'use strict';

module.exports = function(app, mongoose) {
  // embeddable docs first
  require('./schema/account/Note')(app, mongoose);
  require('./schema/account/Status')(app, mongoose);
  require('./schema/account/StatusLog')(app, mongoose);
  require('./schema/account/AccountCategory')(app, mongoose);

  // then regular docs
  require('./schema/account/User')(app, mongoose);
  require('./schema/account/Admin')(app, mongoose);
  require('./schema/account/AdminGroup')(app, mongoose);
  require('./schema/account/Account')(app, mongoose);
  require('./schema/account/LoginAttempt')(app, mongoose);

  // core
  require('./schema/core/Topic')(app, mongoose);
  require('./schema/core/TopicLink')(app, mongoose);
  require('./schema/core/Argument')(app, mongoose);
  require('./schema/core/ArgumentLink')(app, mongoose);
  require('./schema/core/ObjectLink')(app, mongoose);
  require('./schema/core/Category')(app, mongoose);
  require('./schema/core/Question')(app, mongoose);
  require('./schema/core/Answer')(app, mongoose);
  require('./schema/core/Issue')(app, mongoose);
  require('./schema/core/Opinion')(app, mongoose);
  require('./schema/core/Page')(app, mongoose);
  require('./schema/core/Artifact')(app, mongoose);
  require('./schema/core/Group')(app, mongoose);

  require('./schema/core/TrustedClient')(app, mongoose);
  //require('./schema/core/Word')(app, mongoose);
  //require('./schema/core/Meaning')(app, mongoose);
  //require('./schema/core/Definition')(app, mongoose);
};
