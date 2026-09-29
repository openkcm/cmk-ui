import BuiltInSupportService, { BISInitConfig } from 'kms/services/BuiltInSupport.service';

QUnit.module('BuiltInSupportService Unit Tests');

QUnit.test('getInstance returns a stable singleton', function (assert) {
    assert.strictEqual(BuiltInSupportService.getInstance(), BuiltInSupportService.getInstance(), 'the same instance is returned each call');
});

QUnit.test('isReady is always false in this no-op build', function (assert) {
    assert.strictEqual(BuiltInSupportService.getInstance().isReady(), false, 'the no-op build is never ready');
});

QUnit.test('initialize resolves without error', async function (assert) {
    const config: BISInitConfig = { tenantId: 't1', tenantName: 'Tenant One', targetEnvironment: 'test' };
    await BuiltInSupportService.getInstance().initialize(config);
    assert.ok(true, 'initialize resolves');
});

QUnit.test('the inert methods can be invoked without throwing', function (assert) {
    const service = BuiltInSupportService.getInstance();
    service.openSupport();
    service.updateApplicationContext('systems');
    service.updateSystemContext('t1', 'Tenant One');
    service.updateTheme('sap_horizon_dark');
    service.teardown();
    assert.ok(true, 'no-op methods do not throw');
});
