'use strict';

module.exports = function (app, mongoose) {
    var schema = new mongoose.Schema({
        title: {type: String, default: ''},
        content: {type: String, default: ''},
        friendlyUrl: {type: String},
        parentId: {type: mongoose.Schema.ObjectId},
        createDate: {type: Date, default: Date.now},
        createUserId: {type: mongoose.Schema.ObjectId, ref: 'User'},
        editDate: {type: Date, default: Date.now},
        editUserId: {type: mongoose.Schema.ObjectId, ref: 'User'}
    });
    schema.plugin(require('../plugins/pagedFind'));
    schema.index({id: 1});
    schema.index({title: 1});
    schema.index({
        title: "text",
        content: "text"
    }, {
        weights: {
            title: 10,
            content: 8
        },
        name: "TextIndex"
    });
    schema.set('autoIndex', true);
    app.db.model('Page', schema);
};
