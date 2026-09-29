import Api, { ApiAccessError } from 'kms/services/Api.service';
import { UserData } from 'kms/common/Types';

QUnit.module('ApiAccessError Unit Tests');

QUnit.test('ApiAccessError carries the message and error code', function (assert) {
    const error = new ApiAccessError('Access denied', 'NO_TENANT_ACCESS');
    assert.strictEqual(error.message, 'Access denied', 'message is set');
    assert.strictEqual(error.errorCode, 'NO_TENANT_ACCESS', 'errorCode is set');
    assert.strictEqual(error.name, 'ApiAccessError', 'name identifies the error type');
    assert.ok(error instanceof Error, 'it is an Error subclass');
});

// The Api singleton has no HTTP mock adapter available, so only the synchronous
// state accessors are covered. The request methods (get/post/put/patch/delete)
// and error handling require network stubbing and are left out here.
QUnit.module('Api Service Unit Tests', {
    before: function () {
        // Establish the singleton once; init is idempotent.
        Api.init('https://api.example.test');
    }
});

QUnit.test('getInstance returns a stable singleton after init', function (assert) {
    assert.strictEqual(Api.getInstance(), Api.getInstance(), 'the same instance is returned each call');
});

QUnit.test('tenant name round-trips through the setter and getter', function (assert) {
    const api = Api.getInstance();
    api.setTenantName('Tenant One');
    assert.strictEqual(api.getTenantName(), 'Tenant One', 'the stored tenant name is returned');
});

QUnit.test('tenant id round-trips through the setter and getter', function (assert) {
    const api = Api.getInstance();
    api.setTenantId('tenant-42');
    assert.strictEqual(api.getTenantId(), 'tenant-42', 'the stored tenant id is returned');
});

QUnit.test('user info round-trips through the setter and getter', function (assert) {
    const api = Api.getInstance();
    const user: UserData = { identifier: 'u1', email: 'u1@example.test', givenName: 'Ada', familyName: 'Lovelace', role: 'KEY_ADMINISTRATOR' };
    api.setUserInfo(user);
    assert.deepEqual(api.getUserInfo(), user, 'the stored user info is returned');
});

QUnit.test('getTenantsList is undefined before any tenants are fetched', function (assert) {
    // A freshly-initialised instance has no cached tenants response.
    assert.strictEqual(Api.getInstance().getTenantsList(), undefined, 'no tenants list until one is fetched');
});
