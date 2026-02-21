'use strict';

const asyncLib = require('async') as {
  parallel: (
    tasks: Array<(callback: (err: unknown, result: string | null) => void) => void>,
    callback: (err: unknown, results: unknown) => void
  ) => void;
};

interface MailOptions {
  from: string;
  to: string;
  replyTo?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  text?: string;
  textPath?: string;
  html?: string;
  htmlPath?: string;
  locals?: Record<string, unknown>;
  attachments?: Array<Record<string, unknown>>;
  success: (message: unknown) => void;
  error: (message: string) => void;
}

module.exports = function sendmail(
  req: import('express').Request & { app: { config: { smtp: { credentials: unknown } } } },
  res: import('express').Response,
  options: MailOptions
): void {
  const renderText = function (callback: (err: unknown, result: string | null) => void) {
    if (!options.textPath) {
      callback(null, null);
      return;
    }

    res.render(options.textPath, options.locals, function (err, text) {
      if (err) {
        callback(err, null);
        return;
      }

      options.text = text;
      callback(null, 'done');
    });
  };

  const renderHtml = function (callback: (err: unknown, result: string | null) => void) {
    if (!options.htmlPath) {
      callback(null, null);
      return;
    }

    res.render(options.htmlPath, options.locals, function (err, html) {
      if (err) {
        callback(err, null);
        return;
      }

      options.html = html;
      callback(null, 'done');
    });
  };

  const renderers: Array<(callback: (err: unknown, result: string | null) => void) => void> = [];
  if (options.textPath) {
    renderers.push(renderText);
  }
  if (options.htmlPath) {
    renderers.push(renderHtml);
  }

  asyncLib.parallel(renderers, function (err) {
    if (err) {
      options.error('Email template render failed. ' + String(err));
      return;
    }

    const attachments: Array<Record<string, unknown>> = [];
    if (options.html) {
      attachments.push({ data: options.html, alternative: true });
    }

    if (options.attachments) {
      options.attachments.forEach(function (attachment) {
        attachments.push(attachment);
      });
    }

    const emailjs = require('emailjs/email') as {
      server: {
        connect: (credentials: unknown) => {
          send: (payload: Record<string, unknown>, callback: (sendError: unknown, message: unknown) => void) => void;
        };
      };
    };

    const emailer = emailjs.server.connect(req.app.config.smtp.credentials);
    emailer.send(
      {
        from: options.from,
        to: options.to,
        'reply-to': options.replyTo || options.from,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        attachment: attachments,
      },
      function (sendError, message) {
        if (sendError) {
          options.error('Email failed to send. ' + String(sendError));
          return;
        }

        options.success(message);
      }
    );
  });
};
