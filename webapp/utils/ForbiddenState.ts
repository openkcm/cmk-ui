import JSONModel from 'sap/ui/model/json/JSONModel';
import EventBus from 'sap/ui/core/EventBus';
import Constants from 'kms/common/Constants';
import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import ResourceModel from 'sap/ui/model/resource/ResourceModel';
import Core from 'sap/ui/core/Core';

export default class ForbiddenStateService {
    public static readonly FORBIDDEN_EVENT_CHANNEL = 'ForbiddenState';
    public static readonly FORBIDDEN_EVENT_ID = 'forbidden';

    private static instance: ForbiddenStateService;
    private readonly model: JSONModel;

    private constructor() {
        this.model = new JSONModel({
            errorTitle: '',
            errorCode: '',
            errorMessage: '',
            loginButtonVisible: false,
            isForbidden: false,
            isSoftForbidden: false
        });
    }

    public static getInstance(): ForbiddenStateService {
        if (!ForbiddenStateService.instance) {
            ForbiddenStateService.instance = new ForbiddenStateService();
        }
        return ForbiddenStateService.instance;
    }

    public getModel(): JSONModel {
        return this.model;
    }

    /**
     * Sets the forbidden state with the given error code.
     * The error message and login button visibility are resolved from the error code.
     * Publishes an event so App.controller can navigate to the forbidden page.
     * @param errorCode - The error code from the API response
     * @param isSoft - If true, sidebar navigation remains available (soft forbidden).
     *                 If false (default), all navigation is blocked (hard forbidden).
     */
    public setForbiddenState(errorCode: string, isSoft = false): void {
        const resolvedErrorCode = isSoft ? Constants.FORBIDDEN_ERROR_CODES.NO_PAGE_ACCESS : errorCode;
        const errorMessage = this.getErrorMessage(resolvedErrorCode);
        const errorTitle = this.getErrorTitle(resolvedErrorCode);
        const loginSupportedErrorCodes = [Constants.FORBIDDEN_ERROR_CODES.AUTHENTICATION_FAILED, Constants.FORBIDDEN_ERROR_CODES.MULTIPLE_UNSUCCESSFUL_LOGIN_ATTEMPTS, Constants.FORBIDDEN_ERROR_CODES.LOGGED_OUT];
        const showLoginButton = !isSoft && loginSupportedErrorCodes.includes(errorCode);

        this.model.setProperty('/errorTitle', errorTitle);
        this.model.setProperty('/errorCode', resolvedErrorCode);
        this.model.setProperty('/errorMessage', errorMessage);
        this.model.setProperty('/loginButtonVisible', showLoginButton);
        this.model.setProperty('/isForbidden', true);
        this.model.setProperty('/isSoftForbidden', isSoft);

        // Notify listeners (e.g. App.controller) so they can navigate to the forbidden page
        EventBus.getInstance().publish(
            ForbiddenStateService.FORBIDDEN_EVENT_CHANNEL,
            ForbiddenStateService.FORBIDDEN_EVENT_ID
        );
    }

    public clearForbiddenState(): void {
        this.model.setProperty('/errorTitle', '');
        this.model.setProperty('/errorCode', '');
        this.model.setProperty('/errorMessage', '');
        this.model.setProperty('/loginButtonVisible', false);
        this.model.setProperty('/isForbidden', false);
        this.model.setProperty('/isSoftForbidden', false);
    }

    public isForbidden(): boolean {
        return this.model.getProperty('/isForbidden') as boolean || false;
    }

    /**
     * Returns true only for "hard" forbidden states (auth failures, no tenant access, etc.)
     * Returns false for "soft" forbidden (no page access) where sidebar navigation should still work.
     */
    public isHardForbidden(): boolean {
        return this.isForbidden() && !(this.model.getProperty('/isSoftForbidden') as boolean);
    }

    /**
     * Returns true when user just doesn't have access to the specific page they navigated to.
     * Sidebar navigation should remain functional in this state.
     */
    public isSoftForbidden(): boolean {
        return this.model.getProperty('/isSoftForbidden') as boolean || false;
    }

    public getForbiddenErrorMessage(): string {
        return this.model.getProperty('/errorMessage') as string || '';
    }

    public getForbiddenErrorCode(): string {
        return this.model.getProperty('/errorCode') as string || '';
    }

    private getErrorTitle(errorCode: string): string {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const i18nModel = Core.getModel('i18n') as ResourceModel;
        const resourceBundle = i18nModel?.getResourceBundle() as ResourceBundle;

        switch (errorCode) {
            case Constants.FORBIDDEN_ERROR_CODES.MULTIPLE_UNSUCCESSFUL_LOGIN_ATTEMPTS:
            case Constants.FORBIDDEN_ERROR_CODES.AUTHENTICATION_FAILED:
                return resourceBundle?.getText('authenticationFailTitle') || 'Unable to Authenticate';
            case Constants.FORBIDDEN_ERROR_CODES.LOGGED_OUT:
                return resourceBundle?.getText('loggedOutTitle') || 'Logged Out';
            case Constants.FORBIDDEN_ERROR_CODES.NO_PAGE_ACCESS:
                return resourceBundle?.getText('notAuthorised') || 'Not Authorised';
            default:
                return resourceBundle?.getText('notAuthorised') || 'Not Authorised';
        }
    }

    private getErrorMessage(errorCode: string): string {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const i18nModel = Core.getModel('i18n') as ResourceModel;
        const resourceBundle = i18nModel?.getResourceBundle() as ResourceBundle;

        switch (errorCode) {
            case Constants.FORBIDDEN_ERROR_CODES.MULTIPLE_ROLES_NOT_ALLOWED:
                return resourceBundle?.getText('permissionDeniedMultipleRoles') || 'Multiple roles not allowed';
            case Constants.FORBIDDEN_ERROR_CODES.NO_TENANT_ACCESS:
                return resourceBundle?.getText('permissionDeniedNoRole') || 'No tenant access';
            case Constants.FORBIDDEN_ERROR_CODES.AUTHENTICATION_FAILED:
                return resourceBundle?.getText('permissionDeniedAuthenticationFailed') || 'Authentication failed';
            case Constants.FORBIDDEN_ERROR_CODES.ZERO_ROLES_NOT_ALLOWED:
                return resourceBundle?.getText('permissionDeniedZeroRoles') || 'Zero roles not allowed';
            case Constants.FORBIDDEN_ERROR_CODES.MULTIPLE_UNSUCCESSFUL_LOGIN_ATTEMPTS:
                return resourceBundle?.getText('multipleUnsuccessfulLoginAttempts') || 'Multiple unsuccessful login attempts';
            case Constants.FORBIDDEN_ERROR_CODES.LOGGED_OUT:
                return resourceBundle?.getText('loggedOutMessage') || 'You have been logged out';
            case Constants.FORBIDDEN_ERROR_CODES.NO_PAGE_ACCESS:
                return resourceBundle?.getText('noPageAccessDescription') || 'You do not have permission to access this page. Please use the navigation menu to access an available page.';
            default:
                return resourceBundle?.getText('forbiddenDescription') || 'Access forbidden';
        }
    }
}
