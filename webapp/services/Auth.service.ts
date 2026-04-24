/**
 * @namespace kms
 */

import Constants from 'kms/common/Constants';
import { ILoginTracker } from 'kms/common/Types';
import ForbiddenStateService from '../utils/ForbiddenState';

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
        Auth.authEndpoint = `${this.baseAuthUrl}/sm/auth?tenant_id=${encodeURIComponent(tenantId)}&request_uri=${encodeURIComponent(returnToPath)}`;
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
        const logoutUrl = `${this.baseAuthUrl}/sm/logout?tenant_id=${tenantId}`;
        this.postLogoutClearance();
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
            ForbiddenStateService.getInstance().setForbiddenState(Constants.FORBIDDEN_ERROR_CODES.MULTIPLE_UNSUCCESSFUL_LOGIN_ATTEMPTS);
        }
        else {
            tracker.count++;
            tracker.lastAttemptTime = now;
            sessionStorage.setItem(Auth.loginSessionStorageKey, JSON.stringify(tracker));

            this.initiateLogin(tenantId);
        }
    }
}
