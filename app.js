'use strict';

const Homey = require('homey');

class App extends Homey.App {
  CLIENT_ID = Homey.env.CLIENT_ID;
  CLIENT_SECRET = Homey.env.CLIENT_SECRET;
  REDIRECT_URI = 'https://callback.athom.com/oauth2/callback';
  AUTHORIZATION_URL = 'https://api.notion.com/v1/oauth/authorize';

  async onInit() {
    this.log('onInit');
  }
}

module.exports = App;
