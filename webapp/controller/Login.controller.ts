import BaseController from './BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Auth from '../services/Auth.service';
import Constants from 'kms/common/Constants';
import { Route$MatchedEvent } from 'sap/ui/core/routing/Route';
import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import ResourceModel from 'sap/ui/model/resource/ResourceModel';
import Core from 'sap/ui/core/Core';

/**
 * Login error page controller.
 * This page is shown when SM redirects here after a login failure.
 * It does NOT make any backend API calls, preventing login loops.
 * @namespace kms
 */
export default class Login extends BaseController {
    private loginModel: JSONModel;

    public onInit(): void {
        super.onInit();
        this.loginModel = new JSONModel({
            errorTitle: '',
            errorMessage: '',
            errorCode: ''
        });
        this.setModel(this.loginModel, 'login');
        this.getRouter().getRoute('login')?.attachMatched(this.onRouteMatched.bind(this));
    }

    private onRouteMatched(event: Route$MatchedEvent): void {
        const args = event.getParameter('arguments') as Record<string, unknown>;
        const query = args?.['?query'] as { errorCode?: string } | undefined;
        const errorCode = query?.errorCode || '';

        if (errorCode) {
            const { title, message } = this.resolveErrorMessages(errorCode);
            this.loginModel.setProperty('/errorTitle', title);
            this.loginModel.setProperty('/errorMessage', message);
            this.loginModel.setProperty('/errorCode', errorCode);
        }
        else {
            this.loginModel.setProperty('/errorTitle', this.getTextSafe('authenticationFailTitle', 'Unable to Authenticate'));
            this.loginModel.setProperty('/errorMessage', this.getTextSafe('permissionDeniedAuthenticationFailed', 'Authentication failed. Please try again.'));
            this.loginModel.setProperty('/errorCode', '');
        }
    }

    public onRetryLogin(): void {
        const tenantId = this.getTenantIdFromHash();
        if (tenantId) {
            // Clear login attempt tracker so user gets fresh attempts
            Auth.postLogoutClearance();
            Auth.initiateLogin(tenantId);
        }
    }

    private getTenantIdFromHash(): string | null {
        const hash = window.location.hash;
        const tenantIdMatch = /#\/([^/]+)/.exec(hash);
        return tenantIdMatch ? decodeURIComponent(tenantIdMatch[1]) : null;
    }

    private resolveErrorMessages(errorCode: string): { title: string, message: string } {
        switch (errorCode) {
            case Constants.LOGIN_ERRORS.NO_TRUST_CONFIGURED:
                return {
                    title: this.getTextSafe('noTrustConfiguredTitle', 'Login not possible'),
                    message: this.getTextSafe('noTrustConfiguredMessage', 'Login not possible. No trust is configured for the tenant. Contact your system administrator.')
                };
            case Constants.LOGIN_ERRORS.TOKEN_EXCHANGE_FAILED:
                return {
                    title: this.getTextSafe('authenticationFailTitle', 'Unable to Authenticate'),
                    message: this.getTextSafe('tokenExchangeFailedMessage', 'Authentication token exchange failed. Please try again.')
                };
            case Constants.LOGIN_ERRORS.STATE_EXPIRED:
                return {
                    title: this.getTextSafe('authenticationFailTitle', 'Unable to Authenticate'),
                    message: this.getTextSafe('stateExpiredMessage', 'Your login session has expired. Please try again.')
                };
            case Constants.LOGIN_ERRORS.FINGERPRINT_MISMATCH:
                return {
                    title: this.getTextSafe('authenticationFailTitle', 'Unable to Authenticate'),
                    message: this.getTextSafe('fingerprintMismatchMessage', 'Security validation failed. Please try again.')
                };
            case Constants.LOGIN_ERRORS.INVALID_REQUEST:
                return {
                    title: this.getTextSafe('authenticationFailTitle', 'Unable to Authenticate'),
                    message: this.getTextSafe('invalidRequestMessage', 'The login request was invalid. Please try again.')
                };
            case Constants.LOGIN_ERRORS.SERVER_ERROR:
                return {
                    title: this.getTextSafe('authenticationFailTitle', 'Unable to Authenticate'),
                    message: this.getTextSafe('serverErrorMessage', 'A server error occurred during login. Please try again later.')
                };
            case Constants.LOGIN_ERRORS.UNAUTHORIZED:
                return {
                    title: this.getTextSafe('authenticationFailTitle', 'Unable to Authenticate'),
                    message: this.getTextSafe('unauthorizedMessage', 'You are not authorized to access this application.')
                };
            case Constants.LOGIN_ERRORS.INVALID_OIDC_PROVIDER:
                return {
                    title: this.getTextSafe('authenticationFailTitle', 'Unable to Authenticate'),
                    message: this.getTextSafe('invalidOidcProviderMessage', 'The identity provider configuration is invalid. Contact your system administrator.')
                };
            case Constants.FORBIDDEN_ERROR_CODES.MULTIPLE_UNSUCCESSFUL_LOGIN_ATTEMPTS:
                return {
                    title: this.getTextSafe('authenticationFailTitle', 'Unable to Authenticate'),
                    message: this.getTextSafe('multipleUnsuccessfulLoginAttempts', 'Multiple unsuccessful login attempts detected. Please wait a moment and try again.')
                };
            default:
                return {
                    title: this.getTextSafe('authenticationFailTitle', 'Unable to Authenticate'),
                    message: this.getTextSafe('permissionDeniedAuthenticationFailed', 'Authentication failed. Please try again.')
                };
        }
    }

    private getTextSafe(key: string, fallback: string): string {
        try {
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            const i18nModel = Core.getModel('i18n') as ResourceModel;
            const resourceBundle = i18nModel?.getResourceBundle() as ResourceBundle;
            return resourceBundle?.getText(key) || fallback;
        }
        catch {
            return fallback;
        }
    }
}
