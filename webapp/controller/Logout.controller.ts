import BaseController from './BaseController';
import Auth from '../services/Auth.service';

/**
 * Logout confirmation page controller.
 * This page is shown after SM completes the logout and redirects here.
 * It does NOT make any backend API calls, preventing login loops.
 * @namespace kms
 */
export default class Logout extends BaseController {
    public onInit(): void {
        super.onInit();
    }

    public onLoginAgain(): void {
        const tenantId = this.getTenantIdFromHash();
        if (tenantId) {
            Auth.postLogoutClearance();
            const newUrl = `${window.location.origin}${window.location.pathname}#/${encodeURIComponent(tenantId)}`;
            window.history.replaceState(null, '', newUrl);
            Auth.initiateLogin(tenantId);
        }
    }

    private getTenantIdFromHash(): string | null {
        const hash = window.location.hash;
        const tenantIdMatch = /#\/([^/]+)/.exec(hash);
        return tenantIdMatch ? decodeURIComponent(tenantIdMatch[1]) : null;
    }
}
