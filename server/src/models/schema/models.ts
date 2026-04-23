'use strict';

import type { Mongoose } from 'mongoose';
import type { Application } from 'express';

export = function (app: Application, mongoose: Mongoose) {
  // embeddable docs first
  require('./account/Note')(app, mongoose);
  require('./account/Status')(app, mongoose);
  require('./account/StatusLog')(app, mongoose);
  require('./account/AccountCategory')(app, mongoose);

  // then regular docs
  require('./account/User')(app, mongoose);
  require('./account/Admin')(app, mongoose);
  require('./account/AdminGroup')(app, mongoose);
  require('./account/Account')(app, mongoose);
  require('./account/LoginAttempt')(app, mongoose);

  // core
  require('./core/Topic')(app, mongoose);
  require('./core/TopicLink')(app, mongoose);
  require('./core/Argument')(app, mongoose);
  require('./core/ArgumentLink')(app, mongoose);
  require('./core/ObjectLink')(app, mongoose);
  require('./core/Category')(app, mongoose);
  require('./core/Question')(app, mongoose);
  require('./core/Answer')(app, mongoose);
  require('./core/Issue')(app, mongoose);
  require('./core/Opinion')(app, mongoose);
  require('./core/Page')(app, mongoose);
  require('./core/Artifact')(app, mongoose);
  require('./core/Group')(app, mongoose);
  require('./core/Reaction')(app, mongoose);
  require('./core/EntryEvent')(app, mongoose);
  require('./core/VerdictVote')(app, mongoose);
  require('./core/ReaderSignal')(app, mongoose);
  require('./core/Appeal')(app, mongoose);
  require('./core/Subscription')(app, mongoose);
  require('./core/Notification')(app, mongoose);

  require('./core/TrustedClient')(app, mongoose);
  //require('./schema/core/Word')(app, mongoose);
  //require('./schema/core/Meaning')(app, mongoose);
  //require('./schema/core/Definition')(app, mongoose);
};
