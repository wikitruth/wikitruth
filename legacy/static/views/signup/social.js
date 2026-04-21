/* global app:true */

(function() {
  'use strict';

  app = app || {};

  function getLegacyBasePath() {
    var pathname = (window.location && window.location.pathname) || '';
    if (pathname === '/legacy' || pathname.indexOf('/legacy/') === 0) {
      return '/legacy';
    }
    return '';
  }

  function withBase(pathname) {
    return getLegacyBasePath() + pathname;
  }

  function resolveRedirect(target) {
    if (target && /^https?:\/\//i.test(target)) {
      return target;
    }
    if (target && target.charAt(0) === '/') {
      if (target === '/legacy' || target.indexOf('/legacy/') === 0) {
        return target;
      }
      return withBase(target);
    }
    return withBase('/account/');
  }

  app.Signup = Backbone.Model.extend({
    url: withBase('/signup/social/'),
    defaults: {
      errors: [],
      errfor: {},
      username: '',
      email: ''
    }
  });

  app.SignupView = Backbone.View.extend({
    el: '#signup',
    template: _.template( $('#tmpl-signup').html() ),
    events: {
      'submit form': 'preventSubmit',
      'keypress [name="password"]': 'signupOnEnter',
      'click .btn-signup': 'signup'
    },
    initialize: function() {
      this.model = new app.Signup();
      this.model.set('email', $('#data-email').text());
      this.model.set('username', $('#data-username').text());
      this.listenTo(this.model, 'sync', this.render);
      this.render();
    },
    render: function() {
      this.$el.html(this.template( this.model.attributes ));
      if($('#email').hasClass('has-error')) {
        this.$el.find('[name="email"]').focus();
      } else {
        this.$el.find('[name="username"]').focus();
      }
    },
    preventSubmit: function(event) {
      event.preventDefault();
    },
    signupOnEnter: function(event) {
      if (event.keyCode !== 13) { return; }
      event.preventDefault();
      this.signup();
    },
    signup: function() {
      this.$el.find('.btn-signup').attr('disabled', true);

      this.model.save({
        username: this.$el.find('[name="username"]').val(),
        email: this.$el.find('[name="email"]').val()
      },{
        success: function(model, response) {
          if (response.success) {
            location.href = resolveRedirect(response.defaultReturnUrl);
          }
          else {
            model.set(response);
          }
        }
      });
    }
  });

  $(document).ready(function() {
    app.signupView = new app.SignupView();
  });
}());
