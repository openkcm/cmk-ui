import BaseController from './BaseController';
import Fragment from 'sap/ui/core/Fragment';
import JSONModel from 'sap/ui/model/json/JSONModel';
import ResponsivePopover from 'sap/m/ResponsivePopover';
import { Avatar$PressEvent } from 'sap/m/Avatar';
import { Router$RouteMatchedEvent } from 'sap/ui/core/routing/Router';
import ToolPage from 'sap/tnt/ToolPage';
import { Menu$ItemSelectedEvent } from 'sap/m/Menu';
import Api from 'kms/services/Api.service';
import MessageBox from 'sap/m/MessageBox';
import Component from 'kms/Component';
import MenuItem from 'sap/m/MenuItem';
/**
 * @namespace kms
 */
export default class App extends BaseController {
    private api: Api;
    private userPopover: ResponsivePopover | undefined;
    private readonly oneWayModel = new JSONModel(
        {
            tenants: [
                {
                    id: 'tenant1'
                },
                {
                    id: 'tenant2'
                }]
        }
    );

    private readonly twoWayModel = new JSONModel(
        {
            selectedKey: '',
            selectedTenant: ''
        }
    );

    private toolPage: ToolPage | undefined;

    public onInit(): void {
        void this.asyncOnInit();
    }

    public async asyncOnInit(): Promise<void> {
        const component = this.getOwnerComponent() as Component;
        try {
            await component.apiInitializedPromise;
        }
        catch (error) {
            console.error(error);
            this.getView()?.setVisible(false);
            return;
        }
        super.onInit();
        this.toolPage = this.byId('kmsApp') as ToolPage;

        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.twoWayModel, 'twoWay');
        this.twoWayModel.setProperty('/selectedKey', 'keyConfigs');

        // BEGIN KMS20-2751 TEMPORARY: Set the tenant from the URL
        this.api = Api.getInstance();
        const currentUrl = window.location.hash;
        const tenantIdMatch = /#\/([^/]+)/.exec(currentUrl);
        if (tenantIdMatch) {
            try {
                Api.updateTenantId(tenantIdMatch[1]);
            }
            catch (error) {
                console.error('Invalid tenant', error);
                this.getView()?.setVisible(false);
            }
        }
        this.setTenantData(tenantIdMatch ? tenantIdMatch[1] : undefined);
        const urlAfterTenant = currentUrl.slice(1).split('/')[2];
        // END KMS20-2751 TEMPORARY: Set the tenant from the URL

        if (window.location.hash === '' || urlAfterTenant === '' || urlAfterTenant === undefined) {
            this.getRouter().navTo('keyConfigs', {
                tenantId: this.twoWayModel.getProperty('/selectedTenant') as string
            });
        }
        this.getRouter().attachRouteMatched(this.onRouteChange.bind(this));
    }

    public onRouteChange(event: Router$RouteMatchedEvent): void {
        const routeName = event.getParameter('name');
        const routeArgs = event.getParameter('arguments') as { tenantId: string };
        this.twoWayModel.setProperty('/selectedTenant', routeArgs?.tenantId);
        try {
            Api.updateTenantId(routeArgs?.tenantId);
        }
        catch (error) {
            console.error('Invalid tenant', error);
            MessageBox.error(this.getText('invalidTenantError'));
        }
        const tenants = this.oneWayModel.getProperty('/tenants') as { id: string, name: string }[];
        const selectedTenant = tenants.find(tenant => tenant.id === routeArgs?.tenantId);
        this.twoWayModel.setProperty('/selectedTenantName', selectedTenant ? selectedTenant.name : '');

        switch (routeName) {
            case 'keyConfigs':
            case 'keyConfigDetail':
            case 'keyConfigDetailPanel':
                this.twoWayModel.setProperty('/selectedKey', 'keyConfigs');
                break;
            case 'systems':
            case 'systemsDetail':
                this.twoWayModel.setProperty('/selectedKey', 'systems');
                break;
            case 'tasks':
            case 'tasksDetail':
                this.twoWayModel.setProperty('/selectedKey', 'tasks');
                break;
            case 'groups':
            case 'groupDetail':
                this.twoWayModel.setProperty('/selectedKey', 'groups');
                break;
            case 'settings':
                this.twoWayModel.setProperty('/selectedKey', 'settings');
                break;
            default:
                this.twoWayModel.setProperty('/selectedKey', 'keyConfigs');
        }
    }

    public setTenantData(tenantId?: string): void {
        const tenants = this.api.getTenantsList();
        if (tenants && tenants.length > 0) {
            this.oneWayModel.setProperty('/tenants', tenants);
            // KMS20-2751 TEMPORARY: Set the tenant from the URL
            if (tenantId) {
                this.twoWayModel.setProperty('/selectedTenant', tenantId);
                const selectedTenant = tenants.find(tenant => tenant.id === tenantId);
                this.twoWayModel.setProperty('/selectedTenantName', selectedTenant ? selectedTenant.name : '');
            }
            else {
                MessageBox.error(this.getText('errorNoTenantSelected'));
                this.getView()?.setVisible(false);
            }
            // KMS20-2751 TEMPORARY: this.twoWayModel.setProperty('/selectedTenant', tenants[0].id);
            // KMS20-2751 TEMPORARY: this.twoWayModel.setProperty('/selectedTenantName', tenants[0].name || '');
        }
        else {
            MessageBox.error(this.getText('errorNoTenantsFound'));
        }
    }

    public onNavigationClick(): void {
        this.navigateToSelectedPage();
    }

    public onSideNavButtonPress(): void {
        this.toolPage?.setSideExpanded(!this.toolPage.getSideExpanded());
    }

    public async onUserNamePress(event: Avatar$PressEvent): Promise<void> {
        const button = event.getSource();
        const view = this.getView();
        if (!view) {
            console.error('View is undefined');
            return;
        }
        if (!this.userPopover) {
            const userFragment = await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.UserInfoPopover',
                controller: this
            });
            this.userPopover = userFragment as ResponsivePopover;
            view.addDependent(this.userPopover);
            this.userPopover.openBy(button);
        }
        else {
            this.userPopover.openBy(button);
        }
    }

    public onTenantChanged(event: Menu$ItemSelectedEvent): void {
        const item = event.getParameter('item');
        if (item instanceof MenuItem) {
            const selectedTenant = item.getKey();
            const selectedTenantName = item.getText();
            this.twoWayModel.setProperty('/selectedTenant', selectedTenant);
            this.twoWayModel.setProperty('/selectedTenantName', selectedTenantName);
            this.api = Api.getInstance();
            Api.updateTenantId(selectedTenant || '');
            this.navigateToSelectedPage();
        }
    }

    private navigateToSelectedPage(): void {
        const selectedKey = this.twoWayModel.getProperty('/selectedKey') as string;
        const selectedTenant = this.twoWayModel.getProperty('/selectedTenant') as string;
        this.getRouter().navTo(selectedKey, {
            tenantId: selectedTenant
        });
    }
}
