import Controller from 'sap/ui/core/mvc/Controller';
import UIComponent from 'sap/ui/core/UIComponent';
import Constants from 'kms/common/Constants';
import Enums from 'kms/common/Enums';
import Model from 'sap/ui/model/Model';
import Router from 'sap/ui/core/routing/Router';
import { Link$PressEvent } from 'sap/m/Link';
import { getText } from 'kms/common/Helpers';
import SettingsDialogHandler from 'kms/controller/settings/SettingsDialog.controller';

/**
 * @namespace kms
 */
export default class BaseController extends Controller {
    public Enums: typeof Enums;
    public Constants: typeof Constants;
    public test: string;
    public tenantId: string;
    private settingsDialogHandler: SettingsDialogHandler | null = null;

    public onInit(): void {
        this.Enums = Enums;
        this.Constants = Constants;
        this.tenantId = '';
    }

    public getRouter(): Router {
        return UIComponent.getRouterFor(this);
    }

    public getModel(name?: string): Model | undefined {
        return this.getView()?.getModel(name);
    }

    public setModel(model: Model, name?: string): this {
        this.getView()?.setModel(model, name);
        return this;
    }

    public getCurrentRoute() {
        const component = this.getOwnerComponent() as UIComponent & { _currentRoute: string };
        return component._currentRoute;
    }

    public getText(key: string, params?: string | string[] | number | number[]): string {
        return getText(key, params);
    }

    public onBreadCrumbLinkPress(event: Link$PressEvent, pageName: string, params?: object): void {
        this.getRouter().navTo(pageName, { tenantId: this.tenantId, ...params });
    }

    public async onOpenSettingsDialog(): Promise<void> {
        const view = this.getView();
        if (!view) return;

        if (!this.settingsDialogHandler) {
            this.settingsDialogHandler = new SettingsDialogHandler(view);
        }
        await this.settingsDialogHandler.open();
    }
}
