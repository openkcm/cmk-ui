import BaseController from 'kms/controller/BaseController';
import BindingMode from 'sap/ui/model/BindingMode';
import JSONModel from 'sap/ui/model/json/JSONModel';
import Api from 'kms/services/Api.service';
import { Router$RouteMatchedEvent } from 'sap/ui/core/routing/Router';

/**
 * @namespace kms
 */
export default class Systems extends BaseController {
    private api: Api;

    private readonly oneWayModel = new JSONModel({});

    public onInit(): void {
        super.onInit();

        this.getRouter().attachRouteMatched(this.onRouteMatched.bind(this));
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    }

    public onRouteMatched(event: Router$RouteMatchedEvent): void {
        const routeName = event.getParameter('name');
        const routeArgs = event.getParameter('arguments') as { tenantId: string };
        this.api = Api.getInstance();
        this.tenantId = routeArgs?.tenantId;
        if (routeName && typeof routeName === 'string') {
            if (routeName === 'systems') {
                this.oneWayModel.setProperty('/layout', 'OneColumn');
            }
            else {
                this.oneWayModel.setProperty('/layout', 'TwoColumnsBeginExpanded');
            }
        }
    }
}
