'use strict';

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String }, // contextual title (optional)
    argumentId: { type: mongoose.Schema.ObjectId, ref: 'Argument' }, // the original Argument it links to
    parentId: { type: mongoose.Schema.ObjectId, default: null }, // always an Argument
    ownerId: { type: mongoose.Schema.ObjectId }, // usually a Topic but can be a different object
    ownerType: { type: Number }, // OBJECT_TYPES
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User'},
    threadId: { type: mongoose.Schema.ObjectId, ref: 'Argument' },
    private: { type: Boolean, default: false }, // if true, should be restricted to group/user owners and not included in public backup
    negative: { type: Boolean, default: false }, // a negative or positive statement
    against: { type: Boolean, default: false } // how it relates to parent Argument, default is in support
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('ArgumentLink', schema);
};
