'use strict';

module.exports = {
    appendTopicOwnerFlag: function (req, topic, model) {
        if(topic && req.user && topic.createUserId && req.user.id && topic.createUserId.equals(req.user.id)) {
            model.isTopicOwner = true;
        }
    },
    appendArgumentOwnerFlag: function (req, argument, model) {
        if(argument && req.user && argument.createUserId && req.user.id && argument.createUserId.equals(req.user.id)) {
            model.isArgumentOwner = true;
        }
    },
    appendOwnerFlag: function (req, item, model) {
        if(item && req.user && item.createUserId && req.user.id && item.createUserId.equals(req.user.id)) {
            model.isItemOwner = true;
        }
    }
};