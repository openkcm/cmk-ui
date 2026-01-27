import BaseController from './BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Constants from 'kms/common/Constants';
import Auth from '../services/Auth.service';

/**
 * @namespace kms
 */
export default class Forbidden extends BaseController {
    public onInit(): void {
        super.onInit();
        const model = new JSONModel({
            errorMessage: this.getText('forbiddenDescription')
        });
        this.getView()?.setModel(model, 'forbidden');
        this.getRouter().getRoute('forbidden')?.attachMatched(this.onRouteMatched.bind(this));
    }

    private onRouteMatched(): void {
        const forbiddenModel = this.getView()?.getModel('forbidden') as JSONModel;
        forbiddenModel?.setProperty('/loginButtonVisible', false);
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const errorCode = urlParams.get('errorCode');
        let errorMessage = this.getText('forbiddenDescription');
        if (errorCode === Constants.FORBIDDEN_ERROR_CODES.MULTIPLE_ROLES_NOT_ALLOWED) {
            errorMessage = this.getText('permissionDeniedMultipleRoles');
        }
        else if (errorCode === Constants.FORBIDDEN_ERROR_CODES.NO_TENANT_ACCESS) {
            errorMessage = this.getText('permissionDeniedNoRole');
        }
        else if (errorCode === Constants.FORBIDDEN_ERROR_CODES.AUTHENTICATION_FAILED) {
            errorMessage = this.getText('permissionDeniedAuthenticationFailed');
            forbiddenModel?.setProperty('/loginButtonVisible', true);
        }
        else {
            errorMessage = this.getText('forbiddenDescription');
        }
        forbiddenModel?.setProperty('/errorMessage', errorMessage);
    }

    public onRetryLogin(): void {
        const tenantId = this.getTenantIdFromHash();
        if (tenantId) {
            Auth.initiateLogin(tenantId, true);
        }
    }

    private getTenantIdFromHash(): string | null {
        const hash = window.location.hash;
        const tenantIdMatch = /#\/([^/]+)/.exec(hash);
        return tenantIdMatch ? decodeURIComponent(tenantIdMatch[1]) : null;
    }
}
