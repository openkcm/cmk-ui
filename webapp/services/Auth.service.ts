/**
 * @namespace kms
 */

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class Auth {
    private static authEndpoint: string;
    private static baseAuthUrl: string;
    private static csrfToken: string;
    // Intentionally empty so that no instances of this class can be created
    private constructor() { /* empty */ }

    static init(baseAuthUrl: string): void {
        Auth.baseAuthUrl = baseAuthUrl;
    }

    static setAuthEndpoint(tenantId: string): void {
        const returnToPath = window.location.href;
        Auth.authEndpoint = `${this.baseAuthUrl}/sm/auth?tenant_id=${encodeURIComponent(tenantId)}&request_uri=${encodeURIComponent(returnToPath)}`;
    }

    static initiateLogin(tenantId: string, retry: boolean): void {
        this.setAuthEndpoint(tenantId);
        window.location.href = Auth.authEndpoint;
        if (retry) {
            const returnToPath = `${window.location.origin}${window.location.pathname}#/${tenantId}/keyConfigs`;
            window.location.href = `${this.baseAuthUrl}/sm/auth?tenant_id=${encodeURIComponent(tenantId)}&request_uri=${encodeURIComponent(returnToPath)}`;
        }
        else {
            window.location.href = Auth.authEndpoint;
        }
    }

    static getCsrfTokenFromCookie(cookieName: string): string {
        const cookieNameSearchString = cookieName + '=';

        // Decode the entire cookie string and clean up whitespace
        // Crucial for handling URL-encoded values.
        const decodedCookie = decodeURIComponent(document.cookie).split(';');

        decodedCookie.forEach((cookie) => {
            // Remove leading whitespace
            while (cookie.startsWith(' ')) {
                cookie = cookie.substring(1);
            }
            if (cookie.startsWith(cookieNameSearchString)) {
                this.csrfToken = cookie.substring(cookieNameSearchString.length, cookie.length);
            }
        });
        return this.csrfToken;
    }
}
