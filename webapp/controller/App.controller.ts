import BaseController from './BaseController';
import Fragment from 'sap/ui/core/Fragment';
import JSONModel from 'sap/ui/model/json/JSONModel';
import ResponsivePopover from 'sap/m/ResponsivePopover';
import { NavigationList$ItemSelectEvent } from 'sap/tnt/NavigationList';
import { Avatar$PressEvent } from 'sap/m/Avatar';
import { Router$RouteMatchedEvent } from 'sap/ui/core/routing/Router';
import ToolPage from 'sap/tnt/ToolPage';

export default class App extends BaseController {
    private userPopover: ResponsivePopover | undefined;
    private readonly oneWayModel = new JSONModel(
        {
            selectedKey: ''
        }
    );

    public onInit(): void {
        super.onInit();
        this.setModel(this.oneWayModel, 'oneWay');
        this.oneWayModel.setProperty('/selectedKey', 'home');
        this.getRouter().attachRouteMatched(this.onRouteChange.bind(this));
    }

    public onRouteChange(event: Router$RouteMatchedEvent): void {
        const routeName = event.getParameter('name');
        switch (routeName) {
            case 'home':
                this.oneWayModel.setProperty('/selectedKey', 'home');
                break;
            case 'keyConfigs':
            case 'keyConfigDetail':
                this.oneWayModel.setProperty('/selectedKey', 'keyConfigs');
                break;
            case 'systems':
            case 'systemsDetail':
                this.oneWayModel.setProperty('/selectedKey', 'systems');
                break;
            case 'tasks':
                this.oneWayModel.setProperty('/selectedKey', 'tasks');
                break;
            case 'users':
                this.oneWayModel.setProperty('/selectedKey', 'users');
                break;
            case 'settings':
                this.oneWayModel.setProperty('/selectedKey', 'settings');
                break;
            default:
                this.oneWayModel.setProperty('/selectedKey', 'home');
        }
    }

    public onSideNavButtonPress(): void {
        const toolPage = this.byId('kmsApp') as ToolPage;
        toolPage.setSideExpanded(!toolPage.getSideExpanded());
    }

    public async onUserNamePress(event: Avatar$PressEvent): Promise<void> {
        const button = event.getSource();
        const view = this.getView();

        if (!this.userPopover) {
            await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.UserInfoPopover',
                controller: this
            }).then((popover) => {
                this.userPopover = popover as ResponsivePopover;
                view.addDependent(this.userPopover);
                this.userPopover.openBy(button);
            });
        } else {
            this.userPopover.openBy(button);
        }
    }
    public onUserInfoListSelect(event: NavigationList$ItemSelectEvent): void {
        const item = event.getParameter('item').getKey();
        console.log(item);
    }
}