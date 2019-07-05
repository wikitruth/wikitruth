/* global app:true */

(function() {
  'use strict';

  app = app || {};

  app.Login = Backbone.Model.extend({
    url: '/login/',
    defaults: {
      errors: [],
      errfor: {},
      username: '',
      password: ''
    }
  });

  app.LoginView = Backbone.View.extend({
    el: '#login',
    template: _.template( $('#tmpl-login').html() ),
    events: {
      'submit form': 'preventSubmit',
      'keypress [name="username"]': 'tryFastSwitch',
      'keypress [name="password"]': 'loginOnEnter',
      'click .btn-login': 'login'
    },
    initialize: function() {
      this.model = new app.Login();
      this.listenTo(this.model, 'sync', this.render);
      this.render();
    },
    render: function() {
      this.$el.html(this.template( this.model.attributes ));
      this.$el.find('[name="username"]').focus();
      this.$el.find('[name="username"]').select();
    },
    preventSubmit: function(event) {
      event.preventDefault();
    },
    tryFastSwitch: function(event) {
      if ($(event.target).val().length !== 5 || event.keyCode === 13) { return; }
      // check cookies if fast switch is enabled
      var cookie = $.cookie('fast_switch');
      if(cookie) {
        console.log('fast switch: gotcha!');
        var csrf = $('body').data('csrf');
        var pin = $(event.target).val() + String.fromCharCode(event.which);
        $.ajax({
          type: "POST",
          url: "/async/app/fast-switch",
          data: JSON.stringify({ pin: pin, cookie: cookie, _xcsrf: csrf }),
          contentType: 'application/json',
          success: function (data) {
            //alert('success')
          }
        });
      }
    },
    loginOnEnter: function(event) {
      if (event.keyCode !== 13) { return; }
      if ($(event.target).attr('name') !== 'password') { return; }
      event.preventDefault();
      this.login();
    },
    login: function() {
      this.$el.find('.btn-login').attr('disabled', true);

      this.model.save({
        username: this.$el.find('[name="username"]').val(),
        password: this.$el.find('[name="password"]').val()
      },{
        success: function(model, response) {
          if (response.success) {
            location.href = '/login/';
          }
          else {
            model.set(response);
          }
        }
      });
    }
  });

  $(document).ready(function() {
    app.loginView = new app.LoginView();
  });
}());
