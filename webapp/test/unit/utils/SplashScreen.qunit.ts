import SplashScreen from 'kms/utils/SplashScreen';

QUnit.module('SplashScreen Unit Tests', {
    beforeEach: function () {
        // Build the DOM structure SplashScreen manipulates, inside the QUnit fixture.
        document.body.insertAdjacentHTML('beforeend', `
            <div id="container" data-loading="true"></div>
            <div id="kms-splash-screen">
                <div class="splash-title">Loading</div>
                <div class="splash-description">Please wait</div>
            </div>
            <style id="kms-splash-styles"></style>
        `);
    },
    afterEach: function () {
        ['container', 'kms-splash-screen', 'kms-splash-styles'].forEach((id) => {
            document.getElementById(id)?.remove();
        });
    }
});

QUnit.test('hide removes the loading attribute and starts the fade-out', function (assert) {
    const done = assert.async();
    SplashScreen.hide();

    const container = document.getElementById('container');
    const splash = document.getElementById('kms-splash-screen');
    assert.strictEqual(container?.hasAttribute('data-loading'), false, 'the loading attribute is removed immediately');
    assert.strictEqual(splash?.classList.contains('fade-out'), true, 'the fade-out class is applied immediately');

    // hide() schedules DOM cleanup after the fade duration (300ms). Keep the test
    // open until that timer has fired so it cannot leak into a later test's fixture.
    setTimeout(done, 400);
});

QUnit.test('hide eventually removes the splash and its styles', function (assert) {
    const done = assert.async();
    SplashScreen.hide();

    // Removal happens after the fade duration (300ms) via setTimeout.
    setTimeout(() => {
        assert.strictEqual(document.getElementById('kms-splash-screen'), null, 'splash element is removed after the fade');
        assert.strictEqual(document.getElementById('kms-splash-styles'), null, 'splash styles are removed after the fade');
        done();
    }, 400);
});

QUnit.test('hide is a no-op when the splash is absent', function (assert) {
    document.getElementById('kms-splash-screen')?.remove();
    document.getElementById('container')?.remove();
    SplashScreen.hide();
    assert.ok(true, 'hide does not throw when elements are missing');
});

QUnit.test('showError marks the splash as an error and updates its text', function (assert) {
    SplashScreen.showError('Something broke');

    const splash = document.getElementById('kms-splash-screen');
    assert.strictEqual(splash?.classList.contains('splash-error'), true, 'error class is applied');
    assert.strictEqual(splash?.getAttribute('aria-label'), 'Application error', 'aria-label is set');
    assert.strictEqual(splash?.getAttribute('aria-live'), 'assertive', 'aria-live is set');
    assert.strictEqual(splash?.querySelector('.splash-title')?.textContent, 'Unable to Load', 'title text is replaced');
    assert.strictEqual(splash?.querySelector('.splash-description')?.textContent, 'Something broke', 'description shows the message');
});

QUnit.test('showError is a no-op when the splash is absent', function (assert) {
    document.getElementById('kms-splash-screen')?.remove();
    SplashScreen.showError('ignored');
    assert.ok(true, 'showError does not throw when the splash is missing');
});
