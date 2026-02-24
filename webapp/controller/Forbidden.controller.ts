import BaseController from './BaseController';
import Auth from '../services/Auth.service';
import ForbiddenStateService from '../utils/ForbiddenState';

/**
 * @namespace kms
 */
export default class Forbidden extends BaseController {
    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('forbidden')?.attachMatched(this.onRouteMatched.bind(this));
    }

    private onRouteMatched(): void {
        const forbiddenService = ForbiddenStateService.getInstance();
        const forbiddenModel = forbiddenService.getModel();

        const errorMessage = forbiddenModel.getProperty('/errorMessage') as string;
        if (!errorMessage) {
            forbiddenModel.setProperty('/errorMessage', this.getText('forbiddenDescription'));
        }
    }

    public onRetryLogin(): void {
        const tenantId = this.getTenantIdFromHash();
        if (tenantId) {
            ForbiddenStateService.getInstance().clearForbiddenState();
            Auth.initiateLogin(tenantId, true);
        }
    }

    private getTenantIdFromHash(): string | null {
        const hash = window.location.hash;
        const tenantIdMatch = /#\/([^/]+)/.exec(hash);
        return tenantIdMatch ? decodeURIComponent(tenantIdMatch[1]) : null;
    }
}
