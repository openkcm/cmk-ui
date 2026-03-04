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
        // const forbiddenModel = this.getView()?.getModel('forbidden') as JSONModel;
        // forbiddenModel?.setProperty('/loginButtonVisible', false);
        // const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        // const errorCode = urlParams.get('errorCode');
        // let errorMessage = this.getText('forbiddenDescription');
        // let errorTitle = this.getText('notAuthorised');

        // switch (errorCode) {
        //     case Constants.FORBIDDEN_ERROR_CODES.MULTIPLE_ROLES_NOT_ALLOWED:
        //         errorMessage = this.getText('permissionDeniedMultipleRoles');
        //         break;
        //     case Constants.FORBIDDEN_ERROR_CODES.NO_TENANT_ACCESS:
        //         errorMessage = this.getText('permissionDeniedNoRole');
        //         break;
        //     case Constants.FORBIDDEN_ERROR_CODES.AUTHENTICATION_FAILED:
        //         errorMessage = this.getText('permissionDeniedAuthenticationFailed');
        //         forbiddenModel?.setProperty('/loginButtonVisible', true);
        //         break;
        //     case Constants.FORBIDDEN_ERROR_CODES.MULTIPLE_UNSUCCESSFUL_LOGIN_ATTEMPTS:
        //         errorMessage = this.getText('multipleUnsuccessfulLoginAttempts');
        //         errorTitle = this.getText('authenticationFailTitle');
        //         break;
        //     default:
        //         errorMessage = this.getText('forbiddenDescription');
        //         break;
        // }
        // forbiddenModel?.setProperty('/errorMessage', errorMessage);
        // forbiddenModel?.setProperty('/errorTitle', errorTitle);
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
