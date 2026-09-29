import ForbiddenStateService from 'kms/utils/ForbiddenState';
import Constants from 'kms/common/Constants';

QUnit.module('ForbiddenStateService Unit Tests', {
    beforeEach: function () {
        // The service is a process-wide singleton; reset it so tests do not leak state.
        ForbiddenStateService.getInstance().clearForbiddenState();
    },
    afterEach: function () {
        ForbiddenStateService.getInstance().clearForbiddenState();
    }
});

QUnit.test('getInstance returns a stable singleton', function (assert) {
    assert.strictEqual(ForbiddenStateService.getInstance(), ForbiddenStateService.getInstance(), 'the same instance is returned each call');
});

QUnit.test('a freshly cleared service is not forbidden', function (assert) {
    const service = ForbiddenStateService.getInstance();
    assert.strictEqual(service.isForbidden(), false, 'not forbidden after clear');
    assert.strictEqual(service.isHardForbidden(), false, 'not hard forbidden after clear');
    assert.strictEqual(service.isSoftForbidden(), false, 'not soft forbidden after clear');
    assert.strictEqual(service.getForbiddenErrorCode(), '', 'no error code after clear');
    assert.strictEqual(service.getForbiddenErrorMessage(), '', 'no error message after clear');
});

QUnit.test('setForbiddenState (hard) records a hard-forbidden state', function (assert) {
    const service = ForbiddenStateService.getInstance();
    service.setForbiddenState(Constants.FORBIDDEN_ERROR_CODES.NO_TENANT_ACCESS);

    assert.strictEqual(service.isForbidden(), true, 'is forbidden');
    assert.strictEqual(service.isHardForbidden(), true, 'is hard forbidden');
    assert.strictEqual(service.isSoftForbidden(), false, 'is not soft forbidden');
    assert.strictEqual(service.getForbiddenErrorCode(), Constants.FORBIDDEN_ERROR_CODES.NO_TENANT_ACCESS, 'error code is preserved');
    assert.ok(service.getForbiddenErrorMessage().length > 0, 'a fallback error message is resolved');
});

QUnit.test('setForbiddenState (soft) remaps the code to NO_PAGE_ACCESS', function (assert) {
    const service = ForbiddenStateService.getInstance();
    // Pass an unrelated code with isSoft=true; the service should remap it.
    service.setForbiddenState(Constants.FORBIDDEN_ERROR_CODES.FORBIDDEN, true);

    assert.strictEqual(service.isForbidden(), true, 'is forbidden');
    assert.strictEqual(service.isSoftForbidden(), true, 'is soft forbidden');
    assert.strictEqual(service.isHardForbidden(), false, 'soft forbidden is not hard forbidden');
    assert.strictEqual(service.getForbiddenErrorCode(), Constants.FORBIDDEN_ERROR_CODES.NO_PAGE_ACCESS, 'soft forbidden always resolves to NO_PAGE_ACCESS');
});

QUnit.test('clearForbiddenState resets a previously set state', function (assert) {
    const service = ForbiddenStateService.getInstance();
    service.setForbiddenState(Constants.FORBIDDEN_ERROR_CODES.TENANT_BLOCKED);
    assert.strictEqual(service.isForbidden(), true, 'forbidden before clear');

    service.clearForbiddenState();
    assert.strictEqual(service.isForbidden(), false, 'not forbidden after clear');
    assert.strictEqual(service.getForbiddenErrorCode(), '', 'error code cleared');
});

QUnit.test('getModel exposes the backing JSON model reflecting the state', function (assert) {
    const service = ForbiddenStateService.getInstance();
    service.setForbiddenState(Constants.FORBIDDEN_ERROR_CODES.LOGGED_OUT);

    const model = service.getModel();
    assert.strictEqual(model.getProperty('/isForbidden'), true, 'model reflects forbidden flag');
    assert.strictEqual(model.getProperty('/errorCode'), Constants.FORBIDDEN_ERROR_CODES.LOGGED_OUT, 'model reflects error code');
});
