'use strict';

// @ts-ignore TS(2304): Cannot find name 'exports'.
exports = module.exports = function(app, mongoose) {
  const adminGroupSchema = new mongoose.Schema({
    _id: {type: String},
    name: {type: String, default: ''},
    permissions: [{name: String, permit: Boolean}]
  });
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  adminGroupSchema.plugin(require('../plugins/pagedFind'));
  adminGroupSchema.index({ name: 1 }, { unique: true });
  adminGroupSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('AdminGroup', adminGroupSchema);
};
