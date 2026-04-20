import * as Formatters from 'kms/common/Formatters';
import { SystemStatus } from 'kms/common/Enums';

QUnit.module('Formatters Unit Tests');

QUnit.test('The setSystemStatusIcon method with a CONNECTED state', function (assert) {
    const result = Formatters.setSystemStatusIcon(SystemStatus.CONNECTED);
    assert.strictEqual(result, 'sap-icon://sys-enter-2', 'The icon for CONNECTED state is correct');
});
QUnit.test('The setSystemStatusIcon method with a PROCESSING state', function (assert) {
    const result = Formatters.setSystemStatusIcon(SystemStatus.PROCESSING);
    assert.strictEqual(result, 'sap-icon://lateness', 'The icon for PROCESSING state is correct');
});
QUnit.test('The setSystemStatusIcon method with a FAILED state', function (assert) {
    const result = Formatters.setSystemStatusIcon(SystemStatus.FAILED);
    assert.strictEqual(result, 'sap-icon://message-error', 'The icon for FAILED state is correct');
});
QUnit.test('The setSystemStatusIcon method with an unknown state', function (assert) {
    const result = Formatters.setSystemStatusIcon('UNKNOWN' as SystemStatus);
    assert.strictEqual(result, null, 'The icon for an unknown state is empty');
});

QUnit.test('The setSystemStatusColor method with a CONNECTED state', function (assert) {
    const result = Formatters.setSystemStatusColor(SystemStatus.CONNECTED);
    assert.strictEqual(result, 'Indication14', 'The color for CONNECTED state is correct');
});
QUnit.test('The setSystemStatusColor method with a PROCESSING state', function (assert) {
    const result = Formatters.setSystemStatusColor(SystemStatus.PROCESSING);
    assert.strictEqual(result, 'Indication15', 'The color for PROCESSING state is correct');
});
QUnit.test('The setSystemStatusColor method with a FAILED state', function (assert) {
    const result = Formatters.setSystemStatusColor(SystemStatus.FAILED);
    assert.strictEqual(result, 'Indication11', 'The color for FAILED state is correct');
});
QUnit.test('The setSystemStatusColor method with an unknown state', function (assert) {
    const result = Formatters.setSystemStatusColor('UNKNOWN' as SystemStatus);
    assert.strictEqual(result, null, 'The color for an unknown state is empty');
});

QUnit.test('The formatErrorDetails method returns error message for FAILED status', function (assert) {
    const result = Formatters.formatErrorDetails('FAILED', 'Connection timed out');
    assert.strictEqual(result, 'Connection timed out', 'Should return the error message for FAILED status');
});
QUnit.test('The formatErrorDetails method returns fallback for FAILED status with no message', function (assert) {
    const result = Formatters.formatErrorDetails('FAILED', '');
    assert.strictEqual(result, 'errorSystemFailed', 'Should return system-specific fallback text for FAILED status with empty message');
});
QUnit.test('The formatErrorDetails method returns error message for DISCONNECTED status', function (assert) {
    const result = Formatters.formatErrorDetails('DISCONNECTED', 'Host unreachable');
    assert.strictEqual(result, 'Host unreachable', 'Should return the error message for DISCONNECTED status');
});
QUnit.test('The formatErrorDetails method returns empty string for CONNECTED status', function (assert) {
    const result = Formatters.formatErrorDetails('CONNECTED', 'Some error');
    assert.strictEqual(result, '', 'Should return empty string for CONNECTED status');
});
QUnit.test('The formatErrorDetails method returns empty string for PROCESSING status', function (assert) {
    const result = Formatters.formatErrorDetails('PROCESSING', 'Some error');
    assert.strictEqual(result, '', 'Should return empty string for PROCESSING status');
});

QUnit.test('The isErrorStatus method returns true for FAILED status', function (assert) {
    const result = Formatters.isErrorStatus('FAILED');
    assert.strictEqual(result, true, 'FAILED should be an error status');
});
QUnit.test('The isErrorStatus method returns false for CONNECTED status', function (assert) {
    const result = Formatters.isErrorStatus('CONNECTED');
    assert.strictEqual(result, false, 'CONNECTED should not be an error status');
});
QUnit.test('The isErrorStatus method returns false for PROCESSING status', function (assert) {
    const result = Formatters.isErrorStatus('PROCESSING');
    assert.strictEqual(result, false, 'PROCESSING should not be an error status');
});
QUnit.test('The isErrorStatus method returns false for DISCONNECTED status', function (assert) {
    const result = Formatters.isErrorStatus('DISCONNECTED');
    assert.strictEqual(result, false, 'DISCONNECTED should not be an error status');
});
