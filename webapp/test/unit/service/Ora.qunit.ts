import Ora from 'kms/services/Ora.service';

QUnit.module('Ora Service Unit Tests');

QUnit.test('init followed by getInstance exposes the provided config', function (assert) {
    const config = { feature: 'enabled' };
    Ora.init(config);

    const instance = Ora.getInstance();
    assert.strictEqual(instance.oraConfig, config, 'the instance carries the config passed to init');
});

QUnit.test('getInstance returns a stable singleton', function (assert) {
    Ora.init({ any: 'value' });
    assert.strictEqual(Ora.getInstance(), Ora.getInstance(), 'the same instance is returned each call');
});

QUnit.test('init is idempotent and keeps the first config', function (assert) {
    Ora.init({ first: true });
    const firstInstance = Ora.getInstance();
    // A second init must not replace the already-created singleton.
    Ora.init({ second: true });
    assert.strictEqual(Ora.getInstance(), firstInstance, 'the original instance is retained across repeated init calls');
});
