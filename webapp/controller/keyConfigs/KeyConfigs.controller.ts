import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import Api from 'kms/services/Api.service';
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
import { Button$PressEvent } from 'sap/m/Button';
import { KeyConfig, Groups, KeystoreResponse } from 'kms/common/Types';
import MessageBox from 'sap/m/MessageBox';
import { showErrorMessage, getErrorCode, _isNameValid } from 'kms/common/Helpers';
import Fragment from 'sap/ui/core/Fragment';
import ViewSettingsDialog from 'sap/m/ViewSettingsDialog';
import Dialog from 'sap/m/Dialog';
import MessageToast from 'sap/m/MessageToast';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import { BYOKProviders, HYOKProviders } from 'kms/common/Enums';
import { AxiosError } from 'axios';
interface KeyConfigsResponse {
    value: KeyConfig[]
    count: number
}

interface GroupsResponse {
    value: Groups[]
    count: number
}
/**
 * @namespace kms
 */
export default class Keys extends BaseController {
    private api: Api;
    private readonly oneWayModel = new JSONModel({
        configs: [] as KeyConfig[],
        configsCount: 0 as number,
        hyokProviders: [] as HYOKProviders[]
    });

    private readonly viewSettingModel = new JSONModel({
        sortColumns: [] as object[],
        sortValue: 'createdOn' as string,
        sortDesc: true as boolean
    });

    private sortPopover: ViewSettingsDialog | undefined;
    private readonly createConfigModel = new JSONModel({});
    private configCreatePopover: Dialog | undefined;
    private skip: number;
    private top: number;
    private currentPage: number;
    private readonly paginationModel = new JSONModel({});

    public onInit(): void {
        super.onInit();
        this.skip = 0;
        this.top = 10;
        this.currentPage = 1;
        this.getRouter()?.getRoute('keyConfigs')?.attachPatternMatched({}, (event: Route$PatternMatchedEvent) => {
            this.onRouteMatched(event);
        }, this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.viewSettingModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.viewSettingModel, 'viewSettingModel');
        this.setModel(this.paginationModel, 'pagination');
    };

    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        this.resetPagination();
        const routeArgs = event.getParameter('arguments') as { tenantId: string };
        this.api = Api.getInstance();
        this.tenantId = routeArgs?.tenantId;
        this.setHyokProviders();
        this.setKeyConfigs().catch((error: unknown) => {
            console.error(error);
        });
    };

    private setHyokProviders(): void {
        // @TODO Fetch the HYOK providers from the API when available
        // For now, we are using a static list
        const hyokProviders = [
            HYOKProviders.AWS
        ];
        this.oneWayModel.setProperty('/hyokProviders', hyokProviders);
    }

    private async onNextPage(): Promise<void> {
        this.currentPage++;
        this.skip += 10;
        await this.setKeyConfigs();
    }

    private async onPreviousPage(): Promise<void> {
        this.currentPage--;
        this.skip -= 10;
        await this.setKeyConfigs();
    }

    private resetPagination(): void {
        this.currentPage = 1;
        this.skip = 0;
        this.paginationModel.setProperty('/currentPage', this.currentPage);
    }

    private async setKeyConfigs(): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            const keyConfigs = await this.api.get<KeyConfigsResponse>('keyConfigurations', { $top: this.top, $skip: this.skip, expandGroup: true });
            const keyConfigsData = keyConfigs?.value;
            if (keyConfigsData) {
                const keystoreSettings = await this.getkeystoreSettings();
                this.oneWayModel.setProperty('/keystoreSettings', keystoreSettings);
                this.oneWayModel.setProperty('/configs', keyConfigsData);
                this.oneWayModel.setProperty('/configsCount', keyConfigs?.count || 0);
                this.paginationModel.setProperty('/totalPages', Math.ceil((keyConfigs?.count ?? 0) / this.top));
                this.paginationModel.setProperty('/currentPage', this.currentPage);
            }
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingKeyConfigs'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    public onConfigPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource()?.getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
        const selectedConfig = this.oneWayModel.getProperty(path) as KeyConfig;
        const keyConfigId: string = selectedConfig.id;
        this.getRouter().navTo('keyConfigDetail', {
            tenantId: this.tenantId,
            keyConfigId: keyConfigId
        });
    };

    public async onKeyConfigDashboardSortPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();
        if (!view || !component) {
            console.error('View or component is undefined');
            return;
        }
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
        }
        else {
            this.sortPopover.open();
        }
    };

    public onKeyConfigDashboardCreateSAPKeyPress(event: Button$PressEvent, keyType: string, keySubtype?: HYOKProviders | BYOKProviders): void {
        const path = event.getSource()?.getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
        const selectedConfig = this.oneWayModel.getProperty(path) as KeyConfig;
        const keyConfigId: string = selectedConfig.id;
        this.getRouter().navTo('keyConfigDetail', {
            query: { createKey: true, keyType, keySubtype },
            tenantId: this.tenantId,
            keyConfigId: keyConfigId
        });
    }

    public onTargetConnectSystemPress(event: Button$PressEvent): void {
        const path = event.getSource()?.getBindingContext('oneWay')?.getPath();
        if (!path) {
            console.error('Binding context path is undefined');
            return;
        }
        const selectedConfig = this.oneWayModel.getProperty(path) as KeyConfig;
        const keyConfigId: string = selectedConfig.id;
        this.getRouter().navTo('keyConfigDetail', {
            query: { connectSystem: true },
            tenantId: this.tenantId,
            keyConfigId: keyConfigId
        });
    }

    public onTableSortApplyPress(): void {
        // @TODO Implement sorting for key config dashboard when API is ready
    };

    public async onCreateConfigPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();
        if (!view || !component) {
            console.error('View or component is undefined');
            return;
        }
        try {
            await this.getGroups();
            const groupsData: Groups[] = this.oneWayModel.getProperty('/groupsData') as Groups[] || [];

            if (groupsData.length === 0) {
                MessageBox.information(this.getText('noAdminGroupsMessage'), {
                    actions: [this.getText('manageGroups'), MessageBox.Action.CLOSE],
                    emphasizedAction: this.getText('manageGroups'),
                    onClose: (action: string | null) => {
                        if (action === this.getText('manageGroups')) {
                            this.getRouter().navTo('groups', {
                                tenantId: this.tenantId
                            });
                        }
                    }
                });
                return;
            }

            groupsData.unshift({ id: '', name: this.getText('selectAdminGroup'), groups: [], edit: false });
            this.createConfigModel.setProperty('/adminGroupList', groupsData);
        }
        catch (error) {
            console.error(error);
        }

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
        }
        else {
            this.configCreatePopover.open();
        }
    };

    private async getGroups(): Promise<void> {
        this.getView()?.setBusy(true);
        try {
            const groups = await this.api.get<GroupsResponse>('groups', { $top: this.top, $skip: this.skip });
            const groupsData = groups?.value;
            this.oneWayModel.setProperty('/groupsData', groupsData);
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingGroups'));
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    public async onConfigCreationCreatePress(): Promise<void> {
        interface KeyConfigPostPayload {
            name: string
            description: string
            adminGroupID: string
        }

        const name = this.createConfigModel.getProperty('/name') as string;
        const description = this.createConfigModel.getProperty('/description') as string;
        const adminGroup = this.createConfigModel.getProperty('/adminGroup') as string;
        const newConfig = {
            name: name,
            description: description,
            adminGroupID: adminGroup
        } as KeyConfigPostPayload;

        this.getView()?.setBusy(true);
        try {
            const keyConfig = await this.api.post<KeyConfig>('keyConfigurations', newConfig);
            MessageToast.show(this.getText('keyConfigCreated'));
            this.configCreatePopover?.close();
            this.configCreatePopover?.destroy();
            this.configCreatePopover = undefined;
            this.resetCreateConfigModel();
            this.getRouter().navTo('keyConfigDetail', {
                tenantId: this.tenantId,
                keyConfigId: keyConfig?.id
            });
            MessageToast.show(this.getText('keyConfigCreated'));
        }
        catch (error) {
            console.error(error);

            const errorCode: string = getErrorCode(error as AxiosError);
            let errorMessage: string;

            if (errorCode === this.Constants.API_ERROR_CODES.UNIQUE_ERROR) {
                errorMessage = this.getText('errorDuplicateKeyConfig');
            }
            else {
                errorMessage = this.getText('errorCreatingKeyConfig');
            }
            showErrorMessage(error as AxiosError, errorMessage);
        }
        finally {
            this.getView()?.setBusy(false);
        }
    };

    public onConfigCreationNameChange(): void {
        const name = this.createConfigModel.getProperty('/name') as string;
        const adminGroup = this.createConfigModel.getProperty('/adminGroup') as string;
        if (!_isNameValid(name)) {
            this.createConfigModel.setProperty('/nameValueState', 'Error');
            this.createConfigModel.setProperty('/nameValueStateText', this.getText('nameRequired'));
            this.createConfigModel.setProperty('/createButtonEnabled', false);
        }
        else {
            this.createConfigModel.setProperty('/nameValueState', 'None');
            this.createConfigModel.setProperty('/nameValueStateText', '');
            this.createConfigModel.setProperty('/createButtonEnabled', this._isAdminGroupValid(adminGroup));
        }
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
        }
        else {
            this.createConfigModel.setProperty('/adminGroupValueState', 'None');
            this.createConfigModel.setProperty('/adminGroupValueStateText', '');
            this.createConfigModel.setProperty('/createButtonEnabled', _isNameValid(name));
        }
    };

    public resetCreateConfigModel(): void {
        this.createConfigModel.setData({
            name: '' as string,
            description: '' as string,
            adminGroup: '' as string,
            adminGroupList: [{ id: '', name: this.getText('selectAdminGroup') }] as Groups[], // Add default group
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

    private async getkeystoreSettings(): Promise<KeystoreResponse | undefined> {
        try {
            return await this.api.get<KeystoreResponse>('tenantConfigurations/keystores');
        }
        catch (error) {
            console.error(error);
            showErrorMessage(error as AxiosError, this.getText('errorFetchingKeystoreDetails'));
        }
    }
}
