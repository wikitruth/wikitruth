'use strict';

var request = require('request');

exports.init = function(req, res){
  res.render('jade/contact/index.jade');
};

exports.sendMessage = function(req, res){
  var workflow = req.app.utility.workflow(req, res);

  workflow.on('validate', function() {
    if (!req.body.name) {
      workflow.outcome.errfor.name = 'required';
    }

    if (!req.body.email) {
      workflow.outcome.errfor.email = 'required';
    }

    if (!req.body.message) {
      workflow.outcome.errfor.message = 'required';
    }

    if(!req.body.recaptcha_response) {
      workflow.outcome.errfor.recaptcha = 'required';
    }

    if (workflow.hasErrors()) {
      return workflow.emit('response');
    } else {
      request.post(
          'https://www.google.com/recaptcha/api/siteverify',
          {
              json: {
                  'secret': req.app.config.grecaptcha.secret,
                  'response': req.body.recaptcha_response
              }
          },
          function (error, response, body) {
            if (!error && response.statusCode == 200 && body && body.success) {
              workflow.emit('sendEmail');
            } else {
              workflow.outcome.errfor.recaptcha = 'invalid captcha';
              return workflow.emit('response');
            }
          }
      );
    }
  });

  workflow.on('sendEmail', function() {
    req.app.utility.sendmail(req, res, {
      from: req.app.config.smtp.from.name +' <'+ req.app.config.smtp.from.address +'>',
      replyTo: req.body.email,
      to: req.app.config.systemEmail,
      subject: req.app.config.projectName +' contact form',
      textPath: 'jade/contact/email-text.jade',
      htmlPath: 'jade/contact/email-html.jade',
      locals: {
        name: req.body.name,
        email: req.body.email,
        message: req.body.message,
        projectName: req.app.config.projectName
      },
      success: function(message) {
        workflow.emit('response');
      },
      error: function(err) {
        workflow.outcome.errors.push('Error Sending: '+ err);
        workflow.emit('response');
      }
    });
  });

  workflow.emit('validate');
};
