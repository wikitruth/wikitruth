'use strict';

// @ts-ignore TS(2304): Cannot find name 'exports'.
exports = module.exports = function(app, mongoose) {
  const categorySchema = new mongoose.Schema({
    _id: { type: String },
    pivot: { type: String, default: '' },
    name: { type: String, default: '' },
  });
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  categorySchema.plugin(require('../plugins/pagedFind'));
  categorySchema.index({ pivot: 1 });
  categorySchema.index({ name: 1 });
  categorySchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('AccountCategory', categorySchema);
};
