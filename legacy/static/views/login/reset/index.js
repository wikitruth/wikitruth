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

  app.Reset = Backbone.Model.extend({
    defaults: {
      success: false,
      errors: [],
      errfor: {},
      id: undefined,
      email: undefined,
      password: '',
      confirm: ''
    },
    url: function() {
      return withBase('/login/reset/'+ this.get('email') +'/'+ this.id +'/');
    }
  });

  app.ResetView = Backbone.View.extend({
    el: '#reset',
    template: _.template( $('#tmpl-reset').html() ),
    events: {
      'submit form': 'preventSubmit',
      'keypress [name="confirm"]': 'resetOnEnter',
      'click .btn-reset': 'reset'
    },
    initialize: function() {
      this.listenTo(this.model, 'sync', this.render);
      this.render();
    },
    render: function() {
      this.$el.html(this.template( this.model.attributes ));
      this.$el.find('[name="password"]').focus();
      return this;
    },
    preventSubmit: function(event) {
      event.preventDefault();
    },
    resetOnEnter: function(event) {
      if (event.keyCode !== 13) { return; }
      event.preventDefault();
      this.reset();
    },
    reset: function() {
      this.$el.find('.btn-reset').attr('disabled', true);

      this.model.save({
        password: this.$el.find('[name="password"]').val(),
        confirm: this.$el.find('[name="confirm"]').val()
      });
    }
  });

  app.Router = Backbone.Router.extend({
    routes: {
      'login/reset': 'start',
      'login/reset/': 'start',
      'login/reset/:email/:token': 'start',
      'login/reset/:email/:token/': 'start'
    },
    start: function(email, token) {
      app.resetView = new app.ResetView({ model: new app.Reset({ id: token, email: email }) });
    }
  });

  $(document).ready(function() {
    app.router = new app.Router();
    Backbone.history.start({ pushState: true, root: withBase('/') });
  });
}());
