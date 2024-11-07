import BaseController from "kms/controller/BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import BindingMode from "sap/ui/model/BindingMode";
import Api from "kms/services/Api.service";
import { ListItemBase$PressEvent } from "sap/m/ListItemBase";
import { KeyConfig } from "kms/common/Types";
import MessageBox from "sap/m/MessageBox";

export default class Keys extends BaseController {
    private readonly api: Api = new Api();

    private readonly oneWayModel = new JSONModel({
        configs: [] as KeyConfig[],
        configsCount: 0 as number
    });

    public onInit(): void {
        super.onInit();
        this.getRouter().attachRouteMatched(this.onRouteMatched.bind(this));
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(this.oneWayModel, 'oneWay');
    };
    public onRouteMatched(): void {
        this.setKeyConfigs();
    }
    private setKeyConfigs(): void {
        this.getView().setBusy(true);
        this.fetchKeyConfigs().then((keyConfigs) => {
            if (!keyConfigs) {
                return;
            };
            interface KeyConfigsResponse {
                data: KeyConfig[];
                count: number;
            }
            const keyConfigsResponse = keyConfigs as unknown as KeyConfigsResponse;
            const keyConfigsData = keyConfigsResponse.data;
            this.oneWayModel.setProperty('/configs', keyConfigsData);
            this.oneWayModel.setProperty('/configsCount', keyConfigsResponse.count || 0);
        }).catch((error) => {
            console.error('Error parsing key configs', error);
        }).finally(() => {
            this.getView().setBusy(false);
        });
    };
    private async fetchKeyConfigs() {
        try {
            const keyConfigs = await this.api.get<KeyConfig[]>('keyConfig', {});
            return keyConfigs;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingKeyConfigs'));
        }
    }

    public onConfigPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedConfig = this.oneWayModel.getProperty(path) as KeyConfig;
        const keyConfigId: string = selectedConfig.id;
        this.getRouter().navTo('keysDetail', {
            keyConfigId: keyConfigId
        });
    };
}