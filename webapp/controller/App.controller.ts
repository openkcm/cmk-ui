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
import { RoleBasedAccessData, UserData } from 'kms/common/Types';
import { UserRoles } from 'kms/common/Enums';
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
            selectedTenant: '',
            userInitials: '',
            userName: '',
            userEmail: ''
        }
    );

    private toolPage: ToolPage | undefined;

    public onInit(): void {
        super.onInit();
        const view = this.getView();
        if (view) {
            view.setBusy(true);
            view.setBusyIndicatorDelay(0);
        }

        const component = this.getOwnerComponent() as Component & { getInitialSetupFinishedPromise: () => Promise<void> };

        component.getInitialSetupFinishedPromise().then(() => {
            this.toolPage = this.byId('kmsApp') as ToolPage;

            this.setModel(this.oneWayModel, 'oneWay');
            this.setModel(this.twoWayModel, 'twoWay');

            this.api = Api.getInstance();
            const userInfoModel = component?.getModel('userInfo');
            let userInfo: UserData | undefined;
            if (userInfoModel && userInfoModel instanceof JSONModel) {
                userInfo = userInfoModel.getData() as UserData;
            }
            if (userInfo) {
                this.setUserInitials(userInfo);
                this.setUserData(userInfo);
            }
            const selectedTenantModel = component?.getModel('selectedTenant');
            const selectedTenantId = selectedTenantModel?.getProperty('/selectedTenant') as string;
            this.twoWayModel.setProperty('/selectedTenant', selectedTenantId);
            this.twoWayModel.setProperty('/selectedTenantName', selectedTenantModel?.getProperty('/selectedTenantName'));
            this.twoWayModel.setProperty('/defaulHomePage', this.getDefaulHomePage(userInfo));

            // Setup the listener first
            this.getRouter().attachRouteMatched(this.onRouteChange.bind(this));

            // Next start the router, This triggers the URL matching and loads the sub-views
            // If a route matches immediately, onRouteChange will trigger correctly
            this.getRouter().initialize();
            this.handleDefaultNavigation(selectedTenantId);
            if (view) {
                view.setBusy(false);
            }
        }).catch((error: unknown) => {
            console.error('Setup failed:', error);
            if (view) {
                view.setBusy(false);
            }
        });
    }

    private handleDefaultNavigation(selectedTenantId: string): void {
        const currentHash = window.location.hash;
        const hashParts = currentHash.slice(1).split('/');
        const routeName = hashParts[2];
        const defaulHomePage = this.twoWayModel.getProperty('/defaulHomePage') as string;
        // If no specific route is provided, navigate to the default home page

        if (currentHash === '' || routeName === '' || routeName === undefined) {
            this.getRouter().navTo(defaulHomePage, {
                tenantId: selectedTenantId
            });
        }
    }

    private setUserInitials(userInfo: UserData): void {
        let initials = '';
        const firstName = userInfo?.givenName?.trim() || '';
        const lastName = userInfo?.familyName?.trim() || '';

        if (firstName && lastName) {
            initials = firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase();
        }
        else if (firstName) {
            initials = firstName.substring(0, 2).toUpperCase();
        }
        else if (lastName) {
            initials = lastName.substring(0, 2).toUpperCase();
        }
        else {
            initials = 'KM';
        }

        this.twoWayModel.setProperty('/userInitials', initials);
    }

    private setUserData(userInfo: UserData): void {
        const firstName = userInfo.givenName?.trim() || '';
        const lastName = userInfo.familyName?.trim() || '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';

        this.twoWayModel.setProperty('/userName', fullName);
        this.twoWayModel.setProperty('/userEmail', userInfo.email || '');
    }

    public onRouteChange(event: Router$RouteMatchedEvent): void {
        this.getView()?.setBusy(true);
        const routeName = event.getParameter('name');
        if (!routeName) {
            return;
        }
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
        const defaultHomePage = this.twoWayModel.getProperty('/defaulHomePage') as string;
        const navigateToDefaultHomePage = (): void => {
            this.twoWayModel.setProperty('/selectedKey', defaultHomePage);
            this.navigateToSelectedPage();
        };
        const component = this.getOwnerComponent() as Component;
        const roleBasedAccessModel = component.getModel('roleBasedAccess') as JSONModel;

        // Safety check: ensure model exists before accessing data
        if (!roleBasedAccessModel) {
            this.getView()?.setBusy(false);
            return;
        }

        const roleBasedAccessData = roleBasedAccessModel.getData() as RoleBasedAccessData;
        switch (routeName) {
            case 'keyConfigs':
            case 'keyConfigDetail':
            case 'keyConfigDetailPanel':

                if (!roleBasedAccessData?.keyConfig.canView) {
                    navigateToDefaultHomePage();
                }
                else {
                    this.twoWayModel.setProperty('/selectedKey', 'keyConfigs');
                }
                break;
            case 'systems':
            case 'systemsDetail':
                if (!roleBasedAccessData?.systems.canView) {
                    navigateToDefaultHomePage();
                }
                else {
                    this.twoWayModel.setProperty('/selectedKey', 'systems');
                }
                break;
            case 'tasks':
            case 'tasksDetail':
                if (!roleBasedAccessData?.tasks.canView) {
                    navigateToDefaultHomePage();
                }
                else {
                    this.twoWayModel.setProperty('/selectedKey', 'tasks');
                }
                break;
            case 'groups':
            case 'groupDetail':
                if (!roleBasedAccessData?.userGroups.canView) {
                    navigateToDefaultHomePage();
                }
                else {
                    this.twoWayModel.setProperty('/selectedKey', 'groups');
                }

                break;
            case 'settings':
                this.twoWayModel.setProperty('/selectedKey', 'settings');
                break;
            default:
                this.twoWayModel.setProperty('/selectedKey', defaultHomePage);
        }
        this.getView()?.setBusy(false);
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

    private getDefaulHomePage(userInfo: UserData | undefined): string {
        const userRole = userInfo?.role;
        let defaultHomePage;
        switch (userRole) {
            case UserRoles.KEY_ADMINISTRATOR:
            case UserRoles.TENANT_AUDITOR:
                defaultHomePage = 'keyConfigs';
                break;
            case UserRoles.TENANT_ADMINISTRATOR:
                defaultHomePage = 'groups';
                break;
            default:
                defaultHomePage = 'keyConfigs';
        }
        return defaultHomePage;
    }
}
