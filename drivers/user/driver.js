'use strict';
const Homey = require('homey');

const { PairSession } = require('./PairSession');

// TODO
// {
//   "id": "query",
//   "title": {
//     "en": "Query a database"
//   },
//   "titleFormatted": {
//     "en": "Query [[database]]"
//   },
//   "hint": {
//     "en": ""
//   },
//   "args": [
//     {
//       "type": "autocomplete",
//       "name": "database",
//       "title": { "en": "Database" },
//       "placeholder": { "en": "My Database" }
//     }
//   ]
// }

class Driver extends Homey.Driver {
  async onInit() {
    const jsonCard = this.homey.flow.getActionCard('json');
    const queryCard = this.homey.flow.getActionCard('query');

    jsonCard.registerRunListener(async (args, state) => {
      await args.device.insertJSON({
        databaseId: args.database.id,
        json: args.json,
      });
    });

    queryCard.registerRunListener(async (args, state) => {
      await args.device.query({
        databaseId: args.database.id,
      });
    });

    jsonCard.registerArgumentAutocompleteListener(
      'database',
      this.getDatabases.bind(this),
    );

    queryCard.registerArgumentAutocompleteListener(
      'database',
      this.getDatabases.bind(this),
    );
  }

  getDatabases(query, args) {
    const results = args.device.databases.map((database) => {
      return {
        // Homey properties.
        name: database.title[0].plain_text,
        description: '',
        icon: database.icon,

        // Own properties.
        id: database.id,
      };
    });

    return results.filter((result) => {
      return result.name.toLowerCase().includes(query.toLowerCase());
    });
  }

  onPair(socket) {
    const session = new PairSession({ homey: this.homey, socket });
    session.on('__log', this.log);
    session.on('__error', this.error);
    session.on('__debug', this.__debug);
  }

  onRepair(socket, device) {
    const session = new PairSession({
      homey: this.homey,
      socket,
      device,
    });
    session.on('__log', this.log);
    session.on('__error', this.error);
    session.on('__debug', this.__debug);
  }
}

module.exports = Driver;
