'use strict';

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    content: { type: String, default: '' },
    title: { type: String, default: '' },
    references: { type: String, default: '' },
    parentId: { type: mongoose.Schema.ObjectId, default: null },
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    outline: [
      {
        listType: { type: Number }, // MODEL_TYPES
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
  schema.methods.link = function() {
    return false;
  };
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Topic', schema);
};
