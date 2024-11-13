import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import Api from 'kms/services/Api.service';
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
import { KeyConfig } from 'kms/common/Types';
import MessageBox from 'sap/m/MessageBox';
import Fragment from 'sap/ui/core/Fragment';
import ViewSettingsDialog from 'sap/m/ViewSettingsDialog';
export default class Keys extends BaseController {
    private readonly api: Api = new Api();
    private readonly oneWayModel = new JSONModel({
        configs: [] as KeyConfig[],
        configsCount: 0 as number
    });
    private readonly viewSettingModel = new JSONModel({
        sortColumns: [] as object[],
        sortValue: 'createdOn' as string,
        sortDesc: true as boolean
    });
    private filterPopover: ViewSettingsDialog | undefined;

    public onInit(): void {
        super.onInit();
        this.getRouter().attachRouteMatched(this.onRouteMatched.bind(this));
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.viewSettingModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.viewSettingModel, 'viewSettingModel');
    };

    public onRouteMatched(): void {
        this.setKeyConfigs();
    };

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
    };

    public onConfigPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedConfig = this.oneWayModel.getProperty(path) as KeyConfig;
        const keyConfigId: string = selectedConfig.id;
        this.getRouter().navTo('keyConfigDetail', {
            keyConfigId: keyConfigId
        });
    };

    public async onKeyConfigDashboardSortPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();
        const columns = [
            { key: 'name', text: this.getText('name') },
            { key: 'createdOn', text: this.getText('createdOn') },
            { key: 'createdBy', text: this.getText('createdBy') }
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
    };

    public onTableSortApplyPress(): void {
        //@TODO Implement sorting for key config dashboard when API is ready
    };
}