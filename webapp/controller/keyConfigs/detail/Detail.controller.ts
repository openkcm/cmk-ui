import BaseController from 'kms/controller/BaseController';
import JSONModel from 'sap/ui/model/json/JSONModel';
import BindingMode from 'sap/ui/model/BindingMode';
import { KeyConfig, Key, System } from 'kms/common/Types';
import { Route$PatternMatchedEvent } from 'sap/ui/core/routing/Route';
import Api from 'kms/services/Api.service';
import MessageBox from 'sap/m/MessageBox';
import Fragment from 'sap/ui/core/Fragment';
import ViewSettingsDialog from 'sap/m/ViewSettingsDialog';
import Dialog from 'sap/m/Dialog';
import NavContainer from 'sap/m/NavContainer';
import Wizard from 'sap/m/Wizard';
import Page from 'sap/m/Page';
import MessageToast from 'sap/m/MessageToast';
import { ListItemBase$PressEvent } from 'sap/m/ListItemBase';
import { isUUIDValid, copyToClipboard } from 'kms/common/Helpers';
import EventBus from 'sap/ui/core/EventBus';
import { Button$PressEvent } from 'sap/m/Button';
import Filter from 'sap/ui/model/Filter';
import FilterOperator from 'sap/ui/model/FilterOperator';
import { SelectDialog$ConfirmEvent, SelectDialog$LiveChangeEvent } from 'sap/m/SelectDialog';
import ListBinding from 'sap/ui/model/ListBinding';
import Context from 'sap/ui/model/Context';
interface KeyConfigPatchPayload {
    name: string;
}
interface KeyResponse {
    value: Key[] | undefined;
    count: number | undefined;
}

interface SystemsResponse {
    value: System[] | undefined;
    count: number | undefined;
}
interface KeyPatchPayload {
    name: string;
    description: string;
    enabled: boolean;
}
export default class KeyConfigDetail extends BaseController {
    private readonly api: Api = new Api();
    private filterPopover: ViewSettingsDialog | undefined;
    private readonly oneWayModel = new JSONModel({
        keyConfig: {} as KeyConfig,
        keysCount: 0 as number,
        systemsCount: 0 as number,
        edit: false as boolean,
        keys: [] as Key[],
        systems: [] as System[],
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
    private readonly keyCreationModel = new JSONModel({});
    private readonly connectSystemModel = new JSONModel({});
    private keyCreatePopover: Dialog | undefined;
    private connectSystemPopover: Dialog | undefined;
    private keyCreationNavContainer: NavContainer | undefined;
    private keyCreationWizard: Wizard | undefined;
    private keyCreationWizardPage: Page | undefined;
    private keyCreationReviewPage: Page | undefined;
    private eventBus = EventBus.getInstance();

    public onInit(): void {
        super.onInit();
        this.eventBus.subscribe('keys', 'loadKeyConfigDetails', (channelId, eventId, data) => this.onKeyDetailRouteEventTriggered(channelId, eventId, data as { keyConfigId: string }), this);
        this.getRouter().getRoute('keyConfigDetail').attachPatternMatched({}, (event: Route$PatternMatchedEvent) => this.onRouteMatched(event), this);
        this.oneWayModel.setDefaultBindingMode(BindingMode.OneWay);
        this.twoWayModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.viewSettingModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.keyCreationModel.setDefaultBindingMode(BindingMode.TwoWay);
        this.setModel(this.oneWayModel, 'oneWay');
        this.setModel(this.twoWayModel, 'twoWay');
        this.setModel(this.viewSettingModel, 'viewSettingModel');
        this.setModel(this.keyCreationModel, 'keyCreationModel');
    };
    public onKeyDetailRouteEventTriggered(channelId: string, eventId: string, data: { keyConfigId: string }): void {
        if (channelId === 'keys' && eventId === 'loadKeyConfigDetails') {
            this.keyConfigId = data.keyConfigId;
            this.getKeyConfigData().catch((error) => {
                console.error(error);
            });
        }
    }
    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        this.getView().setBusy(true);
        const routeArgs = event.getParameter('arguments') as { keyConfigId?: string, '?query': { createKey?: string } };
        const queryParams = routeArgs['?query'] as { createKey?: string };
        this.keyConfigId = routeArgs.keyConfigId;

        if (!isUUIDValid(this.keyConfigId)) {
            console.error('Key config id invalid');
            this.getRouter().navTo('keyConfigs');
            return;
        }
        this.getKeyConfigData().catch((error) => {
            console.error(error);
        });

        if (queryParams?.createKey === 'true') {
            this.getView().setBusy(true);
            this.handleCreateKeyRoute().catch((error) => {
                console.error(error);
            });
        }
    }
    public async onConnectSystemPress(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();

        if (!this.connectSystemPopover) {
            this.connectSystemPopover = await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.common.ConnectSystems',
                controller: this
            }) as Dialog;
            this.connectSystemPopover.addStyleClass('sapUiSizeCompact');
            this.connectSystemPopover.setModel(component.getModel('i18n'), 'i18n');
            this.connectSystemPopover.setModel(this.connectSystemModel, 'model');
            this.connectSystemPopover.open();
            this.resetConnectSystemModel()
        } else {
            this.connectSystemPopover.open();
            this.resetConnectSystemModel()
        }
    }
    private async handleCreateKeyRoute(): Promise<void> {
        const view = this.getView();
        const component = this.getOwnerComponent();

        if (!this.keyCreatePopover) {
            this.keyCreatePopover = await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.common.KeyCreationWizard',
                controller: this
            }) as Dialog;
            this.keyCreatePopover.addStyleClass('sapUiSizeCompact');
            this.keyCreatePopover.setModel(component.getModel('i18n'), 'i18n');
            this.keyCreatePopover.setModel(this.keyCreationModel, 'model');
            this.keyCreatePopover.open();
            this.resetKeyCreationModel()
            this.keyCreationWizard = this.byId('keyCreationWizard') as Wizard;
            this.keyCreationNavContainer = this.byId('keyCreationNavContainer') as NavContainer;
            this.keyCreationReviewPage = this.byId('keyCreationReviewPage') as Page;
            this.keyCreationWizardPage = this.byId('keyCreationWizardPage') as Page;
            this.keyCreationNavContainer?.to(this.keyCreationWizardPage);
        } else {
            this.keyCreatePopover.open();
            this.resetKeyCreationModel()
            this.keyCreationNavContainer = this.byId('keyCreationNavContainer') as NavContainer;
            this.keyCreationReviewPage = this.byId('keyCreationReviewPage') as Page;
            this.keyCreationWizardPage = this.byId('keyCreationWizardPage') as Page;
            this.keyCreationNavContainer?.to(this.keyCreationWizardPage);
        }
    }
    public onConnectSystemsCancelPress(): void {
        this.connectSystemPopover?.close();
        this.connectSystemPopover?.destroy();
        this.connectSystemPopover = undefined;
        this.resetConnectSystemModel();
    }
    public async onConnectSystemsConfirmPress(event: SelectDialog$ConfirmEvent): Promise<void> {
        const systems = event.getParameter("selectedContexts") as Context[];
        const selectedSystemIds = systems.map(system => (system.getObject() as System).id);
        if (selectedSystemIds.length === 0) {
            MessageToast.show(this.getText('noChangesWereMade'));
            return;
        }
        const patchPromises: Promise<void>[] = [];
        selectedSystemIds.forEach((systemId) => {
            patchPromises.push(this.api.patch(`systems/${systemId}/link`, { keyConfigurationID: this.keyConfigId }));
        })
        this.getView().setBusy(true);
        try {
            await Promise.all(patchPromises);
            MessageToast.show(this.getText('systemsConnectedSuccessfully'));
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorConnectingSystems'));
        } finally {
            this.getView().setBusy(false);
            const binding = event.getSource().getBinding('items') as ListBinding;
            binding.filter([]);
            this.connectSystemPopover?.close();
            this.connectSystemPopover?.destroy();
            this.connectSystemPopover = undefined;
            this.resetConnectSystemModel();
            await this.getKeyConfigData();
        }
    }
    public onSearchConnectSystems(event: SelectDialog$LiveChangeEvent): void {
        const value = event.getParameter('value');
        const filter = new Filter('name', FilterOperator.Contains, value);
        const binding = event.getParameter('itemsBinding') as ListBinding;
        binding.filter([filter]);
    }
    public onKeyCreationWizardCancelPress(): void {
        MessageBox.warning(this.getText('confirmCancelKeyCreation'), {
            styleClass: 'sapUiSizeCompact',
            emphasizedAction: MessageBox.Action.NO,
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    this.keyCreatePopover?.close();
                    this.keyCreatePopover?.destroy();
                    this.keyCreatePopover = undefined;
                    this.resetKeyCreationModel();
                }
            }
        });
    }
    public async onKeyCreationWizardSubmitPress(): Promise<void> {
        const payload = {
            name: this.keyCreationModel.getProperty('/name') as string,
            description: this.keyCreationModel.getProperty('/description') as string,
            algorithm: this.keyCreationModel.getProperty('/algorithm') as string,
            region: this.keyCreationModel.getProperty('/region') as string,
            provider: this.keyCreationModel.getProperty('/provider') as string,
            enabled: this.keyCreationModel.getProperty('/enabled') as boolean
        }
        try {
            await this.api.post('keys', payload);
            MessageToast.show(this.getText('keyCreatedSuccessfully'));
            this.keyCreatePopover?.close();
            this.keyCreatePopover?.destroy();
            this.keyCreatePopover = undefined;
            this.resetKeyCreationModel();
            this.getKeyConfigData().catch((error) => {
                console.error(error);
            });
        } catch (error) {
            MessageBox.error(this.getText('errorCreatingKey'));
            console.error('Error creating key', error);
        } finally {
            this.getView().setBusy(false);
        }
    }
    public onKeyCreateNameChanged(): void {
        const keyName = this.keyCreationModel.getProperty('/name') as string;
        if (!keyName || keyName.length < 2) {
            this.keyCreationModel.setProperty('/keyNameValueState', 'Error');
            this.keyCreationModel.setProperty('/keyNameValueStateText', this.getText('keyNameRequired'));
            this.keyCreationModel.setProperty('/detailsStepValid', false);
        } else {
            this.keyCreationModel.setProperty('/keyNameValueState', 'None');
            this.keyCreationModel.setProperty('/keyNameValueStateText', '');
            this.keyCreationModel.setProperty('/detailsStepValid', true);
        }
    }
    public onKeyCreateRegionChanged(): void {
        const region = this.keyCreationModel.getProperty('/region') as string;
        if (region === '') {
            this.keyCreationModel.setProperty('/keyRegionStepValid', false);
        } else {
            const regionList = this.keyCreationModel.getProperty('/regionList') as { key: string, text: string, provider: string }[];
            const selectedRegion = regionList.find(item => item.key === region);
            this.keyCreationModel.setProperty('/provider', selectedRegion?.provider);
            this.keyCreationModel.setProperty('/keyRegionStepValid', true);
        }
    }
    public onKeyCreationWizardComplete(): void {
        const detailsStepValid = this.keyCreationModel.getProperty('/detailsStepValid') as boolean;
        const keyTypeStepValid = this.keyCreationModel.getProperty('/keyTypeStepValid') as boolean;
        const keyRegionStepValid = this.keyCreationModel.getProperty('/keyRegionStepValid') as boolean;

        if (detailsStepValid && keyTypeStepValid && keyRegionStepValid) {
            this.keyCreationModel.setProperty('/createKeyEnabled', true);
            this.keyCreationNavContainer?.to(this.keyCreationReviewPage);
        } else {
            this.keyCreationModel.setProperty('/createKeyEnabled', false);
        }
    }
    public onNavBackToStepPress(stepNumber: number): void {
        const fnAfterNavigate = function (this: KeyConfigDetail) {
            this.keyCreationWizard.goToStep(this.keyCreationWizard.getSteps()[stepNumber], true);
            this.keyCreationNavContainer.detachAfterNavigate(fnAfterNavigate);
        }.bind(this);

        this.keyCreationNavContainer.attachAfterNavigate(fnAfterNavigate);
        this.keyCreationNavContainer.backToPage(this.keyCreationWizardPage.getId());
    }
    private async getKeyConfigData(): Promise<void> {
        try {
            const keyConfig = await this.api.get<KeyConfig>(`keyConfigurations/${this.keyConfigId}`);
            if (!keyConfig) {
                return;
            }
            this.oneWayModel.setProperty('/keyConfig', keyConfig);
            this.twoWayModel.setProperty('/keyConfig', keyConfig);
            const keys = await this.getKeys();
            const systems = await this.getSystems();
            this.oneWayModel.setProperty('/keys', keys?.value);
            this.oneWayModel.setProperty('/systems', systems?.value);
            this.oneWayModel.setProperty('/keysCount', keys?.count);
            this.oneWayModel.setProperty('/systemsCount', systems?.count);
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingKeyConfigDetails'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    private async getKeys() {
        try {
            const keys = await this.api.get<KeyResponse>(`keys`, { keyConfigurationID: this.keyConfigId });
            return keys;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingKeyDetails'));
        }
    }
    private async getSystems() {
        try {
            const systems = await this.api.get<SystemsResponse>(`systems`);
            return systems;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingSystems'));
        }
    }
    private async patchKeyConfigData(keyConfig: KeyConfigPatchPayload) {
        try {
            const keyConfigs = await this.api.patch<KeyConfigPatchPayload, KeyConfig>('keyConfigurations', keyConfig);
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
    public async onSaveKeyConfigPress(): Promise<void> {
        this.getView().setBusy(true);
        const keyConfig = this.twoWayModel.getProperty('/keyConfig') as KeyConfig;
        const payload = {
            id: keyConfig.id,
            name: keyConfig.name
        } as KeyConfigPatchPayload;

        try {
            await this.patchKeyConfigData(payload);
            await this.getKeyConfigData();
            this.onCancelEditPress();
        } catch (error) {
            console.error('Error patching key config', error);
            MessageBox.error(this.getText('errorPatchingKeyConfigDetails'));
        } finally {
            this.getView().setBusy(false);
        }
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
            this.filterPopover = await Fragment.load({
                id: view.getId(),
                name: 'kms.resources.fragments.common.TableSorter',
                controller: this
            }) as ViewSettingsDialog;
            this.filterPopover.addStyleClass('sapUiSizeCompact');
            this.filterPopover.setModel(component.getModel('i18n'), 'i18n');
            this.filterPopover.setModel(this.viewSettingModel, 'viewSettingModel');
            this.filterPopover.open();
        } else {
            this.filterPopover.open();
        }
    }
    public onKeyTableRowPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        const keyId: string = selectedKey.id;
        this.getRouter().navTo('keyConfigKeyDetail', {
            keyConfigId: this.keyConfigId,
            keyId: keyId
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async onKeyTableMakePrimaryPress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        MessageBox.confirm(this.getText('confirmMakePrimaryConfirmation'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.makeKeyPrimary(selectedKey.id);
                }
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async onKeyTableDeletePress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        MessageBox.confirm(this.getText('confirmKeyDeletion'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.deleteKey(selectedKey.id);
                }
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async onKeyTableDisablePress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        MessageBox.confirm(this.getText('confirmKeyDisable'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.disableKey(selectedKey.id);
                }
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async onKeyTableEnablePress(event: Button$PressEvent): Promise<void> {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedKey = this.oneWayModel.getProperty(path) as Key;
        MessageBox.confirm(this.getText('confirmKeyEnable'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.enableKey(selectedKey.id);
                }
            }
        });
    }
    private async disableKey(keyId: string): Promise<void> {
        this.getView().setBusy(true);
        const payload = {
            enabled: false
        } as KeyPatchPayload;
        try {
            await this.api.patch<KeyPatchPayload, Key>(`keys/${keyId}`, payload);
            MessageToast.show(this.getText('keyDisabledSuccessfully'));
            await this.getKeyConfigData();
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorDisablingKey'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    private async enableKey(keyId: string): Promise<void> {
        this.getView().setBusy(true);
        try {
            await this.api.delete(`keys/${keyId}`);
            MessageToast.show(this.getText('keyEnabledSuccessfully'));
            await this.getKeyConfigData();
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorEnablingKey'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    private async deleteKey(keyId: string): Promise<void> {
        this.getView().setBusy(true);
        try {
            await this.api.delete(`keys/${keyId}`);
            MessageToast.show(this.getText('keyDeletedSuccessfully'));
            this.getRouter().navTo('keyConfigDetail', {
                keyConfigId: this.keyConfigId
            });
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorDeletingKey'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    private async makeKeyPrimary(keyId: string): Promise<void> {
        this.getView().setBusy(true);
        const payload = {
            keyID: keyId
        }
        try {
            await this.api.put(`keyConfigurations/${this.keyConfigId}/primaryKey`, payload);
            MessageToast.show(this.getText('keyMadePrimarySuccessfully'));
            await this.getKeyConfigData();
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorMakingKeyPrimary'));
        } finally {
            this.getView().setBusy(false);
        }
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async deleteKeyConfig(): Promise<void> {
        MessageBox.confirm(this.getText('confirmKeyConfigDelete'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    this.getView().setBusy(true);
                    try {
                        await this.api.delete(`keyConfigurations/${this.keyConfigId}`);
                        MessageToast.show(this.getText('keyConfigDeletedSuccessfully'));
                        this.getRouter().navTo('keyConfigs');
                    } catch (error) {
                        console.error(error);
                        MessageBox.error(this.getText('errorDeletingKeyConfig'));
                    } finally {
                        this.getView().setBusy(false);
                    }
                }
            }
        });

    }
    private resetKeyCreationModel() {
        this.keyCreationModel.setData({
            name: '' as string,
            description: '' as string,
            algorithm: 'AES256' as string,
            region: '' as string,
            regionList: [
                { key: '', text: 'Select Region', provider: this.Enums.CloudProviders.AWS },
                { key: 'us-east-1', text: 'US East (N. Virginia)', provider: this.Enums.CloudProviders.AWS },
                { key: 'us-east-2', text: 'US East (Ohio)', provider: this.Enums.CloudProviders.AWS },
                { key: 'us-west-1', text: 'US West (N. California)', provider: this.Enums.CloudProviders.AWS },
                { key: 'us-west-2', text: 'US West (Oregon)', provider: this.Enums.CloudProviders.AWS }
            ] as object[],
            provider: '' as string,
            enabled: true as boolean,
            detailsStepValid: false as boolean,
            keyTypeStepValid: true as boolean,
            keyRegionStepValid: false as boolean,
            keyNameValueState: 'None' as string,
            keyNameValueStateText: '' as string,
            createKeyEnabled: false as boolean
        }, true);
    }
    private resetConnectSystemModel() {
        this.connectSystemModel.setData({
            systemsList: this.oneWayModel.getProperty('/systems') as System[]
        }, true);
    }
    public async onCopyToClipboardPress(event: Button$PressEvent): Promise<void> {
        await copyToClipboard(event);
    }
}