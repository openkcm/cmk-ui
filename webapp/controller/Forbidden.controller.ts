import BaseController from './BaseController';

/**
 * Forbidden page controller.
 * This page is shown when a user is authenticated but doesn't have the required
 * permissions (API returns 403, e.g. MULTIPLE_ROLES_NOT_ALLOWED, NO_TENANT_ACCESS).
 * Login errors from SM are handled by the Login page instead.
 * @namespace kms
 */
export default class Forbidden extends BaseController {
    public onInit(): void {
        super.onInit();
    }
}
