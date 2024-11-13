import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import { KeyConfig } from 'kms/common/Types';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import Api from 'kms/services/Api.service';
import MessageBox from 'sap/m/MessageBox';
import Fragment from 'sap/ui/core/Fragment';
import ViewSettingsDialog from 'sap/m/ViewSettingsDialog';
interface KeyConfigPatchPayload {
    name: string;
}
export default class KeyConfigDetail extends BaseController {
    private readonly api: Api = new Api();
    private filterPopover: ViewSettingsDialog | undefined;
    private readonly oneWayModel = new JSONModel({
        keyConfig: {} as KeyConfig,
        keysCount: 0 as number,
        systemsCount: 0 as number,
        edit: false as boolean
    });
    private readonly viewSettingModel = new JSONModel({
        sortColumns: [] as object[],
        sortValue: 'createdOn' as string,
        sortDesc: true as boolean,
        currentTable: 'keys' as string,
    });
    private readonly twoWayModel = new JSONModel({
        keyConfig: {} as KeyConfig
    });
    private keyConfigId: string;

    public onInit(): void {
        super.onInit();
        this.getRouter().getRoute('keyConfigDetail').attachPatternMatched({}, (event: Route$PatternMatchedEvent) => this.onRouteMatched(event), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.twoWayModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.viewSettingModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.twoWayModel, 'twoWay');
        this.setModel(this.viewSettingModel, 'viewSettingModel');

    };
    private isUUIDValid(uuid: string): boolean {
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        return uuidRegex.test(uuid);
    }
    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        this.getView().setBusy(true);
        const routeArgs = event.getParameter('arguments') as { keyConfigId?: string };
        this.keyConfigId = routeArgs.keyConfigId;
        if (!this.isUUIDValid(this.keyConfigId)) {
            console.error('Key config id invalid');
            this.getRouter().navTo('keyConfigs');
            return;
        }
        this.setKeyConfigData();
    }
    private setKeyConfigData() {
        this.getKeyConfigData().then((keyConfigs) => {
            if (!keyConfigs) {
                return;
            }
            interface KeyConfigsResponse {
                data: KeyConfig[];
                count: number;
            }
            const keyConfigsResponse = keyConfigs as unknown as KeyConfigsResponse;
            const keyConfigsData = keyConfigsResponse.data;
            this.oneWayModel.setProperty('/keyConfig', keyConfigsData[0]);
            this.oneWayModel.setProperty('/keysCount', keyConfigsData[0]?.keys?.length);
            this.oneWayModel.setProperty('/systemsCount', keyConfigsData[0]?.systems?.length);
            this.twoWayModel.setProperty('/keyConfig', keyConfigsData[0]);
        }).catch((error) => {
            console.error('Error parsing key config', error);
        }).finally(() => {
            this.getView().setBusy(false);
        });
    }
    private async getKeyConfigData() {
        try {
            const keyConfigs = await this.api.get<KeyConfig[]>('keyConfig', { id: this.keyConfigId });
            return keyConfigs;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingKeyConfigDetails'));
        }
    }
    private async patchKeyConfigData(keyConfig: KeyConfigPatchPayload) {
        try {
            const keyConfigs = await this.api.patch<KeyConfigPatchPayload, KeyConfig>('keyConfig', keyConfig);
            return keyConfigs;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorPatchingKeyConfigDetails'));
        }
    }
    public onEditDetailsPress(): void {
        this.oneWayModel.setProperty('/edit', true);
    }
    public onCancelEditPress(): void {
        this.oneWayModel.setProperty('/edit', false);
    }
    public onSaveKeyConfigPress(): void {
        this.getView().setBusy(true);
        const keyConfig = this.twoWayModel.getProperty('/keyConfig') as KeyConfig;
        const payload = {
            id: keyConfig.id,
            name: keyConfig.name
        } as KeyConfigPatchPayload;

        this.patchKeyConfigData(payload).then(() => {
            this.setKeyConfigData();
            this.onCancelEditPress();
        }).catch((error) => {
            console.error('Error patching key config', error);
        }).finally(() => {
            this.getView().setBusy(false);
        });
    }
    public onTableSortApplyPress(): void {
        const currentTable = this.viewSettingModel.getProperty('/currentTable') as string;
        switch (currentTable) {
            case 'keys':
                this.onKeysTableSortApply();
                break;
            case 'systems':
                this.onSystemsTableSortApply();
                break;
            default:
                break;
        }
    }
    public onKeysTableSortApply(): void {
        //@TODO Implement sorting for keys table when API is ready
    }
    public onSystemsTableSortApply(): void {
        //@TODO Implement sorting for systems table when API is ready
    }
    public async onKeysTableSortPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();
        const columns = [
            { key: 'name', text: this.getText('name') },
            { key: 'createdOn', text: this.getText('createdOn') },
            { key: 'state', text: this.getText('state') }
        ];
        this.viewSettingModel.setProperty('/sortColumns', columns);
        this.viewSettingModel.setProperty('/currentTable', 'keys');
        if (!this.filterPopover) {
            await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.common.TableSorter',
                controller: this
            }).then((dialog) => {
                this.filterPopover = dialog as ViewSettingsDialog;
                this.filterPopover.addStyleClass('sapUiSizeCompact');
                this.filterPopover.setModel(component.getModel('i18n'), 'i18n');
                this.filterPopover.setModel(this.viewSettingModel, 'viewSettingModel');
                this.filterPopover.open();
            });
        } else {
            this.filterPopover.open();
        }
    }

}