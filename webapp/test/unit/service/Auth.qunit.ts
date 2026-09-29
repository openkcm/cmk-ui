import Auth from 'kms/services/Auth.service';

// Only the side-effect-free methods are covered here. The remaining Auth methods
// (initiateLogin, secureLogout, setAuthEndpoint, handle401Error) assign
// window.location.href and would navigate the test runner away, so they are not
// exercised in unit tests.
QUnit.module('Auth Service Unit Tests', {
    afterEach: function () {
        // Expire any CSRF cookies set during a test so they do not leak into others.
        document.cookie.split(';').forEach((cookie) => {
            const name = cookie.split('=')[0].trim();
            if (name.startsWith('CSRF-')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            }
        });
        sessionStorage.removeItem('myapp_session_login_attempts');
    }
});

QUnit.test('getCsrfTokenFromCookie reads the tenant-scoped CSRF token', function (assert) {
    document.cookie = 'CSRF-tenant-a=token-abc-123; path=/';
    assert.strictEqual(Auth.getCsrfTokenFromCookie('tenant-a'), 'token-abc-123', 'the token for the matching tenant is returned');
});

QUnit.test('getCsrfTokenFromCookie returns empty string when the cookie is absent', function (assert) {
    assert.strictEqual(Auth.getCsrfTokenFromCookie('no-such-tenant'), '', 'a missing CSRF cookie yields an empty string');
});

QUnit.test('getCsrfTokenFromCookie isolates tokens by tenant', function (assert) {
    document.cookie = 'CSRF-tenant-b=token-b; path=/';
    document.cookie = 'CSRF-tenant-c=token-c; path=/';
    assert.strictEqual(Auth.getCsrfTokenFromCookie('tenant-b'), 'token-b', 'tenant-b token is returned');
    assert.strictEqual(Auth.getCsrfTokenFromCookie('tenant-c'), 'token-c', 'tenant-c token is returned');
});

QUnit.test('postLogoutClearance removes the login-attempts tracker', function (assert) {
    sessionStorage.setItem('myapp_session_login_attempts', JSON.stringify({ count: 3, lastAttemptTime: Date.now() }));
    Auth.postLogoutClearance();
    assert.strictEqual(sessionStorage.getItem('myapp_session_login_attempts'), null, 'the tracker is cleared from session storage');
});
