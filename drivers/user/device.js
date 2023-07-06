'use strict';
const Homey = require('homey');
const { Client } = require('@notionhq/client');

class Device extends Homey.Device {
  async onInit() {
    this.log('Device.onInit');

    // Client is always stored by the pair/repair sessions. We onInit manually after repair.
    const client = this.getStoreValue('client');

    this.notionClient = new Client({
      auth: client.access_token,
    });

    // TODO
    // Update databases at some point.
    // If this fails should we retry. What should we show to the user.
    const response = await this.notionClient.search({
      filter: {
        property: 'object',
        value: 'database',
      },
    });
    this.databases = response.results;
  }

  async insertJSON({ databaseId, json }) {
    const parsed = JSON.parse(json);

    if (this.databases == null) {
      throw new Error('Databases Not Loaded');
    }

    const database = this.databases.find((database) => {
      return database.id === databaseId;
    });

    if (database == null) {
      throw new Error('Database Not Found');
    }

    const getProperty = ({ property, value }) => {
      switch (property.type) {
        case 'title':
          return [
            {
              type: 'text',
              text: {
                content: value || '',
              },
            },
          ];
        case 'rich_text':
          return [
            {
              type: 'text',
              text: {
                content: value || '',
              },
            },
          ];
        case 'number':
          return value;
        case 'status':
          return {
            name: value,
          };
        case 'checkbox':
          return value;
        default:
          return null;
      }
    };

    const properties = {};

    for (const [propertyName, property] of Object.entries(
      database.properties
    )) {
      // If the user provided JSON contains the database property name.
      if (parsed[propertyName] != null) {
        properties[propertyName] = {
          id: property.id,
          type: property.type,
          [property.type]: getProperty({
            property,
            value: parsed[propertyName],
          }),
        };
      }
    }

    const response = await this.notionClient.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties,
      // properties: {
      //   Name: {
      //     type: 'title',
      //     title: [
      //       {
      //         type: 'text',
      //         text: {
      //           content: text,
      //         },
      //       },
      //     ],
      //   },
      // },
    });

    return response;
  }

  async onAdded() {
    this.log('Device.onAdded');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Device.onSettings');
  }

  async onRenamed(name) {
    this.log('Device.onRenamed', name);
  }

  async onDeleted() {
    this.log('Device.onDeleted');
  }
}

module.exports = Device;
