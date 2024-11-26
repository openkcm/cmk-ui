import BaseController from "kms/controller/BaseController";
import BindingMode from "sap/ui/model/BindingMode";
import JSONModel from "sap/ui/model/json/JSONModel";
import Api from "kms/services/Api.service";
import { System } from "kms/common/Types";
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import MessageBox from "sap/m/MessageBox";

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
        const routeArgs = event.getParameter('arguments') as { systemID?: string};
        this.name = routeArgs.systemID;

        this.oneWayModel.setProperty('/name', this.name);
        this.setSystems();
    }

    private setSystems(): void {
        this.getView().setBusy(true);
        this.fetchSystems().then((systems) => {
            if (!systems) {
                return;
            }
            this.oneWayModel.setProperty('/systems', systems);
        }).catch((error) => {
            console.error('Error parsing systems', error);
        }).finally(() => {
            this.getView().setBusy(false);
        });
    }

    private async fetchSystems(): Promise<System[] | undefined> {
        try {
            const systems = await this.api.get<System[]>('systems', { id: this.name });
            return systems;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingSystems'));
        }
    }

    public onCancel(): void {
        this.getRouter().navTo('systems');
    }
}