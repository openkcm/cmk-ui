import BaseController from 'kms/controller/BaseController';
import BindingMode from 'sap/ui/model/BindingMode';
import JSONModel from 'sap/ui/model/json/JSONModel';
import { Router$RouteMatchedEvent } from 'sap/ui/core/routing/Router';

/**
 * @namespace kms
 */
export default class GroupsLayout extends BaseController {
    private readonly oneWayModel = new JSONModel({});

    public onInit(): void {
        super.onInit();
        this.getRouter().attachRouteMatched(this.onRouteMatched.bind(this));
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    }

    public onRouteMatched(event: Router$RouteMatchedEvent): void {
        const routeName = event.getParameter('name');
        if (routeName && typeof routeName === 'string') {
            if (routeName === 'groups') {
                this.oneWayModel.setProperty('/layout', 'OneColumn');
            }
            else {
                this.oneWayModel.setProperty('/layout', 'TwoColumnsBeginExpanded');
            }
        }
    }
}
