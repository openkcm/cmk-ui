import BaseController from './BaseController';
import Fragment from 'sap/ui/core/Fragment';
import JSONModel from 'sap/ui/model/json/JSONModel';
import ResponsivePopover from 'sap/m/ResponsivePopover';
import { NavigationList$ItemSelectEvent } from 'sap/tnt/NavigationList';
import { Avatar$PressEvent } from 'sap/m/Avatar';
import { Router$RouteMatchedEvent } from 'sap/ui/core/routing/Router';
import ToolPage from 'sap/tnt/ToolPage';
import { Menu$ItemSelectedEvent } from 'sap/m/Menu';
import Api from 'kms/services/Api.service';
import MessageBox from 'sap/m/MessageBox';


interface TenantsResponse {
    value: { id: string; name?: string }[];
    count: number;
}

export default class App extends BaseController {
    private userPopover: ResponsivePopover | undefined;
    private api: Api;
    private skip: number;
    private top: number;
    private readonly oneWayModel = new JSONModel(
        {
            tenants: [
                {
                    id: 'tenant1',
                },
                {
                    id: 'tenant2',
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
        super.onInit();

        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.twoWayModel, 'twoWay');
        this.twoWayModel.setProperty('/selectedKey', 'keyConfigs');

        this.api = new Api('');
        this.setTenant().catch((error) => {
            console.error(error);
        });

        if (window.location.hash === '') {
            this.getRouter().navTo('keyConfigs', {
                tenantId: this.twoWayModel.getProperty('/selectedTenant') as string
            });
        }
        this.toolPage = this.byId('kmsApp') as ToolPage;
        this.getRouter().attachRouteMatched(this.onRouteChange.bind(this));
    }

    public onRouteChange(event: Router$RouteMatchedEvent): void {
        const routeName = event.getParameter('name');
        const routeArgs = event.getParameter('arguments') as { tenantId: string };
        this.twoWayModel.setProperty('/selectedTenant', routeArgs?.tenantId);

        const tenants = this.oneWayModel.getProperty('/tenants') as { id: string; name: string }[];
        const selectedTenant = tenants.find(tenant => tenant.id === routeArgs?.tenantId);
        this.twoWayModel.setProperty('/selectedTenantName', selectedTenant ? selectedTenant.name : '');

        if (routeName === 'keyConfigs') {
            this.toolPage.setSideExpanded(true);
        } else {
            this.toolPage.setSideExpanded(false);
        }

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

    public async setTenant(): Promise<void> {
        this.getView().setBusy(true);
        try {
            const tenants = await this.api.get('sys/tenants', { $top: this.top, $skip: this.skip });
            const tenantsData = (tenants as TenantsResponse).value;
            this.oneWayModel.setProperty('/tenants', tenantsData);
            this.twoWayModel.setProperty('/selectedTenantName', tenantsData && tenantsData.length > 0 ? tenantsData[0].id : '');
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingKeyConfigs'));
        } finally {
            this.getView().setBusy(false);
        }
    }

    public onNavigationClick(): void {
        this.navigateToSelectedPage()
    }

    public onSideNavButtonPress(): void {
        const toolPage = this.byId('kmsApp') as ToolPage;
        toolPage.setSideExpanded(!toolPage.getSideExpanded());
    }

    public async onUserNamePress(event: Avatar$PressEvent): Promise<void> {
        const button = event.getSource();
        const view = this.getView();

        if (!this.userPopover) {
            const userFragment = await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.UserInfoPopover',
                controller: this
            });
            this.userPopover = userFragment as ResponsivePopover;
            view.addDependent(this.userPopover);
            this.userPopover.openBy(button);
        } else {
            this.userPopover.openBy(button);
        }
    }
    public onUserInfoListSelect(event: NavigationList$ItemSelectEvent): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const item = event.getParameter('item').getKey();
    }
    public onTenantChanged(event: Menu$ItemSelectedEvent): void {
        const selectedTenant = event.getParameter('item').getKey();
        const selectedTenantName = event.getParameter('item').getText();
        this.twoWayModel.setProperty('/selectedTenant', selectedTenant);
        this.twoWayModel.setProperty('/selectedTenantName', selectedTenantName);
        this.navigateToSelectedPage();
    }
    private navigateToSelectedPage(): void {
        const selectedKey = this.twoWayModel.getProperty('/selectedKey') as string;
        const selectedTenant = this.twoWayModel.getProperty('/selectedTenant') as string;
        this.getRouter().navTo(selectedKey, {
            tenantId: selectedTenant
        });
    }
}