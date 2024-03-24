'use strict';
const Homey = require('homey');
const { Client } = require('@notionhq/client');

class Device extends Homey.Device {
  async onInit() {
    this.log('onInit');
    // Client is always stored by the pair/repair sessions. We onInit manually after repair.
    const client = this.getStoreValue('client');

    this.notionClient = new Client({
      auth: client.access_token,
    });

    const response = await this.notionClient.search({
      filter: {
        property: 'object',
        value: 'database',
      },
    });
    this.databases = response.results;

    if (this.hasCapability('button.refresh') === false) {
      await this.addCapability('button.refresh');
    }

    await this.refreshDatabaseCapabilities();

    this.registerCapabilityListener('button.refresh', async () => {
      const response = await this.notionClient.search({
        filter: {
          property: 'object',
          value: 'database',
        },
      });
      this.databases = response.results;
      await this.refreshDatabaseCapabilities();
    });
  }

  async refreshDatabaseCapabilities() {
    const databasesById = {};

    for (const database of this.databases) {
      databasesById[database.id] = database;
    }

    const capabilitiesToRemove = [];
    const capabilitiesToAdd = [];

    for (const capabilityId of this.getCapabilities()) {
      if (capabilityId.startsWith('database.')) {
        const databaseId = capabilityId.slice('database.'.length);
        const database = databasesById[databaseId];
        if (database == null) {
          capabilitiesToRemove.push(capabilityId);
        }
      }
    }

    for (const database of this.databases) {
      if (this.hasCapability(`database.${database.id}`) === false) {
        capabilitiesToAdd.push(`database.${database.id}`);
      }
    }

    capabilitiesToRemove.map(async (capabilityId) => {
      await this.removeCapability(capabilityId);
    });

    await Promise.allSettled(
      capabilitiesToRemove.map(async (capabilityId) => {
        await this.removeCapability(capabilityId);
      }),
    );

    await Promise.allSettled(
      capabilitiesToAdd.map(async (capabilityId) => {
        await this.addCapability(capabilityId);
      }),
    );

    await Promise.allSettled(
      this.getCapabilities().map(async (capabilityId) => {
        const database = databasesById[capabilityId.slice('database.'.length)];
        await this.setCapabilityValue(
          capabilityId,
          database.title[0].plain_text,
        );
      }),
    );
  }

  getProperty({ property, value }) {
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

    const properties = {};

    for (const [propertyName, property] of Object.entries(
      database.properties,
    )) {
      // If the user provided JSON contains the database property name.
      if (parsed[propertyName] != null) {
        properties[propertyName] = {
          id: property.id,
          type: property.type,
          [property.type]: this.getProperty({
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

  async query({ databaseId, filter, sorts, pageSize }) {
    if (this.databases == null) {
      throw new Error('Databases Not Loaded');
    }

    const database = this.databases.find((database) => {
      return database.id === databaseId;
    });

    if (database == null) {
      throw new Error('Database Not Found');
    }

    let parsedFilter = null;
    let parsedSorts = null;

    if (filter != null && filter !== '') {
      parsedFilter = JSON.parse(filter);
    }

    if (sorts != null && sorts !== '') {
      parsedSorts = JSON.parse(sorts);
    }

    const response = await this.notionClient.databases.query({
      database_id: databaseId,
      page_size: pageSize ?? 10,
      filter: parsedFilter,
      sorts: parsedSorts,
      // filter_properties: ['propertyID1', 'propertyID2'],
    });

    const results = [];

    for (const result of response.results) {
      const properties = {};
      properties.id = result.id;

      for (const [propertyName, property] of Object.entries(
        result.properties,
      )) {
        properties[propertyName] = property;
      }

      results.push(properties);
    }

    return {
      results,
    };
  }

  async retrieve({ databaseId }) {
    if (this.databases == null) {
      throw new Error('Databases Not Loaded');
    }

    const database = this.databases.find((database) => {
      return database.id === databaseId;
    });

    if (database == null) {
      throw new Error('Database Not Found');
    }

    const response = await this.notionClient.databases.retrieve({
      database_id: databaseId,
    });

    return response;
  }

  async onAdded() {
    this.log('onAdded');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('onSettings');
  }

  async onRenamed(name) {
    this.log('onRenamed', name);
  }

  async onDeleted() {
    this.log('onDeleted');
  }
}

module.exports = Device;
