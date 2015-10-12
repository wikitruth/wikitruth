'use strict';

exports = module.exports = function(app, mongoose) {
  var topicSchema = new mongoose.Schema({
    content: { type: String, default: '' },
    name: { type: String, default: '' }
  });
  topicSchema.plugin(require('../plugins/pagedFind'));
  //topicSchema.index({ content: 1 });
  topicSchema.index({ name: 1 });
  topicSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Topic', topicSchema);
};
