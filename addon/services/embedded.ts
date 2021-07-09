import ObjectProxy from '@ember/object/proxy';
import { getOwner } from '@ember/application';

// eslint-disable-next-line ember/no-classic-classes
const configService = ObjectProxy.extend({
  init() {
    this.content = getOwner(this).factoryFor('config:embedded').class;
    this._super(...arguments);
  },
});

configService.reopenClass({
  isServiceFactory: true,
});

export default configService;
