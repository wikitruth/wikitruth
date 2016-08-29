'use strict';

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    references: { type: String, default: '' },
    parentId: { type: mongoose.Schema.ObjectId, default: null }, // Used when the parent is also a topic
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    ownerId: { type: mongoose.Schema.ObjectId, default: null }, // Required when owner is not a Topic. Useful for filtering
    ownerType: { type: Number, default: -1 }, // OBJECT_TYPES
    groupId: { type: Number, default: -1 },
    outline: [
      {
        listType: { type: Number }, // OBJECT_TYPES
        id: { type: mongoose.Schema.ObjectId },
        title: { type: String }, // Friendly title/caption
        isDefault: { type: Boolean }, // default=uncategorized
        isValued: { type: Boolean },
        items: [{
          id: { type: mongoose.Schema.ObjectId },
          isPro: { type: Boolean }
        }]
      }
    ]
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Topic', schema);
};
