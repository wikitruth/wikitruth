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
  require('./account/PasskeyCredential')(app, mongoose);
  require('./account/AuthCeremony')(app, mongoose);
  require('./account/RecoveryCodeSet')(app, mongoose);
  require('./account/AuthHandoff')(app, mongoose);
  require('./account/EmailAuthChallenge')(app, mongoose);
  require('./account/WebSession')(app, mongoose);

  // core
  require('./core/EntryRevisionCounter')(app, mongoose);
  require('./core/EntryRevision')(app, mongoose);
  require('./core/EntryTranslation')(app, mongoose);
  require('./core/ChangeRequest')(app, mongoose);
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
  require('./core/EntryRedirect')(app, mongoose);
  require('./core/VerdictVote')(app, mongoose);
  require('./core/VerdictAdvice')(app, mongoose);
  require('./core/RealtimeEvent')(app, mongoose);
  require('./core/ReaderSignal')(app, mongoose);
  require('./core/Appeal')(app, mongoose);
  require('./core/Subscription')(app, mongoose);
  require('./core/Notification')(app, mongoose);
  require('./core/NotificationOutbox')(app, mongoose);
  require('./core/EmailOutbox')(app, mongoose);
  require('./core/KnowledgeReviewTask')(app, mongoose);
  require('./core/AnonymousContribution')(app, mongoose);
  require('./core/ReputationSnapshot')(app, mongoose);
  require('./core/StructuredDebatePilot')(app, mongoose);
  require('./core/StructuredDebateParticipant')(app, mongoose);
  require('./core/StructuredDebateContribution')(app, mongoose);
  require('./core/ApiClient')(app, mongoose);
  require('./core/IdempotencyRecord')(app, mongoose);
  require('./core/AgentJob')(app, mongoose);
  require('./core/CivicTenant')(app, mongoose);
  require('./core/Jurisdiction')(app, mongoose);
  require('./core/TenantMembership')(app, mongoose);
  require('./core/CivicRecord')(app, mongoose);
  require('./core/CivicEntryLink')(app, mongoose);
  require('./core/CivicResponseRequest')(app, mongoose);
  require('./core/OperationalEvent')(app, mongoose);
  require('./core/HealthSnapshot')(app, mongoose);
  require('./core/OperationalAlertRule')(app, mongoose);
  require('./core/OperationalAlert')(app, mongoose);
  require('./core/PrivacyRequest')(app, mongoose);

  require('./core/TrustedClient')(app, mongoose);
  //require('./schema/core/Word')(app, mongoose);
  //require('./schema/core/Meaning')(app, mongoose);
  //require('./schema/core/Definition')(app, mongoose);
};
