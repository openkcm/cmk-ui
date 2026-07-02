/**
 * @namespace kms
 */

import Constants from 'kms/common/Constants';
import { ILoginTracker } from 'kms/common/Types';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class Auth {
    private static authEndpoint: string;
    private static baseAuthUrl: string;
    private static csrfCookieBaseName = 'CSRF';
    private static loginSessionStorageKey = 'myapp_session_login_attempts';
    private static maxLoginAttempts = 4;
    // Intentionally empty so that no instances of this class can be created
    private constructor() { /* empty */ }

    static init(baseAuthUrl: string): void {
        Auth.baseAuthUrl = baseAuthUrl;
    }

    static setAuthEndpoint(tenantId: string): void {
        const returnToPath = window.location.href;
        const errorUri = this.buildLoginErrorUri(tenantId);
        Auth.authEndpoint = `${this.baseAuthUrl}/sm/auth?tenant_id=${encodeURIComponent(tenantId)}&request_uri=${encodeURIComponent(returnToPath)}&error_uri=${encodeURIComponent(errorUri)}`;
    }

    static initiateLogin(tenantId: string): void {
        this.setAuthEndpoint(tenantId);
        window.location.href = Auth.authEndpoint;
    }

    static getCsrfTokenFromCookie(tenantId: string): string {
        const csrfCookieName = `${Auth.csrfCookieBaseName}-${tenantId}`;
        const cookieNameSearchString = csrfCookieName + '=';
        let csrfToken = '';

        // Decode the entire cookie string and clean up whitespace
        // Crucial for handling URL-encoded values.
        const decodedCookie = decodeURIComponent(document.cookie).split(';');

        decodedCookie.forEach((cookie) => {
            // Remove leading whitespace
            while (cookie.startsWith(' ')) {
                cookie = cookie.substring(1);
            }
            if (cookie.startsWith(cookieNameSearchString)) {
                csrfToken = cookie.substring(cookieNameSearchString.length, cookie.length);
            }
        });
        return csrfToken;
    }

    static secureLogout(tenantId: string): void {
        this.postLogoutClearance();
        const logoutRedirectUri = this.buildLogoutRedirectUri(tenantId);
        const logoutUrl = `${this.baseAuthUrl}/sm/logout?tenant_id=${encodeURIComponent(tenantId)}&post_logout_redirect_uri=${encodeURIComponent(logoutRedirectUri)}`;
        window.location.href = logoutUrl;
    }

    static postLogoutClearance(): void {
        sessionStorage.removeItem(Auth.loginSessionStorageKey);
    }

    static handle401Error(tenantId: string): void {
        const timeWindow = 30000; // 30 seconds in milliseconds
        const loginAttemptsData = sessionStorage.getItem(Auth.loginSessionStorageKey);
        const now = Date.now();
        const defaultData = { count: 0, lastAttemptTime: 0 };
        let tracker = (loginAttemptsData ? JSON.parse(loginAttemptsData) : defaultData) as ILoginTracker;

        // Reset tracker if the last attempt was a long time ago
        if (now - tracker.lastAttemptTime > timeWindow) {
            tracker = { count: 0, lastAttemptTime: now };
        }

        if (tracker.count >= Auth.maxLoginAttempts) {
            // Redirect to the login error page instead of setting forbidden state in the SPA
            // This prevents the login loop since the login page doesn't make API calls
            const origin = window.location.origin;
            const errorCode = Constants.FORBIDDEN_ERROR_CODES.MULTIPLE_UNSUCCESSFUL_LOGIN_ATTEMPTS;
            window.location.href = `${origin}/#/${encodeURIComponent(tenantId)}/login?errorCode=${encodeURIComponent(errorCode)}`;
        }
        else {
            tracker.count++;
            tracker.lastAttemptTime = now;
            sessionStorage.setItem(Auth.loginSessionStorageKey, JSON.stringify(tracker));

            this.initiateLogin(tenantId);
        }
    }

    /**
     * Builds the error_uri for the SM auth endpoint.
     *
     * The error_uri intentionally does NOT include a hash fragment (#) because
     * SM treats `#` as a standard URL fragment separator (per RFC 3986) and
     * appends query parameters before it, producing broken URLs.
     *
     * Instead, we pass the tenantId as a query parameter:
     *   https://host/index.html?tenant=chbu-5-st
     *
     * When SM encounters an error, it appends errorCode/errorDescription as
     * additional query parameters, producing a clean URL:
     *   https://host/index.html?tenant=chbu-5-st&errorCode=invalid_request&errorDescription=...
     *
     * The splash-helpers.js script (which runs before UI5 bootstraps) detects
     * errorCode in window.location.search, reads the tenant param, and redirects
     * to the correct hash-based login route:
     *   https://host/index.html#/chbu-5-st/login?errorCode=invalid_request
     */
    private static buildLoginErrorUri(tenantId: string): string {
        const base = window.location.origin + window.location.pathname;
        return `${base}?tenant=${encodeURIComponent(tenantId)}`;
    }

    /**
     * Builds the post-logout redirect URI.
     * SM will redirect here after successfully logging the user out.
     */
    private static buildLogoutRedirectUri(tenantId: string): string {
        const base = window.location.origin + window.location.pathname;
        return `${base}#/${encodeURIComponent(tenantId)}/logout`;
    }
}
