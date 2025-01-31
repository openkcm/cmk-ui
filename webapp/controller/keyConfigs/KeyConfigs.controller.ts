import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import Api from 'kms/services/Api.service';
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
import { Button$PressEvent } from 'sap/m/Button';
import { KeyConfig } from 'kms/common/Types';
import MessageBox from 'sap/m/MessageBox';
import Fragment from 'sap/ui/core/Fragment';
import ViewSettingsDialog from 'sap/m/ViewSettingsDialog';
import Dialog from 'sap/m/Dialog';
import MessageToast from 'sap/m/MessageToast';
interface KeyConfigsResponse {
    value: KeyConfig[];
    count: number;
}
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
    private sortPopover: ViewSettingsDialog | undefined;
    private readonly createConfigModel = new JSONModel({});
    private configCreatePopover: Dialog | undefined;

    public onInit(): void {
        super.onInit();
        this.getRouter().attachRouteMatched(this.onRouteMatched.bind(this));
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.viewSettingModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.viewSettingModel, 'viewSettingModel');
    };

    public onRouteMatched(): void {
        this.setKeyConfigs().catch((error) => {
            console.error(error);
        });
    };

    private async setKeyConfigs(): Promise<void> {
        this.getView().setBusy(true);
        try {
            const keyConfigs = await this.api.get<KeyConfigsResponse>('keyConfigurations', {});
            const keyConfigsData = keyConfigs.value;
            this.oneWayModel.setProperty('/configs', keyConfigsData);
            this.oneWayModel.setProperty('/configsCount', keyConfigs.count || 0);
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingKeyConfigs'));
        } finally {
            this.getView().setBusy(false);
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
        if (!this.sortPopover) {
            this.sortPopover = await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.common.TableSorter',
                controller: this
            }) as ViewSettingsDialog;
            this.sortPopover.addStyleClass('sapUiSizeCompact');
            this.sortPopover.setModel(component.getModel('i18n'), 'i18n');
            this.sortPopover.setModel(this.viewSettingModel, 'viewSettingModel');
            this.sortPopover.open();
        } else {
            this.sortPopover.open();
        }
    };
    public onKeyConfigDashboardCreateSAPKeyPress(event: Button$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedConfig = this.oneWayModel.getProperty(path) as KeyConfig;
        const keyConfigId: string = selectedConfig.id;
        this.getRouter().navTo('keyConfigDetail', {
            query: { createKey: true },
            keyConfigId: keyConfigId
        });
    }
    public onTableSortApplyPress(): void {
        //@TODO Implement sorting for key config dashboard when API is ready
    };

    public async onCreateConfigPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();
        if (!this.configCreatePopover) {
            this.configCreatePopover = await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.keyConfigs.CreateConfig',
                controller: this
            }) as Dialog;
            this.configCreatePopover.addStyleClass('sapUiSizeCompact');
            this.configCreatePopover.setModel(component.getModel('i18n'), 'i18n');
            this.configCreatePopover.setModel(this.createConfigModel, 'model');
            this.resetCreateConfigModel();
            this.configCreatePopover.open();
        } else {
            this.configCreatePopover.open();
        }
    };

    public async onConfigCreationCreatePress(): Promise<void> {
        interface KeyConfigPostPayload {
            name: string;
            description: string;
            adminGroupID: string;
        }

        const name = this.createConfigModel.getProperty('/name') as string;
        const description = this.createConfigModel.getProperty('/description') as string;
        // @TODO Temporary until backend implements user management
        // const adminGroup = this.createConfigModel.getProperty('/adminGroup') as string;
        const newConfig = {
            name: name,
            description: description,
            adminGroupID: '9e04db3d-059d-49bf-9356-b9bc36453f99'
        } as KeyConfigPostPayload;

        this.getView().setBusy(true);
        try {
            const keyConfig = await this.api.post<KeyConfigPostPayload, KeyConfig>('keyConfigurations', newConfig);
            MessageToast.show(this.getText('keyConfigCreated'));
            this.configCreatePopover?.close();
            this.configCreatePopover?.destroy();
            this.configCreatePopover = undefined;
            this.resetCreateConfigModel();
            this.getRouter().navTo('keyConfigDetail', {
                keyConfigId: keyConfig?.id
            });
            MessageToast.show(this.getText('keyConfigCreated'));
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorCreatingKeyConfig'));
        } finally {
            this.getView().setBusy(false);
        }
    };

    public onConfigCreationNameChange(): void {
        const name = this.createConfigModel.getProperty('/name') as string;
        const adminGroup = this.createConfigModel.getProperty('/adminGroup') as string;
        if (!this._isNameValid(name)) {
            this.createConfigModel.setProperty('/nameValueState', 'Error');
            this.createConfigModel.setProperty('/nameValueStateText', this.getText('nameRequired'));
            this.createConfigModel.setProperty('/createButtonEnabled', false);
        } else {
            this.createConfigModel.setProperty('/nameValueState', 'None');
            this.createConfigModel.setProperty('/nameValueStateText', '');
            this.createConfigModel.setProperty('/createButtonEnabled', this._isAdminGroupValid(adminGroup));
        }
    };

    public _isNameValid(name: string): boolean {
        const nameRegex = /^.{3,}$/;
        if (!name || !nameRegex.test(name)) {
            return false;
        }
        return true;
    };

    public _isAdminGroupValid(adminGroup: string): boolean {
        const adminGroupRegex = /^[a-zA-Z0-9-_]+$/;
        if (!adminGroup || !adminGroupRegex.test(adminGroup)) {
            return false;
        }
        return true;
    };

    public onConfigCreationAdminGroupChange(): void {
        const adminGroup = this.createConfigModel.getProperty('/adminGroup') as string;
        const name = this.createConfigModel.getProperty('/name') as string;
        if (!this._isAdminGroupValid(adminGroup)) {
            this.createConfigModel.setProperty('/adminGroupValueState', 'Error');
            this.createConfigModel.setProperty('/adminGroupValueStateText', this.getText('adminGroupRequired'));
            this.createConfigModel.setProperty('/createButtonEnabled', false);
        } else {
            this.createConfigModel.setProperty('/adminGroupValueState', 'None');
            this.createConfigModel.setProperty('/adminGroupValueStateText', '');
            this.createConfigModel.setProperty('/createButtonEnabled', this._isNameValid(name));
        }
    };

    public resetCreateConfigModel(): void {
        this.createConfigModel.setData({
            name: '' as string,
            description: '' as string,
            adminGroup: '' as string,
            adminGroupList: [
                {
                    key: '',
                    text: this.getText('selectAdminGroup')
                },
                {
                    key: 'adminGroup1',
                    text: 'Admin Group 1'
                },
                {
                    key: 'adminGroup2',
                    text: 'Admin Group 2'
                }
            ] as object[],
            createButtonEnabled: false as boolean,
            nameValueState: 'None' as string,
            nameValueStateText: '' as string,
            adminGroupValueState: 'None' as string,
            adminGroupValueStateText: '' as string
        }, true);
    };

    public onConfigCreationCancelPress(): void {
        MessageBox.warning(this.getText('confirmCancelConfigCreation'), {
            styleClass: 'sapUiSizeCompact',
            emphasizedAction: MessageBox.Action.NO,
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    this.configCreatePopover?.close();
                    this.configCreatePopover?.destroy();
                    this.configCreatePopover = undefined;
                    this.resetCreateConfigModel();
                }
            }
        });
    };
}