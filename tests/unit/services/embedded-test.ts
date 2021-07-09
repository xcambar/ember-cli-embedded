import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | embedded', function (hooks) {
  setupTest(hooks);

  test('it fetches data from the config as a proxy', function (assert) {
    // We can access the raw config with `config:embedded`
    const config = this.owner.resolveRegistration('config:embedded');
    config.myKey = 'myValue';

    const service = this.owner.lookup('service:embedded');
    assert.equal(service.get('myKey'), 'myValue');
    assert.equal(service.get('doesNotExist'), undefined);
  });
});
