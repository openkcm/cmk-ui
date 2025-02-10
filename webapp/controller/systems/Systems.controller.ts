import BaseController from "kms/controller/BaseController";
import BindingMode from "sap/ui/model/BindingMode";
import JSONModel from "sap/ui/model/json/JSONModel";
import Api from "kms/services/Api.service";
import { System } from "kms/common/Types";
import MessageBox from "sap/m/MessageBox";
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
interface SystemsResponse {
    value: Systems[];
    count: number;
}
export default class Systems extends BaseController {
    private readonly api: Api = new Api();

    private readonly oneWayModel = new JSONModel({
        systems: [] as System[],
        systemsCount: 0 as number
    });

    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('systems').attachPatternMatched({}, () => this.onRouteMatched(), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    };
    public onRouteMatched(): void {
        this.getSystems().catch((error) => {
            console.error(error);
        });
    };

    private async getSystems(): Promise<void> {
        this.getView().setBusy(true);
        try {
            const systems = await this.api.get<SystemsResponse>('systems', {});
            if (!systems) {
                return;
            };
            this.oneWayModel.setProperty('/systems', systems.value);
            this.oneWayModel.setProperty('/systemsCount', systems.count || 0);
        } catch (error) {
            console.error('Error fetching systems', error);
            MessageBox.error(this.getText('errorFetchingSystems'));
        } finally {
            this.getView().setBusy(false);
        }
    };

    public onSystemPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        const systemName = selectedSystem.name;
        this.getRouter().navTo('systemsDetail', {
            systemID: systemName
        });
    };
}