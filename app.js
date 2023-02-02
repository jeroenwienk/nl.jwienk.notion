'use strict';

const Homey = require('homey');

// if (process.env.DEBUG === '1') {
//   require('inspector').open(9229, '0.0.0.0', true);
// }

class App extends Homey.App {
  CLIENT_ID = Homey.env.CLIENT_ID;
  CLIENT_SECRET = Homey.env.CLIENT_SECRET;
  REDIRECT_URI = 'https://callback.athom.com/oauth2/callback';
  AUTHORIZATION_URL = 'https://api.notion.com/v1/oauth/authorize';

  async onInit() {
    this.log('App.onInit');
  }
}

module.exports = App;
