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
        forbiddenModel.setProperty('/errorMessage', errorMessage || this.getText('forbiddenDescription'));
        const errorTitle = forbiddenModel.getProperty('/errorTitle') as string;
        forbiddenModel.setProperty('/errorTitle', errorTitle || this.getText('notAuthorised'));
    }

    public onRetryLogin(): void {
        const tenantId = this.getTenantIdFromHash();
        if (tenantId) {
            ForbiddenStateService.getInstance().clearForbiddenState();
            Auth.initiateLogin(tenantId);
        }
    }

    private getTenantIdFromHash(): string | null {
        const hash = window.location.hash;
        const tenantIdMatch = /#\/([^/]+)/.exec(hash);
        return tenantIdMatch ? decodeURIComponent(tenantIdMatch[1]) : null;
    }
}
