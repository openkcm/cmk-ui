import BaseController from "kms/controller/BaseController";
import BindingMode from "sap/ui/model/BindingMode";
import JSONModel from "sap/ui/model/json/JSONModel";
import Api from "kms/services/Api.service";
import { System } from "kms/common/Types";
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';

export default class Systems extends BaseController {
    private readonly api: Api = new Api();

    private readonly oneWayModel = new JSONModel({
        systems: [] as System[],
        name: '' as string
    });
    private name: string;


    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('systemsDetail').attachPatternMatched({}, (event: Route$PatternMatchedEvent) => this.onRouteMatched(event), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    }

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        const routeArgs = event.getParameter('arguments') as { systemID?: string };
        this.name = routeArgs.systemID;

        this.oneWayModel.setProperty('/name', this.name);
    }

    public onCancel(): void {
        this.getRouter().navTo('systems');
    }
}