import Formatters from "kms/common/Formatters";

QUnit.module("Formatters Unit Tests");

QUnit.test("The setSystemStatusIcon method with a CONNECTED state", function (assert) {
    const result = Formatters.setSystemStatusIcon('CONNECTED');
    assert.strictEqual(result, 'sap-icon://sys-enter-2', "The icon for CONNECTED state is correct");
});
QUnit.test("The setSystemStatusIcon method with a PROCESSING state", function (assert) {
    const result = Formatters.setSystemStatusIcon('PROCESSING');
    assert.strictEqual(result, 'sap-icon://lateness', "The icon for PROCESSING state is correct");
});
QUnit.test("The setSystemStatusIcon method with a FAILED state", function (assert) {
    const result = Formatters.setSystemStatusIcon('FAILED');
    assert.strictEqual(result, 'sap-icon://message-error', "The icon for FAILED state is correct");
});
QUnit.test("The setSystemStatusIcon method with an unknown state", function (assert) {
    const result = Formatters.setSystemStatusIcon('UNKNOWN');
    assert.strictEqual(result, '', "The icon for an unknown state is empty");
});

QUnit.test("The setSystemStatusColor method with a CONNECTED state", function (assert) {
    const result = Formatters.setSystemStatusColor('CONNECTED');
    assert.strictEqual(result, 'Indication14', "The color for CONNECTED state is correct");
});
QUnit.test("The setSystemStatusColor method with a PROCESSING state", function (assert) {
    const result = Formatters.setSystemStatusColor('PROCESSING');
    assert.strictEqual(result, 'Indication15', "The color for PROCESSING state is correct");
});
QUnit.test("The setSystemStatusColor method with a FAILED state", function (assert) {
    const result = Formatters.setSystemStatusColor('FAILED');
    assert.strictEqual(result, 'Indication11', "The color for FAILED state is correct");
});
QUnit.test("The setSystemStatusColor method with an unknown state", function (assert) {
    const result = Formatters.setSystemStatusColor('UNKNOWN');
    assert.strictEqual(result, '', "The color for an unknown state is empty");
});