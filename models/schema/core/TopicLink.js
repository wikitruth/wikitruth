'use strict';

var constants = require('../../constants');

module.exports = function (app, mongoose) {
    var schema = new mongoose.Schema({
        title: {type: String, default: ''}, // Contextual Title
        parentId: {type: mongoose.Schema.ObjectId, default: null, ref: 'Topic'}, // Used when the parent is a topic
        topicId: {type: mongoose.Schema.ObjectId, ref: 'Topic'},
        createDate: {type: Date, default: Date.now},
        createUserId: {type: mongoose.Schema.ObjectId, ref: 'User'},
        editDate: {type: Date, default: Date.now},
        editUserId: {type: mongoose.Schema.ObjectId, ref: 'User'},
        tags: [{type: Number}], // OBJECT_TAGS
        screening: {
            status: {type: Number, default: constants.SCREENING_STATUS.status0.code}, // SCREENING_STATUS
            history: [{
                userId: {type: mongoose.Schema.ObjectId, ref: 'User'},
                date: {type: Date, default: Date.now},
                status: {type: Number} // SCREENING_STATUS
            }]
        },
        linkType: {type: Number, default: constants.LINK_TYPES.child},
        bidirectional: {type: Boolean, default: true},
        private: {type: Boolean, default: false}, // if true, should be restricted to group/user owners and not included in public backup
        groupId: {type: mongoose.Schema.ObjectId, ref: 'Group', default: null},
        categoryId: {type: mongoose.Schema.ObjectId, ref: 'Topic'}, // the root topic where this entry belong
        ownerId: {type: mongoose.Schema.ObjectId, default: null}, // Required when owner is not a Topic. Useful for filtering. Not populated when parent is Topic.
        ownerType: {type: Number, default: -1}, // OBJECT_TYPES
        childrenCount: {
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
        return constants.OBJECT_TYPES.topicLink;
    };
    schema.plugin(require('../plugins/pagedFind'));
    schema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('TopicLink', schema);
};
