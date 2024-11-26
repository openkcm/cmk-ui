import BaseController from "kms/controller/BaseController";
import BindingMode from "sap/ui/model/BindingMode";
import JSONModel from "sap/ui/model/json/JSONModel";
import Api from "kms/services/Api.service";
import Event from "sap/ui/base/Event";

export default class Systems extends BaseController {
    private readonly api: Api = new Api();

    private readonly oneWayModel = new JSONModel({});

    public onInit(): void {
        super.onInit();

        this.getRouter().attachRouteMatched(this.onRouteMatched.bind(this));
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    }

    public onRouteMatched(event: Event): void {
        const routeName = event.getParameter('name');
        if (routeName && typeof routeName === 'string') {
            if (routeName === 'systems') {
                this.oneWayModel.setProperty('/layout', 'OneColumn');
            } else {
                this.oneWayModel.setProperty('/layout', 'TwoColumnsMidExpanded');
            }
        }
    }
}