'use strict';

module.exports = {
    appendTopicOwnerFlag: function (req, topic, model) {
        if(topic.createUserId && req.user && req.user.id && topic.createUserId.equals(req.user.id)) {
            model.isTopicOwner = true;
        }
    },
    appendArgumentOwnerFlag: function (req, argument, model) {
        if(argument.createUserId && req.user && req.user.id && argument.createUserId.equals(req.user.id)) {
            model.isArgumentOwner = true;
        }
    }
};