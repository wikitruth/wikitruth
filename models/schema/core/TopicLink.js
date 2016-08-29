'use strict';

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' }, // Contextual Title
    parentId: { type: mongoose.Schema.ObjectId, default: null, ref: 'Topic' }, // Used when the parent is also a topic
    topicId: { type: mongoose.Schema.ObjectId, ref: 'Topic' },
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    ownerId: { type: mongoose.Schema.ObjectId, default: null }, // Required when owner is not a Topic. Useful for filtering
    ownerType: { type: Number, default: -1 } // OBJECT_TYPES
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('TopicLink', schema);
};
