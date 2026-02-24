
import JSONModel from 'sap/ui/model/json/JSONModel';

export default class ForbiddenStateService {
    private static instance: ForbiddenStateService;
    private readonly model: JSONModel;

    private constructor() {
        this.model = new JSONModel({
            errorCode: '',
            errorMessage: '',
            loginButtonVisible: false,
            isForbidden: false
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

    public setForbiddenState(errorCode: string, errorMessage: string, showLoginButton = false): void {
        this.model.setProperty('/errorCode', errorCode);
        this.model.setProperty('/errorMessage', errorMessage);
        this.model.setProperty('/loginButtonVisible', showLoginButton);
        this.model.setProperty('/isForbidden', true);
    }

    public clearForbiddenState(): void {
        this.model.setProperty('/errorCode', '');
        this.model.setProperty('/errorMessage', '');
        this.model.setProperty('/loginButtonVisible', false);
        this.model.setProperty('/isForbidden', false);
    }

    public isForbidden(): boolean {
        return this.model.getProperty('/isForbidden') as boolean || false;
    }

    public navigateToForbidden(tenantId: string): void {
        window.location.hash = `/${tenantId}/forbidden`;
    }

    public navigateToHome(tenantId: string): void {
        window.location.hash = `/${tenantId}`;
    }
}