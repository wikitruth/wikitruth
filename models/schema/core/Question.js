'use strict';

var constants = require('../../constants');

module.exports = function (app, mongoose) {
    var schema = new mongoose.Schema({
        title: {type: String, default: ''},
        content: {type: String, default: ''},
        references: {type: String, default: ''},
        friendlyUrl: {type: String},
        contentPreview: {type: String},
        screening: {
            status: {type: Number, default: constants.SCREENING_STATUS.status0.code}, // SCREENING_STATUS
            history: [{
                userId: {type: mongoose.Schema.ObjectId, ref: 'User'},
                date: {type: Date, default: Date.now},
                status: {type: Number} // SCREENING_STATUS
            }]
        },
        groupId: {type: mongoose.Schema.ObjectId, ref: 'Group', default: null},
        categoryId: {type: mongoose.Schema.ObjectId, ref: 'Topic'}, // the root topic where this entry belong
        ownerId: {type: mongoose.Schema.ObjectId},
        ownerType: {type: Number}, // MODEL_TYPES
        createDate: {type: Date, default: Date.now},
        createUserId: {type: mongoose.Schema.ObjectId, ref: 'User'},
        editDate: {type: Date, default: Date.now},
        editUserId: {type: mongoose.Schema.ObjectId, ref: 'User'},
        private: {type: Boolean, default: false}, // if true, should be restricted to group/user owners and not included in public backup
        childrenCount: {
            answers: {
                total: {type: Number, default: 0},
                accepted: {type: Number, default: 0},
                pending: {type: Number, default: 0},
                rejected: {type: Number, default: 0}
            },
            issues: {
                total: {type: Number, default: 0},
                accepted: {type: Number, default: 0},
                pending: {type: Number, default: 0},
                rejected: {type: Number, default: 0},
                acceptedCritical: {type: Number, default: 0}
            },
            opinions: {
                total: {type: Number, default: 0},
                accepted: {type: Number, default: 0},
                pending: {type: Number, default: 0},
                rejected: {type: Number, default: 0}
            }
        },
        extras: {type: mongoose.Schema.Types.Mixed}
    });
    schema.methods.getType = function () {
        return constants.OBJECT_TYPES.question;
    };
    schema.plugin(require('../plugins/pagedFind'));
    schema.index({title: 1});
    schema.index({
        title: "text",
        content: "text",
        references: "text"
    }, {
        weights: {
            title: 10,
            content: 8,
            references: 6
        },
        name: "TextIndex"
    });
    schema.set('autoIndex', true);
    app.db.model('Question', schema);
};
