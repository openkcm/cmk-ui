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
import MultiInput, { MultiInput$TokenUpdateEvent } from 'sap/m/MultiInput';
import Token from 'sap/m/Token';
import { EventChannelIds, EventIDs } from 'kms/common/Enums';
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
interface TagsResponse {
    value: string[] | undefined;
    count: number | undefined;
}
interface KeyPatchPayload {
    name: string;
    description: string;
    enabled: boolean;
}
interface KeyConfigsResponse {
    value: KeyConfig[];
    count: number;
}
export default class KeyConfigDetail extends BaseController {
    private api: Api;
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
    private HYOKKeyCreationNavContainer: NavContainer | undefined;
    private keyCreationWizard: Wizard | undefined;
    private HYOKKeyCreationWizard: Wizard | undefined;
    private keyCreationWizardPage: Page | undefined;
    private HYOKKeyCreationWizardPage: Page | undefined;
    private keyCreationReviewPage: Page | undefined;
    private HYOKKeyCreationReviewPage: Page | undefined;
    private readonly switchKeyConfigModel = new JSONModel({});
    private switchKeyConfigDialog: Dialog | undefined;
    private eventBus = EventBus.getInstance();

    public onInit(): void {
        super.onInit();
        this.eventBus.subscribe(EventChannelIds.KEYCONFIG, EventIDs.LOAD_KEY_CONFIG_DETAILS, (channelId, eventId, data) => this.onDetailPanelRouteEventTriggered(channelId, eventId, data as { keyConfigId: string, tenantId: string }), this);
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
    public onDetailPanelRouteEventTriggered(channelId: string, eventId: string, data: { keyConfigId: string, tenantId: string }): void {
        this.oneWayModel.setProperty('/keyConfigDetail', true);
        if (channelId === 'keyConfig' && eventId === 'loadKeyConfigDetails') {
            this.keyConfigId = data.keyConfigId;
            if (!this.api || this.tenantId !== data.tenantId) {
                this.tenantId = data.tenantId;
                this.api = new Api(this.tenantId);
            }
            this.getKeyConfigData().catch((error) => {
                console.error(error);
            });
        }
    }
    public onRouteMatched(event: Route$PatternMatchedEvent): void {
        this.getView().setBusy(true);

        const routeName = event.getParameter('name');
        this.oneWayModel.setProperty('/keyConfigDetail', routeName === 'keyConfigDetail');
        const routeArgs = event.getParameter('arguments') as { tenantId: string, keyConfigId?: string, '?query': { createKey?: string } };
        const queryParams = routeArgs['?query'] as { createKey?: string, keyType?: string };
        this.keyConfigId = routeArgs.keyConfigId;

        this.api = new Api(routeArgs?.tenantId);
        this.tenantId = routeArgs?.tenantId;

        if (!isUUIDValid(this.keyConfigId)) {
            console.error('Key config id invalid');
            this.getRouter().navTo('keyConfigs', {
                tenantId: this.tenantId
            });
            return;
        }
        this.getKeyConfigData().catch((error) => {
            console.error(error);
        });

        if (queryParams?.createKey === 'true') {
            const type = queryParams?.keyType || this.Enums.KeyCreationTypes.SYSTEM_MANAGED;
            this.getView().setBusy(true);
            this.handleCreateKeyRoute(type).catch((error) => {
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
    private async handleCreateKeyRoute(type: string): Promise<void> {
        const view = this.getView();
        view.setBusy(true);
        const component = this.getOwnerComponent();
        const wizardView = type === this.Enums.KeyCreationTypes.SYSTEM_MANAGED as string ? 'kms.resources.fragments.common.KeyCreationWizard' : 'kms.resources.fragments.common.HYOKKeyCreationWizard';

        if (!this.keyCreatePopover) {
            this.keyCreatePopover = await Fragment.load({
                id: view.getId(),
                name: wizardView,
                controller: this
            }) as Dialog;
            this.keyCreatePopover.addStyleClass('sapUiSizeCompact');
            this.keyCreatePopover.setModel(component.getModel('i18n'), 'i18n');
            this.keyCreatePopover.setModel(this.keyCreationModel, 'model');
            this.keyCreatePopover.open();
            view.setBusy(false);
            this.resetKeyCreationModel(type)
            this.keyCreationWizard = this.byId('keyCreationWizard') as Wizard;
            this.HYOKKeyCreationWizard = this.byId('HYOKKeyCreationWizard') as Wizard;
            this.keyCreationNavContainer = this.byId('keyCreationNavContainer') as NavContainer;
            this.HYOKKeyCreationNavContainer = this.byId('HYOKKeyCreationNavContainer') as NavContainer;
            this.keyCreationReviewPage = this.byId('keyCreationReviewPage') as Page;
            this.HYOKKeyCreationReviewPage = this.byId('HYOKKeyCreationReviewPage') as Page;
            this.keyCreationWizardPage = this.byId('keyCreationWizardPage') as Page;
            this.HYOKKeyCreationWizardPage = this.byId('HYOKKeyCreationWizardPage') as Page;
            this.keyCreationNavContainer?.to(this.keyCreationWizardPage);
            this.HYOKKeyCreationNavContainer?.to(this.HYOKKeyCreationWizardPage);
        } else {
            this.keyCreatePopover.open();
            view.setBusy(false);
            this.resetKeyCreationModel(type)
            this.keyCreationNavContainer = this.byId('keyCreationNavContainer') as NavContainer;
            this.HYOKKeyCreationNavContainer = this.byId('HYOKKeyCreationNavContainer') as NavContainer;
            this.keyCreationReviewPage = this.byId('keyCreationReviewPage') as Page;
            this.HYOKKeyCreationReviewPage = this.byId('HYOKKeyCreationReviewPage') as Page;
            this.keyCreationWizardPage = this.byId('keyCreationWizardPage') as Page;
            this.HYOKKeyCreationWizardPage = this.byId('HYOKKeyCreationWizardPage') as Page;
            this.keyCreationNavContainer?.to(this.keyCreationWizardPage);
            this.HYOKKeyCreationNavContainer?.to(this.HYOKKeyCreationWizardPage);
        }
    }
    public onConnectSystemsCancelPress(): void {
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
            await this.getKeyConfigData();
            this.getView().setBusy(false);
            this.onConnectSystemsCancelPress();
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
        let payload = {};
        if (this.keyCreationModel.getProperty('/keyType') === this.Enums.KeyCreationTypes.SYSTEM_MANAGED) {
            payload = {
                name: this.keyCreationModel.getProperty('/name') as string,
                keyConfigurationID: this.keyConfigId,
                type: this.keyCreationModel.getProperty('/keyType') as string,
                description: this.keyCreationModel.getProperty('/description') as string,
                algorithm: this.keyCreationModel.getProperty('/algorithm') as string,
                region: this.keyCreationModel.getProperty('/region') as string,
                provider: this.keyCreationModel.getProperty('/provider') as string,
                enabled: this.keyCreationModel.getProperty('/enabled') as boolean
            }
        } else {
            payload = {
                name: this.keyCreationModel.getProperty('/name') as string,
                keyConfigurationID: this.keyConfigId,
                type: this.keyCreationModel.getProperty('/keyType') as string,
                description: this.keyCreationModel.getProperty('/description') as string,
                enabled: this.keyCreationModel.getProperty('/enabled') as boolean,
                nativeId: this.keyCreationModel.getProperty('/keyARN') as string
            }
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
    public onKeyCreateARNChanged(): void {
        const keyARN = this.keyCreationModel.getProperty('/keyARN') as string;
        if (!keyARN || keyARN.length < 15) {
            this.keyCreationModel.setProperty('/keyARNValueState', 'Error');
            this.keyCreationModel.setProperty('/keyARNValueStateText', this.getText('keyARNRequired'));
            this.keyCreationModel.setProperty('/keySourceStepValid', false);
        } else {
            this.keyCreationModel.setProperty('/keyARNValueState', 'None');
            this.keyCreationModel.setProperty('/keyARNValueStateText', '');
            this.keyCreationModel.setProperty('/keySourceStepValid', true);
        }
    }
    public onKeyCreationWizardComplete(): void {
        const detailsStepValid = this.keyCreationModel.getProperty('/detailsStepValid') as boolean;
        const keyRegionStepValid = this.keyCreationModel.getProperty('/keyRegionStepValid') as boolean;

        if (detailsStepValid && keyRegionStepValid) {
            this.keyCreationModel.setProperty('/createKeyEnabled', true);
            this.keyCreationNavContainer?.to(this.keyCreationReviewPage);
        } else {
            this.keyCreationModel.setProperty('/createKeyEnabled', false);
        }
    }
    public onHYOKKeyCreationWizardComplete(): void {
        const detailsStepValid = this.keyCreationModel.getProperty('/detailsStepValid') as boolean;
        const keySourceStepValid = this.keyCreationModel.getProperty('/keySourceStepValid') as boolean;
        if (detailsStepValid && keySourceStepValid) {
            this.keyCreationModel.setProperty('/createKeyEnabled', true);
            this.HYOKKeyCreationNavContainer?.to(this.HYOKKeyCreationReviewPage);
        } else {
            this.keyCreationModel.setProperty('/createKeyEnabled', false);
        }
    }
    public onNavBackToStepPress(stepNumber: number): void {
        const fnAfterNavigate = function (this: KeyConfigDetail) {
            this.keyCreationWizard?.goToStep(this.keyCreationWizard?.getSteps()[stepNumber], true);
            this.keyCreationNavContainer?.detachAfterNavigate(fnAfterNavigate);

            this.HYOKKeyCreationWizard?.goToStep(this.HYOKKeyCreationWizard?.getSteps()[stepNumber], true);
            this.HYOKKeyCreationNavContainer?.detachAfterNavigate(fnAfterNavigate);
        }.bind(this);
        this.keyCreationNavContainer?.attachAfterNavigate(fnAfterNavigate);
        this.keyCreationNavContainer?.backToPage(this.keyCreationWizardPage.getId());

        this.HYOKKeyCreationNavContainer?.attachAfterNavigate(fnAfterNavigate);
        this.HYOKKeyCreationNavContainer?.backToPage(this.HYOKKeyCreationWizardPage.getId());
    }
    private async getKeyConfigData(): Promise<void> {
        this.getView().setBusy(true);
        try {
            const keyConfig = await this.api.get<KeyConfig>(`keyConfigurations/${this.keyConfigId}`);
            if (!keyConfig) {
                return;
            }
            this.oneWayModel.setProperty('/keyConfig', keyConfig);
            this.twoWayModel.setProperty('/keyConfig', keyConfig);
            const keys = await this.getKeys();
            const allSystems = await this.getAllSystems();
            const connectedSystems = await this.getConnectedSystems();
            const tags = await this.getTags();
            this.oneWayModel.setProperty('/keys', keys?.value);
            this.oneWayModel.setProperty('/allSystems', allSystems?.value);
            this.oneWayModel.setProperty('/systems', connectedSystems?.value);
            this.oneWayModel.setProperty('/tags', tags?.value);
            this.oneWayModel.setProperty('/keysCount', keys?.count);
            this.oneWayModel.setProperty('/systemsCount', connectedSystems?.count);
            this.oneWayModel.setProperty('/allSystemsCount', allSystems?.count);
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
    private async getConnectedSystems() {
        try {
            const systems = await this.api.get<KeyResponse>(`systems`, { keyConfigurationID: this.keyConfigId });
            return systems;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingSystems'));
        }
    }
    private async getAllSystems() {
        try {
            const systems = await this.api.get<SystemsResponse>(`systems`);
            return systems;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingSystems'));
        }
    }
    private async getTags() {
        try {
            const tags = await this.api.get<TagsResponse>(`keyConfigurations/${this.keyConfigId}/tags`);
            this.oneWayModel.setProperty('/tags', tags?.value);
            const fnValidator = function (args: { text: string }): Token {
                const text = args.text;
                return new Token({ key: text, text: text });
            };
            const tagsInput = this.byId('tagsMultiInput') as MultiInput;
            tagsInput.addValidator(fnValidator);
            return tags;
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorFetchingTags'));
        }
    }
    public async onTagsUpdate(event: MultiInput$TokenUpdateEvent): Promise<void> {
        const tags = this.oneWayModel.getProperty('/tags') as [];

        const removedTokens = event.getParameter('removedTokens');
        const addedTokens = event.getParameter('addedTokens');
        const removedTags = removedTokens?.map(token => token.getKey()) as [];
        const addedTags = addedTokens?.map(token => token.getKey()) as [];
        const updatedTags = tags?.filter(tag => !removedTags.includes(tag)) || [] as [];
        updatedTags?.push(...addedTags);
        this.oneWayModel.setProperty('/tags', updatedTags || tags);

        const payload = {
            tags: updatedTags
        }
        try {
            await this.api.put(`keyConfigurations/${this.keyConfigId}/tags`, payload);
            MessageToast.show(this.getText('tagsUpdatedSuccessfully'));
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorUpdatingTags'));
            const tags = await this.getTags();
            this.oneWayModel.setProperty('/tags', tags?.value || []);
        }
    }
    private async patchKeyConfigData(keyConfig: KeyConfigPatchPayload) {
        try {
            const keyConfigs = await this.api.patch<KeyConfigPatchPayload, KeyConfig>(`keyConfigurations/${this.keyConfigId}`, keyConfig);
            MessageToast.show(this.getText('keyConfigSaved'));
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
        this.getRouter().navTo('keyConfigDetailPanel', {
            tenantId: this.tenantId,
            keyConfigId: this.keyConfigId,
            id: keyId,
            type: this.Enums.KeyConfigDetailPanelTypes.KEY
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
    public onSystemsTableDisconnectPress(event: Button$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        MessageBox.confirm(this.getText('confirmDisconnectSystem'), {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: async (action: unknown) => {
                if (action === MessageBox.Action.YES) {
                    await this.disconnectSystem(selectedSystem.id);
                }
            }
        });
    }
    public onSystemPress(event: ListItemBase$PressEvent): void {
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        const systemId = selectedSystem.id;
        this.getRouter().navTo('keyConfigDetailPanel', {
            tenantId: this.tenantId,
            keyConfigId: this.keyConfigId,
            id: systemId,
            type: this.Enums.KeyConfigDetailPanelTypes.SYSTEM
        });
    };
    private async disconnectSystem(systemsID: string): Promise<void> {
        this.getView().setBusy(true);
        try {
            await this.api.delete(`systems/${systemsID}/link`);
            MessageToast.show(this.getText('systemDisconnectedSuccessfully'));
            await this.getKeyConfigData();
        } catch (error) {
            console.error(error);
            MessageBox.error(this.getText('errorDisconnectingSystem'));
        } finally {
            this.getView().setBusy(false);
        }
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
        const payload = {
            enabled: true
        } as KeyPatchPayload;
        try {
            await this.api.patch<KeyPatchPayload, Key>(`keys/${keyId}`, payload);
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
                tenantId: this.tenantId,
                keyConfigId: this.keyConfigId
            });
            await this.getKeyConfigData();
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
                        this.getRouter().navTo('keyConfigs', {
                            tenantId: this.tenantId
                        });
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
    private resetKeyCreationModel(keyType: string = null) {
        this.keyCreationModel.setData({
            name: '' as string,
            keyType: keyType || this.Enums.KeyCreationTypes.SYSTEM_MANAGED,
            keySource: 'keyID' as string,
            keyARN: '' as string,
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
            keySourceStepValid: false as boolean,
            keyRegionStepValid: false as boolean,
            keyNameValueState: 'None' as string,
            keyNameValueStateText: '' as string,
            keyARNValueState: 'None' as string,
            keyARNValueStateText: '' as string,
            createKeyEnabled: false as boolean,
            tags: [] as string[]
        }, true);
    }
    private resetConnectSystemModel() {
        const allSystems = this.oneWayModel.getProperty('/allSystems') as System[];
        const connectedSystems = this.oneWayModel.getProperty('/systems') as System[];
        const filteredSystems = allSystems?.filter(system =>
            !connectedSystems?.some(connectedSystem => connectedSystem.id === system.id)
        );

        this.connectSystemModel.setProperty('/systemsList', filteredSystems);
    }
    public async onSwitchKeyConfigPress(event: Button$PressEvent): Promise<void> {
        this.getView().setBusy(true);
        const path = event.getSource().getBindingContext('oneWay').getPath();
        const selectedSystem = this.oneWayModel.getProperty(path) as System;
        const component = this.getOwnerComponent();
        const keyConfigs = await this.api.get<KeyConfigsResponse>('keyConfigurations', {});
        const filteredKeyConfigs = keyConfigs.value.filter(keyConfig => keyConfig.id !== this.keyConfigId);
        const connectedKeyConfig = this.oneWayModel.getProperty('/keyConfig') as KeyConfig;

        if (!this.switchKeyConfigDialog) {
            this.switchKeyConfigDialog = await Fragment.load({
                name: 'kms.resources.fragments.systems.SwitchSystemKeyConfig',
                controller: this
            }) as Dialog;
            this.switchKeyConfigDialog.addStyleClass('sapUiSizeCompact');
            this.switchKeyConfigDialog.setModel(component.getModel('i18n'), 'i18n');
            this.switchKeyConfigModel.setData(selectedSystem);
            this.switchKeyConfigDialog.setModel(this.switchKeyConfigModel, 'switchKeyConfigModel');
            this.switchKeyConfigModel.setProperty('/KeyConfigList', filteredKeyConfigs);
            this.switchKeyConfigModel.setProperty('/connectedKeyConfig', connectedKeyConfig);
            this.switchKeyConfigDialog.open();
            this.getView().setBusy(false);
        } else {
            this.switchKeyConfigDialog.open();
            this.getView().setBusy(false);
        }
    }
    public onSwitchKeyConfigCancelPress(): void {
        this.switchKeyConfigDialog?.close();
        this.switchKeyConfigDialog?.destroy();
        this.switchKeyConfigDialog = undefined;
    }
    public async onSwitchKeyConfigSubmitPress(): Promise<void> {
        const systemId: string = this.switchKeyConfigModel.getProperty('/id') as string;
        const keyConfigId: string = this.switchKeyConfigModel.getProperty('/selectedKeyConfig') as string;
        try {
            await this.api.patch(`systems/${systemId}/link`, { keyConfigurationID: keyConfigId })
            MessageToast.show(this.getText('keyConfigConnectSystemSuccessfully'));
            this.onSwitchKeyConfigCancelPress();
        } catch (error) {
            MessageBox.error(this.getText('keyConfigConnectSystemError'));
            console.error('Error creating key', error);
        } finally {
            await this.getKeyConfigData();
            this.getView().setBusy(false);
        }
    }
    public async onCopyToClipboardPress(event: Button$PressEvent): Promise<void> {
        await copyToClipboard(event);
    }
}