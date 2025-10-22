import App from 'kms/controller/App.controller';

QUnit.module('App Controller Unit Tests');

QUnit.test('The App controller class has all custom methods', function (assert) {
    assert.expect(4);
    assert.strictEqual(typeof App.prototype.onInit, 'function');
    assert.strictEqual(typeof App.prototype.onSideNavButtonPress, 'function');
    assert.strictEqual(typeof App.prototype.onRouteChange, 'function');
    assert.strictEqual(typeof App.prototype.onUserNamePress, 'function');
});
