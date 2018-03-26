'use strict';

var constants = require('../../constants');

module.exports = function (app, mongoose) {
    var schema = new mongoose.Schema({
        title: {type: String, default: ''},
        description: {type: String, default: ''},
        friendlyUrl: {type: String},
        createDate: {type: Date, default: Date.now},
        createUserId: {type: mongoose.Schema.ObjectId, ref: 'User'},
        editDate: {type: Date, default: Date.now},
        editUserId: {type: mongoose.Schema.ObjectId, ref: 'User'},
        members: [{
            userId: {type: mongoose.Schema.ObjectId, ref: 'User'},
            roleType: {type: Number, default: constants.GROUP_ROLE_TYPES.type10.code}
        }],
        privacyType: {type: Number, default: constants.GROUP_PRIVACY_TYPES.type10.code}
    });
    schema.plugin(require('../plugins/pagedFind'));
    schema.index({title: 1});
    schema.index({
        title: "text",
        description: "text"
    }, {
        weights: {
            title: 10,
            description: 8
        },
        name: "TextIndex"
    });
    schema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('Group', schema);
};
