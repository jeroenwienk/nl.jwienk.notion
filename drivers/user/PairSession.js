'use strict';

const fetch = require('node-fetch');

const Homey = require('homey');

class PairSession extends Homey.SimpleClass {
  constructor({ homey, socket, device }) {
    super();

    this.homey = homey;
    this.socket = socket;
    this.device = device;
    this.result = null;

    this.socket.setHandler('showView', this.onShowView.bind(this));
    this.socket.setHandler('list_devices', this.onListDevices.bind(this));
    this.socket.setHandler('add_device', this.onAddDevice.bind(this));
    this.socket.setHandler('disconnect', this.onDisconnect.bind(this));
  }

  async onShowView(viewId) {
    this.log('PairSession.onShowView', viewId);

    if (viewId === 'login_oauth2') {
      this.onShowViewLoginOAuth2();
    }
  }

  async onShowViewLoginOAuth2() {
    try {
      const params = new URLSearchParams();
      params.append('client_id', this.homey.app.CLIENT_ID);
      params.append('response_type', 'code');
      params.append('owner', 'user');
      params.append('redirect_uri', this.homey.app.REDIRECT_URI);

      const url = `${this.homey.app.AUTHORIZATION_URL}/?${params.toString()}`;
      const oAuth2Callback = await this.homey.cloud.createOAuth2Callback(url);

      oAuth2Callback.on('url', this.onUrl.bind(this));
      oAuth2Callback.on('code', this.onCode.bind(this));
    } catch (error) {
      this.socket.emit('error', error).catch(this.error);
    }
  }

  onUrl(url) {
    this.log('PairSession.onUrl');
    this.socket.emit('url', url).catch(this.error);
  }

  onCode(code) {
    this.log('PairSession.onCode');
    // todo this can have state aswell from notion
    (async () => {
      try {
        const url = 'https://api.notion.com/v1/oauth/token';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${this.homey.app.CLIENT_ID}:${this.homey.app.CLIENT_SECRET}`
            ).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.homey.app.REDIRECT_URI,
          }),
        });
        const json = await response.json();
        this.result = json;

        // Repair
        if (this.device != null) {
          await this.device.setStoreValue('client', this.result);
          await this.device.onInit();
        }

        // Hides loading and sets the next view.
        this.socket.emit('authorized').catch(this.error);
      } catch (error) {
        this.error(error);
        this.socket.emit('error', error).catch(this.error);
      }
    })().catch(this.error);
  }

  async onListDevices() {
    this.log('PairSession.onListDevices');

    return [
      {
        name: this.result.workspace_name,
        data: {
          workspaceId: this.result.workspace_id,
          clientId: this.result.owner.user.id,
        },
        store: {
          client: this.result,
        },
      },
    ];
  }

  async onAddDevice(device) {
    this.log('PairSession.onAddDevice');
    this.log({ device });
  }

  async onDisconnect() {
    this.log('PairSession.onDisconnect');
  }
}

module.exports = { PairSession };
