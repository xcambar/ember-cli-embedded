import Application from '@ember/application';

import { initialize } from 'dummy/initializers/embedded';
import { module, test } from 'qunit';
import Resolver from 'ember-resolver';
import { run } from '@ember/runloop';

import type { TestContext } from 'ember-test-helpers';

interface Context extends TestContext {
  TestApplication: typeof Application;

  // different key to not conflict with `application` from `TestContext`
  app: TestContext['application'] & {
    // Public types are currently incomplete, these 2 properties exist:
    // https://github.com/emberjs/ember.js/blob/79f130f779a58969b98d079acf7d0e83c81dae63/packages/%40ember/application/lib/application.js#L376-L377
    _booted: boolean;
    _readinessDeferrals: number;

    // The method added by our Initializer `embedded`
    start?: (config?: Record<string, unknown>) => void;
  };
}

module('Unit | Initializer | embedded', function (hooks) {
  hooks.beforeEach(function (this: Context) {
    this.TestApplication = class TestApplication extends Application {
      modulePrefix = 'something_random';
    };

    this.TestApplication.initializer({
      name: 'initializer under test',
      initialize,
    });

    // `as any` to bypass temporarily the types check as public types are incomplete.
    // Otherwise it complains about the missing properties `_booted` etc
    this.app = this.TestApplication.create({
      autoboot: false,
      Resolver,
    }) as any;

    this.app.register('config:environment', {});
  });

  hooks.afterEach(function (this: Context) {
    run(this.app, 'destroy');
  });

  test('by default, it does not change the normal behaviour', async function (this: Context, assert) {
    assert.expect(3);

    await this.app.boot();

    assert.strictEqual(
      this.app.start,
      undefined,
      'No `start()` method has been added'
    );

    assert.deepEqual(
      this.app.resolveRegistration('config:embedded'),
      {},
      'An empty embedded config is registered'
    );

    assert.ok(
      this.app._booted === true && this.app._readinessDeferrals === 0,
      'No deferral has been added'
    );
  });

  test('without `delegateStart`, it does not change the normal behaviour', async function (this: Context, assert) {
    assert.expect(3);

    this.app.register('config:environment', {
      embedded: {
        delegateStart: false,
      },
    });

    await this.app.boot();

    assert.strictEqual(
      this.app.start,
      undefined,
      'No `start()` method has been added'
    );

    assert.deepEqual(
      this.app.resolveRegistration('config:embedded'),
      {},
      'An empty embedded config is registered'
    );

    assert.ok(
      this.app._booted === true && this.app._readinessDeferrals === 0,
      'No deferral has been added'
    );
  });

  test('without `delegateStart`, the specified config is registered', async function (this: Context, assert) {
    assert.expect(1);

    const myCustomConfig = {
      donald: 'duck',
    };

    this.app.register('config:environment', {
      embedded: {
        delegateStart: false,
        config: myCustomConfig,
      },
    });

    await this.app.boot();

    assert.deepEqual(
      this.app.resolveRegistration('config:embedded'),
      myCustomConfig,
      'The embedded config matches the custom config'
    );
  });

  test('with `delegateStart`, it defers the boot of the app', function (this: Context, assert) {
    assert.expect(3);

    this.app.register('config:environment', {
      embedded: {
        delegateStart: true,
      },
    });

    const { _readinessDeferrals: initialDeferrals } = this.app;

    /**
     * Cannot use `app.boot()` here as this would imply triggering the readiness deferral
     * and the resulting promise (of the boot) would never resolve.
     */
    initialize(this.app);

    assert.strictEqual(
      typeof this.app.start,
      'function',
      'A `start()` method has been added'
    );

    assert.deepEqual(
      this.app.resolveRegistration('config:embedded'),
      undefined,
      'The embedded config is not registered until the app is started'
    );

    const { _booted, _readinessDeferrals } = this.app;

    assert.ok(
      _booted === false && _readinessDeferrals === initialDeferrals + 1,
      'A deferral has been added'
    );
  });

  test('with `delegateStart`, the passed config is not registered until the app is started', function (this: Context, assert) {
    assert.expect(1);

    const myCustomConfig = {
      donald: 'duck',
    };

    this.app.register('config:environment', {
      embedded: {
        delegateStart: true,
        config: myCustomConfig,
      },
    });

    /**
     * Cannot use `app.boot()` here as this would imply triggering the readiness deferral
     * and the resulting promise (of the boot) would never resolve.
     */
    initialize(this.app);

    assert.deepEqual(
      this.app.resolveRegistration('config:embedded'),
      undefined,
      'The embedded config is not registered until the app is started'
    );
  });

  test('at manual boot, the passed config is merged into the embedded config', function (this: Context, assert) {
    assert.expect(1);

    const myCustomConfig = {
      yo: 'my config',
      hey: 'sup?',
    };

    this.app.register('config:environment', {
      embedded: {
        delegateStart: true,
        config: myCustomConfig,
      },
    });

    /**
     * Cannot use `app.boot()` here as this would imply triggering the readiness deferral
     * and the resulting promise (of the boot) would never resolve.
     */
    initialize(this.app);

    // Previous tests confirm that, at this point, `.start()` is defined
    this.app.start!({
      yay: 'one more',
      yo: 'new config',
    });

    assert.deepEqual(
      this.app.resolveRegistration('config:embedded'),
      {
        yo: 'new config',
        hey: 'sup?',
        yay: 'one more',
      },
      'The passed start config is melded into the embedded config'
    );
  });

  test('at manual boot, one deferral is removed', function (this: Context, assert) {
    assert.expect(1);

    this.app.register('config:environment', {
      embedded: {
        delegateStart: true,
      },
    });

    /**
     * Cannot use `app.boot()` here as this would imply triggering the readiness deferral
     * and the resulting promise (of the boot) would never resolve.
     */
    initialize(this.app);

    const { _readinessDeferrals: initialDeferrals } = this.app;

    // Previous tests confirm that, at this point, `.start()` is defined
    this.app.start!();

    assert.strictEqual(
      this.app._readinessDeferrals,
      initialDeferrals - 1,
      'A deferral has been removed'
    );
  });
});
