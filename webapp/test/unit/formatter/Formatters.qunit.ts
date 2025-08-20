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
